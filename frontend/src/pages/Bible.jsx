import React from "react";
import { useLang } from "@/contexts/LangContext";
import api from "@/lib/api";
import FavoriteButton from "@/components/FavoriteButton";
import { MagnifyingGlass, ArrowUp, X, CaretLeft, CaretRight } from "@phosphor-icons/react";

const PAGE_SIZE = 20;
const EN_DATA_URL = "/data/bible-en.json";

// Module-level caches so the 10 MB Bible is fetched + indexed only once.
let _enCache = null;
let _enInflight = null;
let _flatIndex = null;

async function loadEnglishBible() {
    if (_enCache) return _enCache;
    if (_enInflight) return _enInflight;
    _enInflight = fetch(EN_DATA_URL, { cache: "force-cache" })
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then((data) => { _enCache = data; _enInflight = null; return data; })
        .catch((e) => { _enInflight = null; throw e; });
    return _enInflight;
}

function getFlatIndex(data) {
    if (_flatIndex) return _flatIndex;
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
    _flatIndex = out;
    return out;
}

// Parse "John 3:16" / "John 3" / "1 Kings 17:5" — chapter number is required
// so this never matches arbitrary text the user is mid-typing.
function parseReference(query, books) {
    const q = query.trim();
    if (!q) return null;
    const m = q.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
    if (!m) return null;
    const bookName = m[1].trim().toLowerCase();
    const chap = parseInt(m[2], 10);
    const verse = m[3] ? parseInt(m[3], 10) : null;

    const found = books.find((b) => b.name.toLowerCase() === bookName)
        || books.find((b) => b.name.toLowerCase().startsWith(bookName))
        || books.find((b) => b.name.toLowerCase().includes(bookName));
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

// ----------------------------- English (local) -----------------------------

function BibleEnglish() {
    const { t } = useLang();
    const [data, setData] = React.useState(_enCache);
    const [loading, setLoading] = React.useState(!_enCache);
    const [error, setError] = React.useState("");
    const [bookIdx, setBookIdx] = React.useState(0);
    const [chapter, setChapter] = React.useState(1);
    const [query, setQuery] = React.useState("");
    const [visible, setVisible] = React.useState(PAGE_SIZE);
    const [showBackToTop, setShowBackToTop] = React.useState(false);
    const sentinelRef = React.useRef(null);

    React.useEffect(() => {
        let cancelled = false;
        if (_enCache) { setData(_enCache); return undefined; }
        setLoading(true);
        loadEnglishBible()
            .then((d) => { if (!cancelled) { setData(d); setError(""); } })
            .catch((e) => { if (!cancelled) setError(e.message || "Failed to load"); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const books = data?.books || [];
    const currentBook = books[bookIdx] || null;
    const totalChapters = currentBook?.chapters?.length || 1;

    // Text search runs continuously as the user types. The reference jump
    // only happens explicitly (Enter / clicking a result) so typing never
    // hijacks the input.
    const results = React.useMemo(() => {
        const q = query.trim();
        if (!q || !data) return [];
        const idx = getFlatIndex(data);
        const needle = q.toLowerCase();
        return idx.filter((v) => v.text.toLowerCase().includes(needle));
    }, [query, data]);

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
        const parsed = parseReference(query, books);
        if (parsed) jumpToReference(parsed.book, parsed.chapter, parsed.verse);
    };

    // Reset pagination when search results change
    React.useEffect(() => { setVisible(PAGE_SIZE); }, [query]);

    // Lazy-load more search results
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

    // Back-to-top toggle
    React.useEffect(() => {
        const onScroll = () => setShowBackToTop(window.scrollY > 400);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const scrollToTop = () => {
        setQuery("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const currentChapterVerses = React.useMemo(() => {
        if (!currentBook) return [];
        const ch = currentBook.chapters.find((c) => c.chapter === chapter);
        return ch?.verses || [];
    }, [currentBook, chapter]);

    const chapterContent = currentChapterVerses.map((v) => `${v.verse}. ${v.text}`).join("\n");
    const shown = results.slice(0, visible);
    const hasMore = visible < results.length;
    const searching = query.trim().length > 0;
    const refSuggestion = React.useMemo(
        () => parseReference(query, books),
        [query, books],
    );

    return (
        <div data-testid="bible-page">
            <p className="label-eyebrow mb-3">{t("nav.bible")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-2">
                {t("nav.bible")}
            </h1>
            <p className="text-sm text-stoneMuted italic mb-6" data-testid="bible-translation-label">
                {data?.translation || "Catholic Public Domain Version"}
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
                        <button type="button" onClick={() => setQuery("")} aria-label="Clear"
                            data-testid="bible-search-clear"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stoneMuted hover:text-sangre">
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
                            {/* Book + chapter selectors */}
                            <div className="flex flex-wrap items-center gap-3 mb-6" data-testid="bible-selectors">
                                <select
                                    value={bookIdx}
                                    onChange={(e) => { setBookIdx(parseInt(e.target.value, 10)); setChapter(1); }}
                                    data-testid="bible-book-select"
                                    className="px-3 py-2 bg-white border border-sand-300 rounded-md ui-sans text-sm focus:outline-none focus:border-sangre min-w-[180px]"
                                >
                                    {books.map((b, i) => (
                                        <option key={b.name} value={i}>{b.name}</option>
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
                                    title={`${currentBook?.name} ${chapter}`}
                                    content={chapterContent}
                                    metadata={{ book: currentBook?.name, chapter }}
                                    testId="fav-bible-chapter"
                                />
                            </div>

                            <h2 className="heading-serif text-3xl tracking-tight mb-6 border-b border-sand-300 pb-3"
                                data-testid="bible-chapter-title">
                                {currentBook?.name} {chapter}
                            </h2>

                            <div className="reading-prose" data-testid="bible-verses">
                                {currentChapterVerses.map((v) => (
                                    <p key={v.verse} data-bible-verse={v.verse} className="scroll-mt-36">
                                        <sup className="text-sangre text-xs mr-1 font-semibold">{v.verse}</sup>
                                        {v.text}
                                    </p>
                                ))}
                                {currentChapterVerses.length === 0 && (
                                    <p className="text-stoneMuted">No verses.</p>
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
                                    {t("bible.go_to")}: {refSuggestion.book.name} {refSuggestion.chapter}{refSuggestion.verse ? `:${refSuggestion.verse}` : ""}
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
                                                {v.book} {v.chapter}:{v.verse}
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

            {showBackToTop && (
                <button
                    type="button"
                    onClick={scrollToTop}
                    data-testid="bible-back-to-top"
                    aria-label={t("common.back_to_top")}
                    title={t("common.back_to_top")}
                    className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-30 h-12 w-12 rounded-full bg-sangre text-sand-50 shadow-lg hover:bg-sangre-hover transition-all flex items-center justify-center"
                >
                    <ArrowUp size={20} weight="bold" />
                </button>
            )}
        </div>
    );
}

// ----------------------------- Spanish (backend) -----------------------------

function BibleSpanish() {
    const { t } = useLang();
    const [books, setBooks] = React.useState([]);
    const [translation, setTranslation] = React.useState("");
    const [book, setBook] = React.useState(null);
    const [chapter, setChapter] = React.useState(1);
    const [verses, setVerses] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        setLoading(true);
        api.get("/bible/books?lang=es")
            .then((r) => {
                setBooks(r.data.books || []);
                setTranslation(r.data.translation || "");
                if (!book && r.data.books?.length) setBook(r.data.books[0]);
            })
            .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        if (!book) return;
        setLoading(true);
        api.get(`/bible/chapter?book=${book.bookid}&chapter=${chapter}&lang=es`)
            .then((r) => setVerses(r.data.verses || []))
            .finally(() => setLoading(false));
    }, [book, chapter]);

    const chapterContent = verses.map((v) => `${v.verse}. ${v.text}`).join("\n");
    const totalChapters = book?.chapters || 1;
    const translationLabel = translation === "BIA"
        ? "Biblia de la Iglesia en América · Vaticano"
        : translation;

    return (
        <div data-testid="bible-page">
            <p className="label-eyebrow mb-3">{t("nav.bible")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-2">
                {t("nav.bible")}
            </h1>
            {translationLabel && (
                <p className="text-sm text-stoneMuted italic mb-10" data-testid="bible-translation-label">
                    {translationLabel}
                </p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
                <aside className="surface-card p-4 max-h-[70vh] overflow-y-auto" data-testid="bible-books">
                    <p className="label-eyebrow mb-3 px-2">Libros</p>
                    {books.map((b) => (
                        <button key={b.bookid}
                            onClick={() => { setBook(b); setChapter(1); }}
                            data-testid={`bible-book-${b.bookid}`}
                            className={`block w-full text-left px-3 py-1.5 rounded-sm reading-serif text-sm transition-colors ${book?.bookid === b.bookid ? "bg-sangre text-sand-50" : "text-stoneMuted hover:bg-sand-200"}`}
                        >
                            {b.name}
                        </button>
                    ))}
                    {books.length === 0 && !loading && <p className="text-sm text-stoneFaint p-2">No books available.</p>}
                </aside>

                <div>
                    {book && (
                        <div className="flex items-center justify-between border-b border-sand-300 pb-3 mb-6">
                            <h2 className="heading-serif text-3xl tracking-tight">{book.name} {chapter}</h2>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setChapter((c) => Math.max(1, c - 1))} disabled={chapter <= 1}
                                    data-testid="bible-prev-chapter"
                                    className="p-2 border border-sand-300 rounded-md hover:border-sangre disabled:opacity-40">
                                    <CaretLeft size={14} weight="bold" />
                                </button>
                                <select value={chapter} onChange={(e) => setChapter(Number(e.target.value))}
                                    data-testid="bible-chapter-select"
                                    className="px-3 py-2 bg-white border border-sand-300 rounded-md ui-sans text-sm focus:outline-none focus:border-sangre">
                                    {Array.from({ length: totalChapters }, (_, i) => i + 1).map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                                <button onClick={() => setChapter((c) => Math.min(totalChapters, c + 1))} disabled={chapter >= totalChapters}
                                    data-testid="bible-next-chapter"
                                    className="p-2 border border-sand-300 rounded-md hover:border-sangre disabled:opacity-40">
                                    <CaretRight size={14} weight="bold" />
                                </button>
                                <FavoriteButton section="bible"
                                    title={`${book.name} ${chapter}`}
                                    content={chapterContent}
                                    metadata={{ book: book.name, chapter }}
                                    testId="fav-bible-chapter" />
                            </div>
                        </div>
                    )}
                    {loading && <p className="text-stoneMuted" data-testid="bible-loading">{t("common.loading")}</p>}
                    <div className="reading-prose" data-testid="bible-verses">
                        {verses.map((v) => (
                            <p key={v.verse}>
                                <sup className="text-sangre text-xs mr-1 font-semibold">{v.verse}</sup>
                                {v.text}
                            </p>
                        ))}
                        {!loading && verses.length === 0 && <p className="text-stoneMuted">Sin versículos.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Bible() {
    const { lang } = useLang();
    return lang === "en" ? <BibleEnglish /> : <BibleSpanish />;
}
