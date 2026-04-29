import React from "react";
import { useLang } from "@/contexts/LangContext";
import { localDateISO } from "@/lib/localDate";
import BackToTopButton from "@/components/BackToTopButton";
import UniversalisReadings from "@/components/UniversalisReadings";
import EvangelizoReadings from "@/components/EvangelizoReadings";

export default function Readings() {
    const { lang, t } = useLang();
    const [localDate, setLocalDate] = React.useState(() => localDateISO());

    // Re-evaluate the user's local date once a minute. When the calendar
    // ticks past local midnight the readings refresh through the language-
    // specific source components (each owns its own fetch + cache).
    React.useEffect(() => {
        const tick = setInterval(() => {
            const next = localDateISO();
            setLocalDate((prev) => (prev === next ? prev : next));
        }, 60_000);
        return () => clearInterval(tick);
    }, []);

    // Format the local date as a localized long subtitle. Both source
    // components also surface their own day descriptors ("Wednesday of the
    // 4th week of Eastertide", "Miércoles de la 4ª semana de Pascua"), so
    // we keep the page-level subtitle a clean human date.
    const formattedDate = React.useMemo(() => {
        try {
            const d = new Date(`${localDate}T12:00:00`);
            return new Intl.DateTimeFormat(lang === "es" ? "es-ES" : "en-US",
                { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(d);
        } catch {
            return "";
        }
    }, [localDate, lang]);

    return (
        <div className="max-w-3xl mx-auto" data-testid="readings-page">
            <p className="label-eyebrow mb-3">{t("nav.readings")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-2"
                data-testid="readings-title">
                {t("common.today")}
            </h1>
            {formattedDate && (
                <p className="reading-serif italic text-lg text-stoneMuted mt-2 mb-10"
                   data-testid="readings-date">{formattedDate}</p>
            )}

            {/* Language-specific readings source. Each component owns its own
                fetch + localStorage cache + error fallback. */}
            {lang === "en" ? (
                <UniversalisReadings date={localDate} />
            ) : (
                <EvangelizoReadings date={localDate} />
            )}

            {/* Evangeli.net daily commentary — appears after the Gospel.
                Iframe is wrapped in a responsive card and lazy-loaded so it
                never blocks the readings render. */}
            <section className="mt-16 mb-12" data-testid="evangeli-net-section">
                <p className="label-eyebrow mb-3">{t("readings.reflection_eyebrow")}</p>
                <h2 className="heading-serif text-2xl sm:text-3xl tracking-tight mb-5">
                    {t("readings.reflection_title")}
                </h2>
                {/* Evangeli.net widget renders with a small font by default.
                    We scale the iframe content visually (1.2x) so the text
                    size matches the rest of the reading prose. The iframe
                    width is reduced inversely (100% / 1.2) so that, after
                    scaling, it fills the container exactly. Container
                    height is enlarged by the same factor to fit the
                    scaled-up content without inner scrollbars. */}
                <div
                    className="surface-card overflow-hidden p-0 relative w-full"
                    style={{ height: "660px" }}
                >
                    <iframe
                        title={t("readings.reflection_title")}
                        src={lang === "en"
                            ? "https://evangeli.net/gospel/widget/web"
                            : "https://evangeli.net/evangelio/widget/web"}
                        loading="lazy"
                        frameBorder="0"
                        data-testid="evangeli-iframe"
                        style={{
                            display: "block",
                            width: "83.3333%",
                            height: "550px",
                            border: 0,
                            transform: "scale(1.2)",
                            transformOrigin: "top left",
                        }}
                    />
                </div>
                <p className="text-xs text-stoneMuted mt-3">
                    {t("readings.reflection_credit")}{" "}
                    <a
                        href="https://evangeli.net/"
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-sangre"
                    >evangeli.net</a>
                </p>
            </section>

            <BackToTopButton testId="readings-back-to-top" />
        </div>
    );
}
