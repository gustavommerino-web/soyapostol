import React from "react";
import { useLang } from "@/contexts/LangContext";
import FavoriteButton from "@/components/FavoriteButton";
import BackToTopButton from "@/components/BackToTopButton";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

const PAGE_SIZE = 20;
const DATA_URL = "/data/catechism.json";

// Canonical CCC part structure (paragraph the Part begins at).
const PARTS = [
    { id: 1, start: 26,   es: "La Profesión de la Fe",                   en: "The Profession of Faith" },
    { id: 2, start: 1066, es: "La Celebración del Misterio Cristiano",   en: "The Celebration of the Christian Mystery" },
    { id: 3, start: 1691, es: "La Vida en Cristo",                        en: "Life in Christ" },
    { id: 4, start: 2558, es: "La Oración Cristiana",                     en: "Christian Prayer" },
];

export default function Catechism() {
    const { t, lang } = useLang();

    const [entries, setEntries] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [query, setQuery] = React.useState("");
    const [visible, setVisible] = React.useState(PAGE_SIZE);
    const sentinelRef = React.useRef(null);

    // Fetch the catechism file only on entry.
    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError("");
            try {
                const res = await fetch(DATA_URL, { cache: "force-cache" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (!cancelled) setEntries(Array.isArray(data) ? data : []);
            } catch (e) {
                if (!cancelled) setError(e.message || "Failed to load");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Derive the filtered / jumped list + mode flag.
    const { results, jumpTarget } = React.useMemo(() => {
        const q = query.trim();
        if (!q) return { results: entries, jumpTarget: null };

        // Pure number → jump mode (target + small contextual window).
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

        // Text mode → case-insensitive contains filter.
        const needle = q.toLowerCase();
        const filtered = entries.filter((e) => e.text && e.text.toLowerCase().includes(needle));
        return { results: filtered, jumpTarget: null };
    }, [query, entries]);

    // Reset pagination whenever the result set changes.
    React.useEffect(() => {
        setVisible(PAGE_SIZE);
    }, [query]);

    // IntersectionObserver for lazy pagination.
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

    // Smooth-scroll to the paragraph when the user typed a number.
    React.useEffect(() => {
        if (jumpTarget == null) return;
        const el = document.querySelector(`[data-ccc-id="${jumpTarget}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [jumpTarget, visible]);

    const jumpToPart = (part) => {
        // Reuse the jump-to-number behavior so the reader lands on §start and
        // can keep reading from that section.
        setQuery(String(part.start));
    };

    const onResetTop = () => setQuery("");

    const shown = results.slice(0, visible);
    const hasMore = visible < results.length;

    const highlightText = (text) => {
        const q = query.trim();
        if (!q || /^\d+$/.test(q)) return text;
        const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
        const parts = text.split(re);
        return parts.map((p, i) =>
            re.test(p)
                ? <mark key={i} className="bg-sangre/15 text-stone900 rounded px-0.5">{p}</mark>
                : <React.Fragment key={i}>{p}</React.Fragment>,
        );
    };

    const searching = query.trim().length > 0;

    return (
        <div data-testid="catechism-page">
            <p className="label-eyebrow mb-3">{t("nav.catechism")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-3">
                {t("nav.catechism")}
            </h1>
            <p className="text-stoneMuted mb-6">{t("sections.catechism_desc")}</p>

            {/* Sticky search bar — stays visible under the app header */}
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

            {/* Interactive index of the 4 parts (hidden while searching) */}
            {!searching && !loading && entries.length > 0 && (
                <section
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-12"
                    data-testid="catechism-parts-index"
                >
                    {PARTS.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => jumpToPart(p)}
                            data-testid={`ccc-part-${p.id}`}
                            className="surface-card p-5 text-left"
                        >
                            <p className="label-eyebrow mb-1.5">
                                {lang === "es" ? "Parte" : "Part"} {p.id} · §{p.start}
                            </p>
                            <p className="reading-serif text-lg leading-snug">
                                {lang === "es" ? p.es : p.en}
                            </p>
                        </button>
                    ))}
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
                            <li
                                key={p.id}
                                data-ccc-id={p.id}
                                data-testid={`ccc-para-${p.id}`}
                                className="group scroll-mt-36"
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-sangre font-semibold ui-sans text-sm mt-1 shrink-0">
                                        §{p.id}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="m-0 whitespace-pre-line">{highlightText(p.text)}</p>
                                        <div className="mt-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                            <FavoriteButton
                                                section="catechism"
                                                title={`CCC §${p.id}`}
                                                content={p.text}
                                                metadata={{ paragraph: p.id }}
                                                testId={`fav-ccc-${p.id}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ol>

                    {/* Sentinel + manual load-more fallback */}
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

            {/* Floating back-to-top button */}
            <BackToTopButton onClick={onResetTop} testId="catechism-back-to-top" />
        </div>
    );
}
