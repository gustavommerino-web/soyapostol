import React from "react";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import BackToTopButton from "@/components/BackToTopButton";
import BibleQuickView from "@/components/BibleQuickView";
import { useLongPress, ContextMenu } from "@/components/LongPressMenu";
import { idbGet, idbSet } from "@/lib/idb";
import { findCitations } from "@/lib/bibleAbbrev";
import { loadBible } from "@/pages/Bible";
import {
    MagnifyingGlass, X, Heart, HeartBreak, Copy, ShareNetwork,
} from "@phosphor-icons/react";

const PAGE_SIZE = 20;
const DATA_URL = "/data/catechism.json";
const CATECHISM_DATA_VERSION = 1;
const IDB_KEY = "catechism:ccc";

// Canonical CCC structure: paragraph the Part begins at + last paragraph it
// covers, so each card on the index can render the full range "§N – §M" and
// users can confirm by themselves the index has no gaps.
const PARTS = [
    { id: 0, start: 1,    end: 25,   es: "Prólogo",                                en: "Prologue" },
    { id: 1, start: 26,   end: 1065, es: "La Profesión de la Fe",                 en: "The Profession of Faith" },
    { id: 2, start: 1066, end: 1690, es: "La Celebración del Misterio Cristiano", en: "The Celebration of the Christian Mystery" },
    { id: 3, start: 1691, end: 2558, es: "La Vida en Cristo",                     en: "Life in Christ" },
    { id: 4, start: 2559, end: 2865, es: "La Oración Cristiana",                  en: "Christian Prayer" },
];

export default function Catechism() {
    const { t, lang } = useLang();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [entries, setEntries] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [query, setQuery] = React.useState("");
    const [visible, setVisible] = React.useState(PAGE_SIZE);
    const [activeId, setActiveId] = React.useState(null);
    // Map: paragraph number → favorite id. Used to show the saved-indicator
    // on already-favorited paragraphs and to toggle remove/save in the menu.
    const [savedParas, setSavedParas] = React.useState(() => new Map());
    // Paragraph that should "flash" briefly after a cross-ref jump, so the
    // user immediately knows where the navigation landed.
    const [flashId, setFlashId] = React.useState(null);
    // Bible quick-view modal state. When `quickCite` is non-null the modal
    // is mounted; the bible payload is preloaded eagerly so the lookup is
    // synchronous.
    const [quickCite, setQuickCite] = React.useState(null);
    const [bibleData, setBibleData] = React.useState(null);
    const sentinelRef = React.useRef(null);

    // O(1) lookup so the cross-ref renderer can quickly check whether a
    // parenthetical number actually corresponds to an existing CCC paragraph
    // before turning it into a clickable button.
    const paragraphIds = React.useMemo(
        () => new Set(entries.map((e) => e.id)),
        [entries],
    );

    // Load the catechism file (IDB + network, same pattern as Bible).
    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError("");
            try {
                const cached = await idbGet(IDB_KEY);
                if (!cancelled && cached
                    && cached.version === CATECHISM_DATA_VERSION
                    && Array.isArray(cached.payload)) {
                    setEntries(cached.payload);
                    setLoading(false);
                    return;
                }
                const res = await fetch(DATA_URL, { cache: "force-cache" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (cancelled) return;
                const arr = Array.isArray(data) ? data : [];
                setEntries(arr);
                idbSet(IDB_KEY, CATECHISM_DATA_VERSION, arr).catch(() => {});
            } catch (e) {
                if (!cancelled) setError(e.message || "Failed to load");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Preload the Bible (same IDB cache as /bible) so the quick-view modal
    // can resolve any citation synchronously the moment it opens.
    React.useEffect(() => {
        let cancelled = false;
        loadBible(lang)
            .then((d) => { if (!cancelled) setBibleData(d); })
            .catch(() => { /* quick-view will gracefully show "not found" */ });
        return () => { cancelled = true; };
    }, [lang]);

    // One-shot fetch of the user's existing catechism favorites so each
    // paragraph can light up its "saved" indicator on load.
    React.useEffect(() => {
        if (!user) { setSavedParas(new Map()); return; }
        let cancelled = false;
        (async () => {
            try {
                const r = await api.get("/favorites");
                if (cancelled) return;
                const map = new Map();
                for (const f of r.data || []) {
                    if (f.section !== "catechism") continue;
                    const p = f.metadata?.paragraph;
                    if (typeof p === "number") map.set(p, f.id);
                }
                setSavedParas(map);
            } catch { /* silent */ }
        })();
        return () => { cancelled = true; };
    }, [user]);

    const toggleParaFavorite = React.useCallback(async (paragraph, text) => {
        if (!user) { navigate("/login"); return; }
        const existingId = savedParas.get(paragraph);
        try {
            if (existingId) {
                await api.delete(`/favorites/${existingId}`);
                setSavedParas((m) => { const n = new Map(m); n.delete(paragraph); return n; });
                toast.success(t("common.remove"));
            } else {
                const r = await api.post("/favorites", {
                    section: "catechism",
                    title: `CCC §${paragraph}`,
                    content: text,
                    metadata: { paragraph },
                    lang,
                });
                const newId = r.data?.id;
                if (newId) {
                    setSavedParas((m) => { const n = new Map(m); n.set(paragraph, newId); return n; });
                }
                toast.success(t("common.saved"));
            }
        } catch {
            toast.error(t("common.error"));
        }
    }, [user, savedParas, lang, navigate, t]);

    // Derive the filtered / jumped list + mode flag.
    const { results, jumpTarget } = React.useMemo(() => {
        const q = query.trim();
        if (!q) return { results: entries, jumpTarget: null };

        if (/^\d+$/.test(q)) {
            const n = parseInt(q, 10);
            const idx = entries.findIndex((e) => e.id === n);
            if (idx >= 0) {
                return {
                    results: entries.slice(Math.max(0, idx - 2), idx + 15),
                    jumpTarget: n,
                };
            }
            return { results: [], jumpTarget: n };
        }

        const needle = q.toLowerCase();
        const filtered = entries.filter((e) => e.text && e.text.toLowerCase().includes(needle));
        return { results: filtered, jumpTarget: null };
    }, [query, entries]);

    // Tracks an in-flight "jump to paragraph" request so the [query]
    // effect can honour the target instead of resetting `visible` back
    // to PAGE_SIZE and losing the row.
    const pendingJumpRef = React.useRef(null);

    React.useEffect(() => {
        const target = pendingJumpRef.current;
        if (target != null) {
            pendingJumpRef.current = null;
            const idx = entries.findIndex((e) => e.id === target);
            setVisible(idx >= 0 ? Math.max(PAGE_SIZE, idx + 5) : PAGE_SIZE);
        } else {
            setVisible(PAGE_SIZE);
        }
    }, [query, entries]);

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

    React.useEffect(() => {
        if (jumpTarget == null) return;
        const el = document.querySelector(`[data-ccc-id="${jumpTarget}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [jumpTarget, visible]);

    // Card-click path is fully decoupled from the search bar: clear the
    // search filter so the full CCC is rendered, expand pagination to the
    // target paragraph (via pendingJumpRef so the [query] effect doesn't
    // overwrite it), then scroll to it on the next frame.
    const jumpToParagraph = React.useCallback((targetId) => {
        pendingJumpRef.current = targetId;
        setQuery("");
        setActiveId(null);
        // Wait two frames AFTER the [query] effect has run so the target
        // <li> is actually mounted, then scroll. setTimeout(0) gives React
        // enough time to flush effects.
        window.setTimeout(() => {
            requestAnimationFrame(() => {
                const el = document.querySelector(`[data-ccc-id="${targetId}"]`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                setFlashId(targetId);
                window.setTimeout(() => {
                    setFlashId((cur) => (cur === targetId ? null : cur));
                }, 1400);
            });
        }, 0);
    }, []);

    const jumpToPart = (part) => { jumpToParagraph(part.start); };
    const onResetTop = () => setQuery("");

    const shown = results.slice(0, visible);
    const hasMore = visible < results.length;

    // Renders paragraph text with three overlapping enrichments:
    //   1. <mark> for the current text-search query (skipped on numeric search)
    //   2. <button> for parenthetical CCC cross-references — both single
    //      "(NNN)" and grouped "(NNN, NNN, NNN)" lists. Rendered in
    //      liturgical purple to distinguish from Bible citations.
    //   3. <button> for inline Bible citations like "*Mt* 5:3" or "Heb 11:1"
    //      that opens a quick-view modal anchored to the in-memory Bible.
    // Done in a single pass so the three enrichments never collide.
    const renderRichText = React.useCallback((text) => {
        const q = query.trim();
        const queryActive = q.length > 0 && !/^\d+$/.test(q);

        // Step 1: extract Bible citations and CCC parenthetical refs as a
        // sorted, non-overlapping list of "tokens". Anything in between is
        // plain text that may still receive query highlight.
        const cites = findCitations(text);

        const refTokens = [];
        // Match either a single "(NNN)" or a comma/semicolon-separated list
        // like "(2500, 1730, 1776, 1703, 366)" — both cases are CCC-internal
        // cross-references.
        const refRegex = /\(\s*(\d{1,4}(?:\s*[,;]\s*\d{1,4})*)\s*\)/g;
        let rm;
        while ((rm = refRegex.exec(text)) !== null) {
            // Avoid colliding with a Bible citation that already covers this slice.
            const overlap = cites.some((c) => rm.index >= c.start && rm.index < c.end);
            if (overlap) continue;
            const nums = rm[1]
                .split(/[,;]/)
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => Number.isFinite(n));
            if (nums.length === 0) continue;
            refTokens.push({
                kind: "xref",
                start: rm.index,
                end: rm.index + rm[0].length,
                nums,
                raw: rm[0],
            });
        }

        const all = [...cites, ...refTokens].sort((a, b) => a.start - b.start);

        const segments = [];
        let cursor = 0;
        for (const tok of all) {
            if (tok.start > cursor) {
                segments.push({ kind: "text", value: text.slice(cursor, tok.start) });
            }
            segments.push(tok);
            cursor = tok.end;
        }
        if (cursor < text.length) segments.push({ kind: "text", value: text.slice(cursor) });

        // Step 2: highlight helper for query inside plain-text segments.
        const highlight = (s, keyPrefix) => {
            if (!queryActive) return s;
            const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
            const parts = s.split(re);
            return parts.map((p, i) =>
                re.test(p)
                    ? <mark key={`${keyPrefix}-${i}`} className="bg-sangre/15 text-stone900 rounded px-0.5">{p}</mark>
                    : <React.Fragment key={`${keyPrefix}-${i}`}>{p}</React.Fragment>,
            );
        };

        // Liturgical-purple pill for an internal CCC paragraph link. Falls
        // back to plain text when the target paragraph doesn't exist.
        const cccPill = (num, key) => {
            if (!paragraphIds.has(num)) {
                return <React.Fragment key={key}>{num}</React.Fragment>;
            }
            return (
                <button
                    key={key}
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        jumpToParagraph(num);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    data-testid={`ccc-xref-${num}`}
                    className="ui-sans text-xs font-semibold text-purple-700 hover:text-purple-900 hover:bg-purple-100 align-baseline px-1.5 py-0.5 rounded-md ring-1 ring-purple-200 transition-colors"
                    aria-label={`Ir al párrafo ${num}`}
                >
                    {num}
                </button>
            );
        };

        return segments.map((seg, i) => {
            if (seg.kind === "text") {
                return <React.Fragment key={i}>{highlight(seg.value, `t${i}`)}</React.Fragment>;
            }
            if (seg.kind === "xref") {
                // Render the parenthesis wrapper plus space-separated pills.
                // Single ref keeps the same compact look; grouped refs become
                // a row of small pills.
                return (
                    <span key={i} className="inline-flex flex-wrap items-baseline gap-1 mx-0.5">
                        <span className="text-stoneFaint">(</span>
                        {seg.nums.map((n, j) => (
                            <React.Fragment key={`${i}-${j}`}>
                                {cccPill(n, `${i}-${j}p`)}
                                {j < seg.nums.length - 1 && <span className="text-stoneFaint">,</span>}
                            </React.Fragment>
                        ))}
                        <span className="text-stoneFaint">)</span>
                    </span>
                );
            }
            // Bible citation token.
            const refLabel = `${seg.book[lang === "es" ? "es" : "en"]} ${seg.chapter}:${seg.verse}${seg.endVerse ? `-${seg.endVerse}` : ""}`;
            return (
                <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setQuickCite(seg);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    data-testid={`ccc-bibleref-${seg.book.en.replace(/\s+/g, "_")}-${seg.chapter}-${seg.verse}`}
                    className="reading-serif italic text-sangre hover:bg-sangre/10 underline decoration-dotted underline-offset-2 mx-0.5 px-1 rounded transition-colors"
                    aria-label={refLabel}
                    title={refLabel}
                >
                    {seg.raw}
                </button>
            );
        });
    }, [query, paragraphIds, jumpToParagraph, lang]);

    const searching = query.trim().length > 0;

    return (
        <div data-testid="catechism-page" onClick={() => setActiveId(null)}>
            <p className="label-eyebrow mb-3">{t("nav.catechism")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-3">
                {t("nav.catechism")}
            </h1>
            <p className="text-stoneMuted mb-6">{t("sections.catechism_desc")}</p>

            <div
                className="sticky top-[56px] md:top-[72px] z-20 -mx-4 sm:-mx-6 lg:-mx-12 px-4 sm:px-6 lg:px-12 py-3 bg-sand-50/95 backdrop-blur-md border-b border-sand-300 mb-8"
                data-testid="catechism-search-wrap"
            >
                <div className="relative max-w-[720px] mx-auto">
                    <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stoneFaint" />
                    <input
                        type="search"
                        inputMode="search"
                        placeholder={t("catechism.search_placeholder")}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        data-testid="catechism-search-input"
                        className="w-full pl-10 pr-10 py-3 bg-white border border-sand-300 rounded-md focus:outline-none focus:border-sangre transition-colors ui-sans text-sm"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            data-testid="catechism-search-clear"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stoneMuted hover:text-sangre"
                            aria-label="Clear"
                        >
                            <X size={16} weight="bold" />
                        </button>
                    )}
                </div>
            </div>

            {!searching && !loading && entries.length > 0 && (
                <section
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-12"
                    data-testid="catechism-parts-index"
                >
                    {PARTS.map((p) => {
                        const partLabel = p.id === 0
                            ? (lang === "es" ? "Introducción" : "Introduction")
                            : `${lang === "es" ? "Parte" : "Part"} ${p.id}`;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => jumpToPart(p)}
                                data-testid={`ccc-part-${p.id}`}
                                className="surface-card p-5 text-left"
                            >
                                <p className="label-eyebrow mb-1.5">
                                    {partLabel} · §{p.start} – §{p.end}
                                </p>
                                <p className="reading-serif text-lg leading-snug">
                                    {lang === "es" ? p.es : p.en}
                                </p>
                            </button>
                        );
                    })}
                </section>
            )}

            {loading && <p className="text-stoneMuted" data-testid="catechism-loading">{t("common.loading")}</p>}
            {error && <p className="text-sangre" data-testid="catechism-error">{error}</p>}

            {!loading && !error && (
                <>
                    <p className="label-eyebrow mb-4" data-testid="catechism-results-meta">
                        {searching
                            ? t("catechism.results_count", { count: results.length })
                            : t("catechism.total_count", { count: entries.length })}
                    </p>

                    {results.length === 0 && searching && (
                        <p className="text-stoneMuted italic" data-testid="catechism-empty">
                            {t("catechism.no_results")}
                        </p>
                    )}

                    <ol className="reading-prose space-y-7" data-testid="catechism-list">
                        {shown.map((p) => (
                            <ParagraphRow
                                key={p.id}
                                paragraph={p}
                                renderText={() => renderRichText(p.text)}
                                isActive={activeId === p.id}
                                isSaved={savedParas.has(p.id)}
                                isFlashing={flashId === p.id}
                                onActivate={() => setActiveId(p.id)}
                                onDismiss={() => setActiveId(null)}
                                onToggleFavorite={toggleParaFavorite}
                            />
                        ))}
                    </ol>

                    {hasMore && (
                        <div ref={sentinelRef} className="mt-10 flex justify-center">
                            <button
                                type="button"
                                onClick={() => setVisible((v) => Math.min(results.length, v + PAGE_SIZE))}
                                data-testid="catechism-load-more"
                                className="btn-ghost"
                            >
                                {t("catechism.load_more")} ({visible}/{results.length})
                            </button>
                        </div>
                    )}
                </>
            )}

            <BackToTopButton onClick={onResetTop} testId="catechism-back-to-top" />

            {quickCite && (
                <BibleQuickView
                    cite={quickCite}
                    bibleData={bibleData}
                    onClose={() => setQuickCite(null)}
                />
            )}
        </div>
    );
}

/* ================================================================== */
/* Long-press paragraph with context menu                             */
/* ================================================================== */

function ParagraphRow({ paragraph, renderText, isActive, isSaved, isFlashing, onActivate, onDismiss, onToggleFavorite }) {
    const handlers = useLongPress(() => onActivate());
    return (
        <li
            data-ccc-id={paragraph.id}
            data-testid={`ccc-para-${paragraph.id}`}
            className={[
                "ccc-row group relative rounded-md transition-colors duration-150",
                "px-3 py-3 -mx-3",
                isSaved ? "border-l-2 border-sangre/50 pl-4" : "",
                isActive ? "verse-active" : "",
                isFlashing ? "ccc-flash" : "",
            ].filter(Boolean).join(" ")}
            style={{ scrollMarginTop: "80px" }}
            {...handlers}
        >
            <div className="flex items-start gap-3">
                <span className="text-sangre font-semibold ui-sans text-sm mt-1 shrink-0">
                    §{paragraph.id}
                </span>
                <div className="flex-1 min-w-0">
                    <p className="m-0 whitespace-pre-line">{renderText()}</p>
                    {isSaved && !isActive && (
                        <span className="sr-only" data-testid={`ccc-saved-${paragraph.id}`}>saved</span>
                    )}
                </div>
            </div>
            {isActive && (
                <ParagraphPopover
                    paragraph={paragraph}
                    isSaved={isSaved}
                    onToggleFavorite={onToggleFavorite}
                    onDismiss={onDismiss}
                />
            )}
        </li>
    );
}

function ParagraphPopover({ paragraph, isSaved, onToggleFavorite, onDismiss }) {
    const { t } = useLang();
    const reference = `CCC §${paragraph.id}`;
    const formatted = `${paragraph.text}\n\n— ${reference}`;

    const doCopy = async () => {
        try {
            await navigator.clipboard.writeText(formatted);
            toast.success(t("catechism.paragraph_copied"));
        } catch {
            toast.error(t("common.error"));
        }
    };
    const doShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: t("catechism.share_title"), text: formatted });
                return;
            } catch { /* cancelled — fall through to copy */ }
        }
        await doCopy();
    };
    const doFavorite = () => { onToggleFavorite(paragraph.id, paragraph.text); };

    const items = [
        {
            id: "fav",
            label: isSaved ? t("catechism.remove_favorite") : t("common.save_favorite"),
            icon: isSaved
                ? <HeartBreak size={16} weight="duotone" />
                : <Heart size={16} weight="duotone" />,
            onSelect: doFavorite,
        },
        {
            id: "copy",
            label: t("catechism.copy_paragraph"),
            icon: <Copy size={16} weight="duotone" />,
            onSelect: doCopy,
        },
        {
            id: "share",
            label: t("catechism.share_paragraph"),
            icon: <ShareNetwork size={16} weight="duotone" />,
            onSelect: doShare,
        },
    ];

    return (
        <ContextMenu
            items={items}
            onDismiss={onDismiss}
            testId={`ccc-menu-${paragraph.id}`}
        />
    );
}
