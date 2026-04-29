import React from "react";
import { useLang } from "@/contexts/LangContext";
import api from "@/lib/api";
import BackToTopButton from "@/components/BackToTopButton";
import { ArrowSquareOut, ArrowsClockwise, NewspaperClipping } from "@phosphor-icons/react";

const CACHE_PREFIX = "soyapostol:news:";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min — matches backend cache window
const CACHED_PREVIEW = 5;             // user-facing instant preview

function readCache(lang) {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + lang);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.items)) return null;
        if (parsed.savedAt && Date.now() - parsed.savedAt > CACHE_TTL_MS * 24) {
            // safety cap — drop entries older than ~12h regardless of TTL
            localStorage.removeItem(CACHE_PREFIX + lang);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function writeCache(lang, items) {
    try {
        localStorage.setItem(
            CACHE_PREFIX + lang,
            JSON.stringify({
                savedAt: Date.now(),
                items: items.slice(0, CACHED_PREVIEW),
            })
        );
    } catch { /* storage full or disabled */ }
}

export default function News() {
    const { t, lang } = useLang();

    // Initial render is hydrated from localStorage (the latest 5 items) so
    // the page paints instantly. The network revalidation runs in the
    // background and replaces items + cache when fresh data arrives.
    const cached = React.useMemo(() => readCache(lang), [lang]);
    const [items, setItems] = React.useState(() => cached?.items || []);
    const [loading, setLoading] = React.useState(!cached);
    const [refreshing, setRefreshing] = React.useState(false);

    const fmtDate = React.useCallback((s) => {
        if (!s) return "";
        try {
            return new Date(s).toLocaleDateString(lang === "es" ? "es-ES" : "en-US",
                { day: "numeric", month: "short", year: "numeric" });
        } catch { return s; }
    }, [lang]);

    const load = React.useCallback(async (refresh = false) => {
        if (refresh) setRefreshing(true);
        else if (!cached) setLoading(true);
        try {
            const r = await api.get(`/news?lang=${lang}${refresh ? "&refresh=true" : ""}`);
            const fresh = r.data.items || [];
            setItems(fresh);
            writeCache(lang, fresh);
        } catch {
            // Silent — keep showing cached items if any.
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [lang, cached]);

    React.useEffect(() => {
        // Re-hydrate from cache when the language flips, then revalidate.
        const c = readCache(lang);
        setItems(c?.items || []);
        setLoading(!c);
        load();
    }, [lang, load]);

    return (
        <div className="max-w-5xl mx-auto" data-testid="news-page">
            <div className="flex items-center justify-between mb-3">
                <p className="label-eyebrow">{t("nav.news")}</p>
                <button
                    onClick={() => load(true)}
                    disabled={refreshing}
                    data-testid="news-refresh-btn"
                    className="ui-sans text-xs uppercase tracking-widest text-stoneMuted hover:text-sangre inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                    <ArrowsClockwise size={14} weight="bold"
                        className={refreshing ? "animate-spin" : ""} />
                    {t("common.refresh")}
                </button>
            </div>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-3"
                data-testid="news-title">
                {t("nav.news")}
            </h1>
            <p className="text-stoneMuted mb-3 max-w-2xl">{t("sections.news_desc")}</p>
            <p className="ui-sans text-xs text-stoneMuted mb-10 inline-flex items-center gap-1.5">
                <NewspaperClipping size={14} weight="duotone" />
                {t("news.source_credit")}{" "}
                <a
                    href={`https://www.vaticannews.va/${lang === "en" ? "en" : "es"}.html`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-sangre"
                >Vatican News</a>
            </p>

            {loading && items.length === 0 && (
                <p className="text-stoneMuted" data-testid="news-loading">{t("common.loading")}</p>
            )}
            {!loading && items.length === 0 && (
                <p className="text-stoneMuted" data-testid="news-empty">{t("news.empty")}</p>
            )}

            <ul className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="news-list">
                {items.map((n, idx) => (
                    <NewsCard
                        key={n.link || `${idx}-${n.title}`}
                        item={n}
                        idx={idx}
                        formatDate={fmtDate}
                        viewLabel={t("common.view")}
                    />
                ))}
            </ul>

            <BackToTopButton testId="news-back-to-top" />
        </div>
    );
}

function NewsCard({ item, idx, formatDate, viewLabel }) {
    const [imgError, setImgError] = React.useState(false);
    const showImage = item.image && !imgError;
    return (
        <li
            className="surface-card overflow-hidden p-0 flex flex-col"
            data-testid={`news-item-${idx}`}
        >
            {showImage && (
                <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="block bg-sand-200 aspect-[16/9] overflow-hidden"
                    aria-hidden="true"
                    tabIndex={-1}
                >
                    <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                        data-testid={`news-item-${idx}-image`}
                    />
                </a>
            )}
            <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-3">
                    <span className="label-eyebrow text-sangre">{item.source}</span>
                    <span className="text-xs text-stoneFaint">{formatDate(item.published)}</span>
                </div>
                <h3 className="heading-serif text-2xl leading-snug tracking-tight mb-2">
                    {item.title}
                </h3>
                <p className="text-sm text-stoneMuted leading-relaxed flex-1">{item.summary}</p>
                {item.link && (
                    <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 ui-sans text-xs uppercase tracking-widest text-sangre hover:underline inline-flex items-center gap-1.5 self-start"
                        data-testid={`news-item-${idx}-link`}
                    >
                        {viewLabel} <ArrowSquareOut size={12} />
                    </a>
                )}
            </div>
        </li>
    );
}
