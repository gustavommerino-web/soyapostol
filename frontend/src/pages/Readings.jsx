import React from "react";
import { useLang } from "@/contexts/LangContext";
import api from "@/lib/api";
import FavoriteButton from "@/components/FavoriteButton";
import { ArrowSquareOut } from "@phosphor-icons/react";

export default function Readings() {
    const { lang, t } = useLang();
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");

    const load = React.useCallback(async () => {
        setLoading(true); setError("");
        try {
            const res = await api.get(`/readings?lang=${lang}`);
            setData(res.data);
        } catch (e) {
            setError(e.response?.data?.detail || e.message);
        } finally { setLoading(false); }
    }, [lang]);

    React.useEffect(() => { load(); }, [load]);

    // Format the cache date (YYYY-MM-DD) into a localized long date.
    const formattedDate = React.useMemo(() => {
        if (!data) return "";
        if (data.date) {
            try {
                // Parse as local-noon to avoid TZ off-by-one
                const d = new Date(`${data.date}T12:00:00`);
                return new Intl.DateTimeFormat(lang === "es" ? "es-ES" : "en-US",
                    { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(d);
            } catch { /* fall through */ }
        }
        return data.date_text || "";
    }, [data, lang]);

    return (
        <div className="max-w-3xl mx-auto" data-testid="readings-page">
            <p className="label-eyebrow mb-3">{t("nav.readings")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-2"
                data-testid="readings-title">
                {data?.title || t("common.today")}
            </h1>
            {formattedDate && (
                <p className="reading-serif italic text-lg text-stoneMuted mt-2"
                   data-testid="readings-date">{formattedDate}</p>
            )}
            <div className="flex items-center gap-4 mb-10 mt-4">
                {data?.source_url && (
                    <a href={data.source_url} target="_blank" rel="noreferrer"
                        className="text-sm text-stoneMuted hover:text-sangre inline-flex items-center gap-1.5"
                        data-testid="readings-source-link">
                        USCCB <ArrowSquareOut size={14} />
                    </a>
                )}
            </div>

            {loading && <p className="text-stoneMuted" data-testid="readings-loading">{t("common.loading")}</p>}
            {error && <p className="text-sangre" data-testid="readings-error">{error}</p>}

            {!loading && data?.sections?.length === 0 && (
                <p className="text-stoneMuted" data-testid="readings-empty">No readings found.</p>
            )}

            {data?.sections?.map((sec, idx) => (
                <article key={idx} className="mb-14 reading-prose" data-testid={`reading-section-${idx}`}>
                    <div className="flex items-center justify-between mb-4 border-b border-sand-300 pb-2">
                        <h2 className="heading-serif text-2xl sm:text-3xl tracking-tight m-0">{sec.title}</h2>
                        <FavoriteButton section="readings" title={sec.title} content={sec.content}
                            source_url={data.source_url} testId={`fav-reading-${idx}`} />
                    </div>
                    {sec.content.split(/\n+/).filter(Boolean).map((p, i) => (
                        <p key={i}>{p}</p>
                    ))}
                </article>
            ))}
        </div>
    );
}
