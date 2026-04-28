import React from "react";
import { useLang } from "@/contexts/LangContext";
import api from "@/lib/api";
import { localDateISO } from "@/lib/localDate";
import FavoriteButton from "@/components/FavoriteButton";
import BackToTopButton from "@/components/BackToTopButton";
import { ArrowSquareOut } from "@phosphor-icons/react";

export default function Readings() {
    const { lang, t } = useLang();
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [localDate, setLocalDate] = React.useState(() => localDateISO());

    // Re-evaluate the user's local date once a minute. When the calendar
    // ticks past local midnight, the change triggers a fresh fetch through
    // the `load` callback below.
    React.useEffect(() => {
        const t = setInterval(() => {
            const next = localDateISO();
            setLocalDate((prev) => (prev === next ? prev : next));
        }, 60_000);
        return () => clearInterval(t);
    }, []);

    const load = React.useCallback(async () => {
        setLoading(true); setError("");
        try {
            const res = await api.get(`/readings?lang=${lang}&date=${localDate}`);
            setData(res.data);
        } catch (e) {
            setError(e.response?.data?.detail || e.message);
        } finally { setLoading(false); }
    }, [lang, localDate]);

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
                <article key={`${sec.label}-${sec.citation || idx}`} className="mb-14 reading-prose" data-testid={`reading-section-${idx}`}>
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

            {/* Evangeli.net daily commentary — appears after the Gospel.
                Iframe is wrapped in a responsive card and lazy-loaded so it
                never blocks the initial USCCB readings render. */}
            {!loading && !error && data?.sections?.length > 0 && (
                <section className="mt-16 mb-12" data-testid="evangeli-net-section">
                    <p className="label-eyebrow mb-3">{t("readings.reflection_eyebrow")}</p>
                    <h2 className="heading-serif text-2xl sm:text-3xl tracking-tight mb-5">
                        {t("readings.reflection_title")}
                    </h2>
                    <div className="surface-card overflow-hidden p-0">
                        <iframe
                            title={t("readings.reflection_title")}
                            src="https://evangeli.net/evangelio/widget/web"
                            loading="lazy"
                            frameBorder="0"
                            className="block w-full h-[550px] border-0"
                            data-testid="evangeli-iframe"
                        />
                    </div>
                    <p className="text-xs text-stoneMuted mt-3">
                        {t("readings.reflection_credit")}{" "}
                        <a
                            href="https://evangeli.net/"
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-sangre"
                        >evangeli.net <ArrowSquareOut size={11} className="inline" /></a>
                    </p>
                </section>
            )}

            <BackToTopButton testId="readings-back-to-top" />
        </div>
    );
}
