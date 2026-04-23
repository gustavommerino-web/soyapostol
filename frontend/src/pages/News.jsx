import React from "react";
import { useLang } from "@/contexts/LangContext";
import api from "@/lib/api";
import { ArrowSquareOut, ArrowsClockwise } from "@phosphor-icons/react";

export default function News() {
    const { t, lang } = useLang();
    const [items, setItems] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [filter, setFilter] = React.useState("all");

    const load = React.useCallback(async (refresh = false) => {
        setLoading(true);
        try {
            const r = await api.get(`/news?lang=${lang}${refresh ? "&refresh=true" : ""}`);
            setItems(r.data.items || []);
        } finally { setLoading(false); }
    }, [lang]);

    React.useEffect(() => { load(); }, [load]);

    const sources = React.useMemo(() => Array.from(new Set(items.map((i) => i.source))), [items]);
    const filtered = filter === "all" ? items : items.filter((i) => i.source === filter);

    const fmtDate = (s) => {
        if (!s) return "";
        try { return new Date(s).toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { day: "numeric", month: "short", year: "numeric" }); }
        catch { return s; }
    };

    return (
        <div className="max-w-5xl mx-auto" data-testid="news-page">
            <div className="flex items-center justify-between mb-3">
                <p className="label-eyebrow">{t("nav.news")}</p>
                <button onClick={() => load(true)} data-testid="news-refresh-btn"
                    className="ui-sans text-xs uppercase tracking-widest text-stoneMuted hover:text-sangre inline-flex items-center gap-1.5">
                    <ArrowsClockwise size={14} weight="bold" /> {t("common.refresh")}
                </button>
            </div>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-3">{t("nav.news")}</h1>
            <p className="text-stoneMuted mb-10 max-w-2xl">{t("sections.news_desc")}</p>

            <div className="flex flex-wrap gap-2 mb-10" data-testid="news-source-filter">
                <button onClick={() => setFilter("all")}
                    className={`px-4 py-1.5 ui-sans text-xs uppercase tracking-widest rounded-md border transition-colors ${filter === "all" ? "bg-sangre text-sand-50 border-sangre" : "bg-sand-100 text-stoneMuted border-sand-300 hover:border-sangre"}`}
                    data-testid="news-filter-all">All</button>
                {sources.map((s) => (
                    <button key={s} onClick={() => setFilter(s)}
                        className={`px-4 py-1.5 ui-sans text-xs uppercase tracking-widest rounded-md border transition-colors ${filter === s ? "bg-sangre text-sand-50 border-sangre" : "bg-sand-100 text-stoneMuted border-sand-300 hover:border-sangre"}`}
                        data-testid={`news-filter-${s}`}>{s}</button>
                ))}
            </div>

            {loading && <p className="text-stoneMuted" data-testid="news-loading">{t("common.loading")}</p>}
            {!loading && filtered.length === 0 && <p className="text-stoneMuted" data-testid="news-empty">No news at the moment.</p>}

            <ul className="grid grid-cols-1 md:grid-cols-2 gap-5" data-testid="news-list">
                {filtered.map((n, idx) => (
                    <li key={n.link || `${n.source}-${n.title}`} className="surface-card rounded-md p-6 flex flex-col" data-testid={`news-item-${idx}`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="label-eyebrow text-sangre">{n.source}</span>
                            <span className="text-xs text-stoneFaint">{fmtDate(n.published)}</span>
                        </div>
                        <h3 className="heading-serif text-2xl leading-snug tracking-tight mb-2">{n.title}</h3>
                        <p className="text-sm text-stoneMuted leading-relaxed flex-1">{n.summary}</p>
                        {n.link && (
                            <a href={n.link} target="_blank" rel="noreferrer"
                                className="mt-4 ui-sans text-xs uppercase tracking-widest text-sangre hover:underline inline-flex items-center gap-1.5">
                                {t("common.view")} <ArrowSquareOut size={12} />
                            </a>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
