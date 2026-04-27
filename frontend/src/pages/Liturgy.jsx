import React from "react";
import DOMPurify from "dompurify";
import { useLang } from "@/contexts/LangContext";
import api from "@/lib/api";
import { localDateISO } from "@/lib/localDate";
import FavoriteButton from "@/components/FavoriteButton";

export default function Liturgy() {
    const { lang, t } = useLang();
    const [hours, setHours] = React.useState([]);
    const [hour, setHour] = React.useState("lauds");
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [localDate, setLocalDate] = React.useState(() => localDateISO());

    React.useEffect(() => {
        const t = setInterval(() => {
            const next = localDateISO();
            setLocalDate((prev) => (prev === next ? prev : next));
        }, 60_000);
        return () => clearInterval(t);
    }, []);

    React.useEffect(() => {
        api.get(`/liturgy/hours?lang=${lang}`).then((r) => setHours(r.data)).catch(() => {});
    }, [lang]);

    const load = React.useCallback(async () => {
        setLoading(true); setError("");
        try {
            const res = await api.get(`/liturgy?hour=${hour}&lang=${lang}&date=${localDate}`);
            setData(res.data);
        } catch (e) {
            setError(e.response?.data?.detail || e.message);
        } finally { setLoading(false); }
    }, [hour, lang, localDate]);

    React.useEffect(() => { load(); }, [load]);

    const formattedDate = React.useMemo(() => {
        if (!data?.entry_date) return "";
        try {
            const d = new Date(`${data.entry_date}T12:00:00`);
            return new Intl.DateTimeFormat(lang === "es" ? "es-ES" : "en-US",
                { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(d);
        } catch { return data.entry_date; }
    }, [data, lang]);

    return (
        <div className="max-w-3xl mx-auto" data-testid="liturgy-page">
            <p className="label-eyebrow mb-3">{t("nav.liturgy")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-2">
                {data?.title || t("nav.liturgy")}
            </h1>
            {formattedDate && (
                <p className="reading-serif italic text-lg text-stoneMuted mt-2 mb-6"
                   data-testid="liturgy-date">{formattedDate}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-10">
                {hours.map((h) => (
                    <button key={h.id} onClick={() => setHour(h.id)}
                        data-testid={`hour-${h.id}`}
                        className={`px-4 py-2 ui-sans text-sm rounded-md border transition-colors ${hour === h.id ? "bg-sangre text-sand-50 border-sangre" : "bg-sand-100 text-stoneMuted border-sand-300 hover:border-sangre"}`}>
                        {h.label}
                    </button>
                ))}
            </div>

            {loading && <p className="text-stoneMuted" data-testid="liturgy-loading">{t("common.loading")}</p>}
            {error && <p className="text-sangre" data-testid="liturgy-error">{error}</p>}

            {data && (
                <article className="reading-prose" data-testid="liturgy-content">
                    <div className="flex items-center justify-between border-b border-sand-300 pb-2 mb-6">
                        <p className="label-eyebrow m-0">{t("common.source")}: {data.source || "iBreviary"}</p>
                        <FavoriteButton section="liturgy" title={data.title} content={data.content_text}
                            source_url={data.source_url} metadata={{ hour }} testId="fav-liturgy" />
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content_html, { USE_PROFILES: { html: true }, FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"], FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"] }) }} />
                </article>
            )}
        </div>
    );
}
