import React from "react";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import FavoriteButton from "@/components/FavoriteButton";
import BackToTopButton from "@/components/BackToTopButton";
import { useLongPress, ContextMenu } from "@/components/LongPressMenu";
import { idbGet, idbSet } from "@/lib/idb";
import {
    MagnifyingGlass, X, CaretLeft, CaretRight,
    Heart, HeartBreak, Copy, ShareNetwork,
} from "@phosphor-icons/react";

const PAGE_SIZE = 20;

// Bump when the bundled JSON files change so all users get the fresh
// normalized data on their next visit (invalidates stale IDB entries).
const BIBLE_DATA_VERSION = 1;
const IDB_KEY = (lang) => `bible:${lang}`;

// Per-language data files. Both ultimately get normalized to:
//   { translation: string, books: [{ name, chapters: [{ chapter, verses: [{ verse, text }] }] }] }
const SOURCES = {
    en: { url: "/data/bible-en.json", normalize: normalizeStandard },
    es: { url: "/data/bible-es.json", normalize: normalizeJerusalenES },
};

// CPDV / SpaRV-style: already in the canonical shape.
function normalizeStandard(raw) {
    return {
        translation: raw.translation || "",
        books: (raw.books || []).map((b) => ({
            name: (b.name || "").trim(),
            chapters: (b.chapters || []).map((ch) => ({
                chapter: typeof ch.chapter === "string" ? parseInt(ch.chapter, 10) : ch.chapter,
                verses: (ch.verses || []).map((v) => ({
                    verse: typeof v.verse === "string" ? parseInt(v.verse, 10) : v.verse,
                    text: (v.text || "").trim(),
                })),
            })),
        })),
    };
}

// "Biblia de Jerusalén" / bibliacatolica.com.br shape:
//   { "Génesis": { abreviacion, testamento, chapters: [{ chapter:"1", verses: { "1": "..." }}] }, ... }
function normalizeJerusalenES(raw) {
    const books = [];
    for (const [rawName, info] of Object.entries(raw)) {
        if (!info || typeof info !== "object" || !Array.isArray(info.chapters)) continue;
        const chapters = info.chapters.map((ch) => {
            const versesObj = ch.verses || {};
            const verses = Object.entries(versesObj)
                .map(([num, text]) => ({
                    verse: parseInt(num, 10),
                    text: (text || "").trim(),
                }))
                .filter((v) => Number.isFinite(v.verse))
                .sort((a, b) => a.verse - b.verse);
            return {
                chapter: typeof ch.chapter === "string" ? parseInt(ch.chapter, 10) : ch.chapter,
                verses,
            };
        });
        books.push({ name: rawName.trim(), chapters });
    }
    return { translation: "La Biblia de Jerusalén", books };
}

// Module-level caches keyed by lang. The 5–10 MB JSONs are fetched + indexed
// only once per session and survive route changes.
const _cache = {};      // lang → parsed data
const _inflight = {};   // lang → Promise
const _flatIndex = {};  // lang → flat verse index for search

export async function loadBible(lang) {
    if (_cache[lang]) return _cache[lang];
    if (_inflight[lang]) return _inflight[lang];
    const src = SOURCES[lang];
    if (!src) throw new Error(`No bible source for lang ${lang}`);

    // 1) Try IDB first — instant hydration with no JSON.parse + no normalize.
    //    If the stored version doesn't match BIBLE_DATA_VERSION we fall through
    //    to the network fetch and overwrite the entry.
    _inflight[lang] = (async () => {
        try {
            const cached = await idbGet(IDB_KEY(lang));
            if (cached && cached.version === BIBLE_DATA_VERSION && cached.payload) {
                _cache[lang] = cached.payload;
                return cached.payload;
            }
        } catch { /* fall through to fetch */ }

        // 2) Network fetch → normalize → memoize in-memory + IDB.
        const res = await fetch(src.url, { cache: "force-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        const data = src.normalize(raw);
        _cache[lang] = data;
        // Store asynchronously — don't block UI on the IDB write.
        idbSet(IDB_KEY(lang), BIBLE_DATA_VERSION, data).catch(() => {});
        return data;
    })().finally(() => { delete _inflight[lang]; });
    return _inflight[lang];
}

function getFlatIndex(lang, data) {
    if (_flatIndex[lang]) return _flatIndex[lang];
    const out = [];
    for (const b of data.books) {
        for (const ch of b.chapters) {
            for (const v of ch.verses) {
                out.push({
                    book: b.name,
                    chapter: ch.chapter,
                    verse: v.verse,
                    text: (v.text || "").trim(),
                });
            }
        }
    }
    _flatIndex[lang] = out;
    return out;
}

// Display-name resolver. Both files now ship localized names directly, so this
// is a passthrough — kept for symmetry and future overrides.
function displayName(rawName /* , lang */) {
    return rawName;
}

// Parse "John 3:16" / "Juan 3:16" / "1 Reyes 17:5" / "Genesis 50".
// Chapter number is required so this never matches arbitrary text the user is
// mid-typing.
function parseReference(query, books) {
    const q = query.trim();
    if (!q) return null;
    const m = q.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
    if (!m) return null;
    const target = m[1].trim().toLowerCase();
    const chap = parseInt(m[2], 10);
    const verse = m[3] ? parseInt(m[3], 10) : null;

    const found = books.find((b) => b.name.toLowerCase() === target)
        || books.find((b) => b.name.toLowerCase().startsWith(target))
        || books.find((b) => b.name.toLowerCase().includes(target));

    if (!found) return null;
    return { book: found, chapter: chap, verse };
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text, query) {
    const q = query.trim();
    if (!q) return text;
    const re = new RegExp(`(${escapeRegex(q)})`, "ig");
    const parts = text.split(re);
    return parts.map((p, i) =>
        re.test(p)
            ? <mark key={i} className="bg-sangre/15 text-stone900 rounded px-0.5">{p}</mark>
            : <React.Fragment key={i}>{p}</React.Fragment>,
    );
}

export default function Bible() {
    const { t, lang } = useLang();
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [data, setData] = React.useState(_cache[lang] || null);
    const [loading, setLoading] = React.useState(!_cache[lang]);
    const [error, setError] = React.useState("");
    const [bookIdx, setBookIdx] = React.useState(0);
    const [chapter, setChapter] = React.useState(1);
    const [query, setQuery] = React.useState("");
    const [visible, setVisible] = React.useState(PAGE_SIZE);
    // Long-press selection state — only one verse can be "active" at a time.
    const [activeKey, setActiveKey] = React.useState(null);
    // Map of bible-verse favorites: "book|chapter|verse" → favorite id.
    // Populated once on mount per language so every verse row can flag
    // itself as "already saved" with a subtle side bar.
    const [savedVerses, setSavedVerses] = React.useState(() => new Map());
    const sentinelRef = React.useRef(null);

    // Load (or swap) the JSON whenever the language changes.
    React.useEffect(() => {
        let cancelled = false;
        setQuery("");
        setBookIdx(0);
        setChapter(1);
        if (_cache[lang]) {
            setData(_cache[lang]);
            setLoading(false);
            setError("");
            return undefined;
        }
        setLoading(true);
        setError("");
        loadBible(lang)
            .then((d) => { if (!cancelled) setData(d); })
            .catch((e) => { if (!cancelled) setError(e.message || "Failed to load"); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [lang]);

    // One-shot fetch of the user's existing bible-verse favorites so each
    // row can light up its "saved" indicator right after data is loaded.
    React.useEffect(() => {
        if (!user) { setSavedVerses(new Map()); return; }
        let cancelled = false;
        (async () => {
            try {
                const r = await api.get("/favorites");
                if (cancelled) return;
                const map = new Map();
                for (const f of r.data || []) {
                    if (f.section !== "bible") continue;
                    const meta = f.metadata || {};
                    if (meta.kind !== "verse") continue;
                    if (meta.lang && meta.lang !== lang) continue;
                    const k = `${meta.book}|${meta.chapter}|${meta.verse}`;
                    map.set(k, f.id);
                }
                setSavedVerses(map);
            } catch { /* silent — UI just won't show indicators */ }
        })();
        return () => { cancelled = true; };
    }, [user, lang]);

    // Add / remove a verse favorite, updating the local map optimistically.
    const toggleVerseFavorite = React.useCallback(async (verseInfo) => {
        if (!user) { navigate("/login"); return; }
        const k = `${verseInfo.book}|${verseInfo.chapter}|${verseInfo.verse}`;
        const existingId = savedVerses.get(k);
        try {
            if (existingId) {
                await api.delete(`/favorites/${existingId}`);
                setSavedVerses((m) => { const n = new Map(m); n.delete(k); return n; });
                toast.success(t("common.remove"));
            } else {
                const payload = {
                    section: "bible",
                    title: `${verseInfo.bookDisplay} ${verseInfo.chapter}:${verseInfo.verse}`,
                    content: verseInfo.text,
                    metadata: {
                        kind: "verse",
                        book: verseInfo.book,
                        chapter: verseInfo.chapter,
                        verse: verseInfo.verse,
                        lang,
                    },
                    lang,
                };
                const r = await api.post("/favorites", payload);
                const newId = r.data?.id;
                if (newId) {
                    setSavedVerses((m) => { const n = new Map(m); n.set(k, newId); return n; });
                }
                toast.success(t("common.saved"));
            }
        } catch {
            toast.error(t("common.error"));
        }
    }, [user, savedVerses, lang, navigate, t]);

    const books = data?.books || [];
    const currentBook = books[bookIdx] || null;
    const totalChapters = currentBook?.chapters?.length || 1;

    // Continuous text search.
    const results = React.useMemo(() => {
        const q = query.trim();
        if (!q || !data) return [];
        const idx = getFlatIndex(lang, data);
        const needle = q.toLowerCase();
        return idx.filter((v) => v.text.toLowerCase().includes(needle));
    }, [query, data, lang]);

    const refSuggestion = React.useMemo(
        () => parseReference(query, books),
        [query, books],
    );

    const jumpToReference = React.useCallback((book, chap, verse) => {
        const idx = books.findIndex((b) => b.name === book.name);
        if (idx < 0) return;
        setBookIdx(idx);
        setChapter(Math.min(book.chapters.length, chap));
        setQuery("");
        requestAnimationFrame(() => {
            if (verse) {
                const el = document.querySelector(`[data-bible-verse="${verse}"]`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                else window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        });
    }, [books]);

    const onSearchSubmit = (e) => {
        e.preventDefault();
        if (refSuggestion) {
            jumpToReference(refSuggestion.book, refSuggestion.chapter, refSuggestion.verse);
        }
    };

    // Deep-link handler — ?ref=Book|Chapter|Verse (from Verse of the Day
    // card on the Dashboard). Runs once the Bible data is ready, then
    // strips the param from the URL so a user reload doesn't re-scroll.
    React.useEffect(() => {
        if (!data) return;
        const params = new URLSearchParams(location.search);
        const ref = params.get("ref");
        if (!ref) return;
        const parts = ref.split("|");
        if (parts.length < 2) return;
        const [bookName, chapStr, verseStr] = parts;
        const book = books.find((b) => b.name === bookName);
        if (!book) return;
        const chap = parseInt(chapStr, 10);
        const verse = verseStr ? parseInt(verseStr, 10) : null;
        if (!Number.isFinite(chap)) return;
        jumpToReference(book, chap, verse);
        // Strip the query so a refresh lands on the current chapter, not
        // an endless re-scroll loop.
        navigate(location.pathname, { replace: true });
    }, [data, books, location.search, location.pathname, jumpToReference, navigate]);

    React.useEffect(() => { setVisible(PAGE_SIZE); }, [query]);

    React.useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return undefined;
        const observer = new IntersectionObserver((obs) => {
            if (obs.some((e) => e.isIntersecting)) {
                setVisible((v) => Math.min(results.length, v + PAGE_SIZE));
            }
        }, { rootMargin: "200px" });
        observer.observe(node);
        return () => observer.disconnect();
    }, [results.length]);

    const onResetTop = () => setQuery("");

    const currentChapterVerses = React.useMemo(() => {
        if (!currentBook) return [];
        const ch = currentBook.chapters.find((c) => c.chapter === chapter);
        return ch?.verses || [];
    }, [currentBook, chapter]);

    const chapterContent = currentChapterVerses.map((v) => `${v.verse}. ${v.text}`).join("\n");
    const shown = results.slice(0, visible);
    const hasMore = visible < results.length;
    const searching = query.trim().length > 0;
    const currentBookDisplay = currentBook ? displayName(currentBook.name, lang) : "";

    return (
        <div data-testid="bible-page">
            <p className="label-eyebrow mb-3">{t("nav.bible")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-2">
                {t("nav.bible")}
            </h1>
            <p className="text-sm text-stoneMuted italic mb-6" data-testid="bible-translation-label">
                {data?.translation || ""}
            </p>

            {/* Sticky search bar */}
            <div
                className="sticky top-[56px] md:top-[72px] z-20 -mx-4 sm:-mx-6 lg:-mx-12 px-4 sm:px-6 lg:px-12 py-3 bg-sand-50/95 backdrop-blur-md border-b border-sand-300 mb-8"
                data-testid="bible-search-wrap"
            >
                <form onSubmit={onSearchSubmit} className="relative max-w-[720px] mx-auto" data-testid="bible-search-form">
                    <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stoneFaint" />
                    <input
                        type="search"
                        inputMode="search"
                        placeholder={t("bible.search_placeholder")}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        data-testid="bible-search-input"
                        className="w-full pl-10 pr-10 py-3 bg-white border border-sand-300 rounded-md focus:outline-none focus:border-sangre transition-colors ui-sans text-sm"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            aria-label="Clear"
                            data-testid="bible-search-clear"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stoneMuted hover:text-sangre"
                        >
                            <X size={16} weight="bold" />
                        </button>
                    )}
                </form>
            </div>

            {loading && <p className="text-stoneMuted" data-testid="bible-loading">{t("common.loading")}</p>}
            {error && <p className="text-sangre" data-testid="bible-error">{error}</p>}

            {!loading && !error && data && (
                <>
                    {!searching ? (
                        <>
                            <div className="flex flex-wrap items-center gap-3 mb-6" data-testid="bible-selectors">
                                <select
                                    value={bookIdx}
                                    onChange={(e) => { setBookIdx(parseInt(e.target.value, 10)); setChapter(1); }}
                                    data-testid="bible-book-select"
                                    className="px-3 py-2 bg-white border border-sand-300 rounded-md ui-sans text-sm focus:outline-none focus:border-sangre min-w-[180px]"
                                >
                                    {books.map((b, i) => (
                                        <option key={b.name} value={i}>{displayName(b.name, lang)}</option>
                                    ))}
                                </select>

                                <button
                                    onClick={() => setChapter((c) => Math.max(1, c - 1))}
                                    disabled={chapter <= 1}
                                    data-testid="bible-prev-chapter"
                                    className="p-2 border border-sand-300 rounded-md hover:border-sangre disabled:opacity-40"
                                >
                                    <CaretLeft size={14} weight="bold" />
                                </button>
                                <select
                                    value={chapter}
                                    onChange={(e) => setChapter(parseInt(e.target.value, 10))}
                                    data-testid="bible-chapter-select"
                                    className="px-3 py-2 bg-white border border-sand-300 rounded-md ui-sans text-sm focus:outline-none focus:border-sangre"
                                >
                                    {Array.from({ length: totalChapters }, (_, i) => i + 1).map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => setChapter((c) => Math.min(totalChapters, c + 1))}
                                    disabled={chapter >= totalChapters}
                                    data-testid="bible-next-chapter"
                                    className="p-2 border border-sand-300 rounded-md hover:border-sangre disabled:opacity-40"
                                >
                                    <CaretRight size={14} weight="bold" />
                                </button>

                                <FavoriteButton
                                    section="bible"
                                    title={`${currentBookDisplay} ${chapter}`}
                                    content={chapterContent}
                                    metadata={{ book: currentBook?.name, chapter, lang }}
                                    testId="fav-bible-chapter"
                                />
                            </div>

                            <h2 className="heading-serif text-3xl tracking-tight mb-6 border-b border-sand-300 pb-3"
                                data-testid="bible-chapter-title">
                                {currentBookDisplay} {chapter}
                            </h2>

                            <div className="reading-prose" data-testid="bible-verses" onClick={() => setActiveKey(null)}>
                                {currentChapterVerses.map((v) => {
                                    const k = currentBook ? `${currentBook.name}|${chapter}|${v.verse}` : "";
                                    return (
                                        <VerseRow
                                            key={v.verse}
                                            verse={v}
                                            book={currentBook?.name}
                                            bookDisplay={currentBookDisplay}
                                            chapter={chapter}
                                            isActive={activeKey === k}
                                            isSaved={savedVerses.has(k)}
                                            onActivate={() => setActiveKey(k)}
                                            onDismiss={() => setActiveKey(null)}
                                            onToggleFavorite={toggleVerseFavorite}
                                        />
                                    );
                                })}
                                {currentChapterVerses.length === 0 && (
                                    <p className="text-stoneMuted">{t("common.loading")}</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            {refSuggestion && (
                                <button
                                    type="button"
                                    onClick={() => jumpToReference(
                                        refSuggestion.book,
                                        refSuggestion.chapter,
                                        refSuggestion.verse,
                                    )}
                                    data-testid="bible-ref-suggestion"
                                    className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-sangre/10 border border-sangre/30 text-sangre rounded-md hover:bg-sangre hover:text-sand-50 transition-colors ui-sans text-sm"
                                >
                                    {t("bible.go_to")}: {displayName(refSuggestion.book.name, lang)} {refSuggestion.chapter}{refSuggestion.verse ? `:${refSuggestion.verse}` : ""}
                                </button>
                            )}

                            <p className="label-eyebrow mb-4" data-testid="bible-results-meta">
                                {t("bible.results_count", { count: results.length })}
                            </p>

                            {results.length === 0 && (
                                <p className="text-stoneMuted italic" data-testid="bible-empty">
                                    {t("bible.no_results")}
                                </p>
                            )}

                            <ul className="reading-prose space-y-6" data-testid="bible-results-list">
                                {shown.map((v) => (
                                    <li
                                        key={`${v.book}-${v.chapter}-${v.verse}`}
                                        data-testid={`bible-result-${v.book}-${v.chapter}-${v.verse}`}
                                        className="group"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const bookObj = books.find((b) => b.name === v.book);
                                                if (bookObj) jumpToReference(bookObj, v.chapter, v.verse);
                                            }}
                                            className="block w-full text-left"
                                        >
                                            <p className="label-eyebrow mb-1 group-hover:text-sangre transition-colors">
                                                {displayName(v.book, lang)} {v.chapter}:{v.verse}
                                            </p>
                                            <p className="m-0">{highlightText(v.text, query)}</p>
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            {hasMore && (
                                <div ref={sentinelRef} className="mt-10 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setVisible((v) => Math.min(results.length, v + PAGE_SIZE))}
                                        data-testid="bible-load-more"
                                        className="btn-ghost"
                                    >
                                        {t("catechism.load_more")} ({visible}/{results.length})
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            <BackToTopButton onClick={onResetTop} testId="bible-back-to-top" />
        </div>
    );
}

/* ================================================================== */
/* Long-press context menu for individual verses                       */
/* ================================================================== */

function VerseRow({
    verse, book, bookDisplay, chapter,
    isActive, isSaved,
    onActivate, onDismiss, onToggleFavorite,
}) {
    const handlers = useLongPress(() => onActivate());
    const k = `${book}|${chapter}|${verse.verse}`;

    return (
        <p
            key={verse.verse}
            data-bible-verse={verse.verse}
            data-testid={`bible-verse-${verse.verse}`}
            className={[
                "verse-row scroll-mt-36 relative rounded-md transition-colors duration-150",
                "px-3 py-2 -mx-3",
                isSaved ? "border-l-2 border-sangre/50 pl-4" : "",
                isActive ? "verse-active" : "",
            ].filter(Boolean).join(" ")}
            {...handlers}
        >
            <sup className="text-sangre text-xs mr-1 font-semibold">{verse.verse}</sup>
            {verse.text}
            {isSaved && !isActive && (
                <span className="sr-only" data-testid={`bible-verse-saved-${verse.verse}`}>
                    saved
                </span>
            )}
            {isActive && (
                <VersePopover
                    verseKey={k}
                    verseInfo={{
                        book, bookDisplay, chapter,
                        verse: verse.verse, text: verse.text,
                    }}
                    isSaved={isSaved}
                    onToggleFavorite={onToggleFavorite}
                    onDismiss={onDismiss}
                />
            )}
        </p>
    );
}

function VersePopover({ verseKey, verseInfo, isSaved, onToggleFavorite, onDismiss }) {
    const { t } = useLang();
    const formatted = `"${verseInfo.text}" — ${verseInfo.bookDisplay} ${verseInfo.chapter}:${verseInfo.verse}`;

    const doCopy = async () => {
        try {
            await navigator.clipboard.writeText(formatted);
            toast.success(t("bible.verse_copied"));
        } catch {
            toast.error(t("common.error"));
        }
    };
    const doShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: t("bible.share_title"), text: formatted });
                return;
            } catch { /* user cancelled — ignore */ }
        }
        await doCopy();
    };
    const doFavorite = () => {
        onToggleFavorite({
            book: verseInfo.book,
            bookDisplay: verseInfo.bookDisplay,
            chapter: verseInfo.chapter,
            verse: verseInfo.verse,
            text: verseInfo.text,
        });
    };

    const items = [
        {
            id: "fav",
            label: isSaved ? t("bible.remove_favorite") : t("common.save_favorite"),
            icon: isSaved
                ? <HeartBreak size={16} weight="duotone" />
                : <Heart size={16} weight="duotone" />,
            onSelect: doFavorite,
        },
        {
            id: "copy",
            label: t("bible.copy_verse"),
            icon: <Copy size={16} weight="duotone" />,
            onSelect: doCopy,
        },
        {
            id: "share",
            label: t("bible.share_verse"),
            icon: <ShareNetwork size={16} weight="duotone" />,
            onSelect: doShare,
        },
    ];

    return (
        <ContextMenu
            items={items}
            onDismiss={onDismiss}
            testId={`bible-verse-menu-${verseInfo.verse}`}
        />
    );
}

