import React from "react";
import DOMPurify from "dompurify";
import { useLang } from "@/contexts/LangContext";
import { localDateISO } from "@/lib/localDate";
import api from "@/lib/api";
import FavoriteButton from "@/components/FavoriteButton";
import BackToTopButton from "@/components/BackToTopButton";
import { ArrowSquareOut, CaretLeft, CaretRight, CalendarBlank } from "@phosphor-icons/react";

// ---------------------------------------------------------------------------
// Daily readings — powered by the official Evangelizo RSS feed.
//
// The backend (/api/readings) consolidates 11 upstream calls into a single
// cached JSON document and strips the upstream's attribution footer. Here
// we render the four Mass readings plus the Evangelizo commentary under a
// sticky tab selector (FR · PS · SR · GSP · Commentary). The evangeli.net
// iframe is embedded inside the Commentary tab so users get both
// reflections in one place.
// ---------------------------------------------------------------------------

const TAB_ORDER = ["FR", "PS", "SR", "GSP", "COMM"];

// Window users can browse with the prev/next arrows. Evangelizo's feed
// caps queries at 30 days from today; ±7 is plenty for the "I missed
// Sunday Mass" use case without giving users broken pages.
const DATE_WINDOW_DAYS = 7;

const SECTION_MAP = {
    FR:   { dataKey: "first_reading",  labelKey: "readings.first"      },
    PS:   { dataKey: "psalm",          labelKey: "readings.psalm"      },
    SR:   { dataKey: "second_reading", labelKey: "readings.second"     },
    GSP:  { dataKey: "gospel",         labelKey: "readings.gospel"     },
    COMM: { dataKey: "commentary",     labelKey: "readings.commentary" },
};

// DOMPurify config: the Evangelizo body uses <br/>, basic text, and
// occasional <a> links in commentary. Nothing else is allowed through.
const DOMPURIFY_CFG = {
    ALLOWED_TAGS: ["br", "p", "em", "i", "b", "strong", "a", "span"],
    ALLOWED_ATTR: ["href", "target", "rel"],
};

function renderHtml(raw) {
    if (!raw) return { __html: "" };
    return { __html: DOMPurify.sanitize(raw, DOMPURIFY_CFG) };
}

// Convert the HTML string into a plain-text snapshot for favorites.
// Preserves line breaks from <br/> and collapses remaining whitespace.
function stripHtmlToText(html) {
    if (!html) return "";
    return html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

// Parse "YYYY-MM-DD" into a UTC-stable Date we can shift by whole days
// without DST surprises, then re-serialise via localDateISO.
function shiftDate(isoDate, deltaDays) {
    const [y, m, d] = isoDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + deltaDays);
    return localDateISO(dt);
}

function daysFromToday(isoDate) {
    const today = localDateISO();
    const a = new Date(`${today}T12:00:00`);
    const b = new Date(`${isoDate}T12:00:00`);
    return Math.round((b - a) / 86400000);
}

export default function Readings() {
    const { lang, t } = useLang();
    const [localDate, setLocalDate] = React.useState(() => localDateISO());
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(false);
    const [active, setActive] = React.useState("FR");

    // Refresh at local midnight so a user who left the tab open sees
    // today's readings roll over — but only if they're viewing today.
    // When the user has navigated to ± N days we leave their choice
    // alone; they can press "Today" to catch up.
    React.useEffect(() => {
        const tick = setInterval(() => {
            setLocalDate((prev) => {
                const today = localDateISO();
                // Only auto-advance if the user was on "today" already.
                return prev === today ? prev : prev;
            });
        }, 60_000);
        return () => clearInterval(tick);
    }, []);

    React.useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        api.get("/readings", { params: { lang, date: localDate } })
            .then((res) => { if (!cancelled) setData(res.data); })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [lang, localDate]);

    // If the active tab is SR but the day has no second reading, jump back
    // to the first reading so the user doesn't see an empty state.
    React.useEffect(() => {
        if (active === "SR" && data && !data.second_reading) setActive("FR");
    }, [active, data]);

    const formattedDate = React.useMemo(() => {
        try {
            const d = new Date(`${localDate}T12:00:00`);
            return new Intl.DateTimeFormat(lang === "es" ? "es-ES" : "en-US",
                { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(d);
        } catch {
            return "";
        }
    }, [localDate, lang]);

    // The big headline mirrors the "hero" feel — "Hoy" when on today,
    // "Ayer" / "Mañana" one step out, otherwise the weekday name.
    const heroTitle = React.useMemo(() => {
        const delta = daysFromToday(localDate);
        if (delta === 0) return t("common.today");
        if (delta === -1) return lang === "es" ? "Ayer" : "Yesterday";
        if (delta === 1)  return lang === "es" ? "Mañana" : "Tomorrow";
        try {
            const d = new Date(`${localDate}T12:00:00`);
            const wd = new Intl.DateTimeFormat(lang === "es" ? "es-ES" : "en-US",
                { weekday: "long" }).format(d);
            // Capitalise: es-ES returns lowercase weekdays, en-US uppercase.
            return wd.charAt(0).toUpperCase() + wd.slice(1);
        } catch {
            return formattedDate;
        }
    }, [localDate, lang, t, formattedDate]);

    const hasSR = !!(data && data.second_reading);
    const todayISO = localDateISO();
    const delta = daysFromToday(localDate);
    const atMin = delta <= -DATE_WINDOW_DAYS;
    const atMax = delta >=  DATE_WINDOW_DAYS;

    return (
        <div className="max-w-3xl mx-auto" data-testid="readings-page">
            <p className="label-eyebrow mb-3">{t("nav.readings")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-2"
                data-testid="readings-title">
                {heroTitle}
            </h1>
            {formattedDate && (
                <p className="reading-serif italic text-lg text-stoneMuted mt-2 mb-4"
                   data-testid="readings-date">{formattedDate}</p>
            )}

            {/* Date navigator — lets the user step ±7 days around today
                without leaving the page. Sits above the sticky tab
                selector so that tabs remain the pinned control while
                the user reads, but the calendar jump is still just one
                scroll-up away. */}
            <DateNavigator
                localDate={localDate}
                todayISO={todayISO}
                atMin={atMin}
                atMax={atMax}
                onPrev={() => !atMin && setLocalDate(shiftDate(localDate, -1))}
                onNext={() => !atMax && setLocalDate(shiftDate(localDate,  1))}
                onToday={() => setLocalDate(localDateISO())}
                onPick={(iso) => {
                    const d = daysFromToday(iso);
                    if (d < -DATE_WINDOW_DAYS || d > DATE_WINDOW_DAYS) return;
                    setLocalDate(iso);
                }}
                windowDays={DATE_WINDOW_DAYS}
            />

            {data?.liturgic_title && (
                <p className="ui-sans text-sm uppercase tracking-widest text-sangre mb-8 mt-6"
                   data-testid="readings-liturgic-title">
                    {data.liturgic_title}
                </p>
            )}

            {/* Sticky tab selector — mirrors Favorites' pill styling but
                sits below the app header so it stays visible as the user
                scrolls through a long reading. The negative margins +
                horizontal padding reproduce the main-content padding so
                the background spans the full reading column width. */}
            <div
                className="sticky top-[57px] lg:top-[73px] z-20 -mx-4 sm:-mx-6 lg:-mx-12 px-4 sm:px-6 lg:px-12 py-3 bg-sand-50/95 backdrop-blur-md border-b border-sand-300 mb-8"
                data-testid="readings-tabs-sticky"
            >
                <div
                    role="tablist"
                    aria-label={t("nav.readings")}
                    className="flex flex-wrap gap-2"
                    data-testid="readings-tabs"
                >
                    {TAB_ORDER.map((key) => {
                        const disabled = key === "SR" && !hasSR && !loading;
                        const isActive = active === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                aria-controls={`readings-panel-${key}`}
                                aria-disabled={disabled || undefined}
                                disabled={disabled}
                                onClick={() => !disabled && setActive(key)}
                                data-testid={`readings-tab-${key}`}
                                className={`px-3 py-1.5 ui-sans text-xs uppercase tracking-widest rounded-md border transition-colors ${
                                    isActive
                                        ? "bg-sangre text-sand-50 border-sangre"
                                        : disabled
                                            ? "bg-sand-100 text-stoneFaint border-sand-200 cursor-not-allowed opacity-60"
                                            : "bg-sand-100 text-stoneMuted border-sand-300 hover:border-sangre"
                                }`}
                            >
                                {t(SECTION_MAP[key].labelKey)}
                            </button>
                        );
                    })}
                </div>
            </div>

            {loading && (
                <p className="text-stoneMuted" data-testid="readings-loading">
                    {t("common.loading")}
                </p>
            )}

            {!loading && error && !data && (
                <div className="surface-card p-5 sm:p-6 border-l-4 border-l-sangre"
                     data-testid="readings-error">
                    <p className="reading-serif text-stone900">
                        {t("readings.universalis_unavailable")}
                    </p>
                </div>
            )}

            {!loading && data && active !== "COMM" && (
                <ReadingPanel
                    tab={active}
                    item={data[SECTION_MAP[active].dataKey]}
                    label={t(SECTION_MAP[active].labelKey)}
                />
            )}

            {!loading && data && active === "COMM" && (
                <CommentaryPanel
                    commentary={data.commentary}
                    lang={lang}
                    t={t}
                />
            )}

            {!loading && data && (
                <p className="text-xs text-stoneMuted mt-12 italic"
                   data-testid="readings-copyright">
                    Copyright © Evangelizo · Used with permission.{" "}
                    <a
                        href={lang === "en" ? "https://dailygospel.org/AM/gospel" : "https://evangeliodeldia.org/"}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-sangre inline-flex items-center gap-1"
                    >
                        {lang === "en" ? "dailygospel.org" : "evangeliodeldia.org"}
                        <ArrowSquareOut size={11} className="inline" />
                    </a>
                </p>
            )}

            <BackToTopButton testId="readings-back-to-top" />
        </div>
    );
}

function ReadingPanel({ tab, item, label }) {
    const { t } = useLang();

    if (!item) {
        return (
            <div
                id={`readings-panel-${tab}`}
                role="tabpanel"
                data-testid={`readings-panel-${tab}-empty`}
                className="surface-card p-6 text-stoneMuted"
            >
                {t("readings.universalis_unavailable")}
            </div>
        );
    }

    return (
        <article
            id={`readings-panel-${tab}`}
            role="tabpanel"
            className="reading-prose"
            data-testid={`readings-panel-${tab}`}
        >
            <div className="flex items-center justify-between mb-4 border-b border-sand-300 pb-2">
                <h2 className="heading-serif text-2xl sm:text-3xl tracking-tight m-0">{label}</h2>
                <FavoriteButton
                    section="readings"
                    title={`${label} — ${item.title || ""}`.trim()}
                    content={stripHtmlToText(item.text_html || "")}
                    source_url="https://evangelizo.org/"
                    testId={`fav-readings-${tab}`}
                />
            </div>
            {item.title && (
                <p className="reading-serif italic text-stoneMuted mb-4"
                   data-testid={`readings-panel-${tab}-title`}>
                    {item.title}
                </p>
            )}
            <div
                className="reading-prose"
                data-testid={`readings-panel-${tab}-body`}
                dangerouslySetInnerHTML={renderHtml(item.text_html)}
            />
        </article>
    );
}

function CommentaryPanel({ commentary, lang, t }) {
    return (
        <section
            id="readings-panel-COMM"
            role="tabpanel"
            data-testid="readings-panel-COMM"
            className="space-y-10"
        >
            {/* Evangeli.net widget — the same iframe that used to live at
                the bottom of the page, now nested inside the Commentary
                tab so both reflections share one selector. */}
            <div>
                <p className="label-eyebrow mb-3">{t("readings.reflection_eyebrow")}</p>
                <h2 className="heading-serif text-2xl sm:text-3xl tracking-tight mb-5">
                    {t("readings.reflection_title")}
                </h2>
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
            </div>

            {/* Evangelizo's in-feed commentary (comment_t / comment_a /
                comment_s / comment) — rendered below the iframe. */}
            {commentary && (commentary.text_html || commentary.title) && (
                <div data-testid="readings-evangelizo-commentary">
                    <p className="label-eyebrow mb-3">{t("readings.eod_eyebrow")}</p>
                    <h2 className="heading-serif text-2xl sm:text-3xl tracking-tight mb-5">
                        {commentary.title || t("readings.eod_title")}
                    </h2>
                    <article className="surface-card p-6 sm:p-7 reading-prose">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="min-w-0">
                                {commentary.author && (
                                    <p className="heading-serif text-lg sm:text-xl tracking-tight m-0 mb-1">
                                        {commentary.author}
                                    </p>
                                )}
                                {commentary.source && (
                                    <p className="text-sm text-stoneMuted italic m-0">
                                        {commentary.source}
                                    </p>
                                )}
                            </div>
                            <FavoriteButton
                                section="readings"
                                title={commentary.title || t("readings.eod_title")}
                                content={stripHtmlToText(commentary.text_html || "")}
                                source_url="https://evangelizo.org/"
                                testId="fav-readings-COMM"
                            />
                        </div>
                        <div
                            className="reading-prose mt-2"
                            data-testid="readings-commentary-body"
                            dangerouslySetInnerHTML={renderHtml(commentary.text_html)}
                        />
                    </article>
                </div>
            )}
        </section>
    );
}

function DateNavigator({
    localDate, todayISO, atMin, atMax,
    onPrev, onNext, onToday, onPick, windowDays,
}) {
    const { t } = useLang();
    const dateInputRef = React.useRef(null);

    // Pre-compute the min/max for the native date input so the calendar
    // only offers days we can actually render.
    const minDate = shiftDate(todayISO, -windowDays);
    const maxDate = shiftDate(todayISO,  windowDays);
    const isToday = localDate === todayISO;

    const openPicker = () => {
        const el = dateInputRef.current;
        if (!el) return;
        // showPicker() is the right API but isn't universal yet; fall
        // back to focus+click for older browsers (iOS Safari needs this).
        if (typeof el.showPicker === "function") {
            try { el.showPicker(); return; } catch { /* fall through */ }
        }
        el.focus();
        el.click();
    };

    return (
        <div
            className="flex items-center justify-between gap-2 mb-3"
            data-testid="readings-date-nav"
        >
            <button
                type="button"
                onClick={onPrev}
                disabled={atMin}
                aria-label={t("readings.prev_day")}
                title={t("readings.prev_day")}
                data-testid="readings-date-prev"
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-md border border-sand-300 text-stoneMuted hover:border-sangre hover:text-sangre transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-sand-300 disabled:hover:text-stoneMuted"
            >
                <CaretLeft size={18} weight="bold" />
            </button>

            <button
                type="button"
                onClick={openPicker}
                aria-label={t("readings.pick_date")}
                title={t("readings.pick_date")}
                data-testid="readings-date-picker-btn"
                className="relative flex-1 flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-sand-300 bg-sand-50 text-stone900 hover:border-sangre transition-colors ui-sans text-sm font-medium"
            >
                <CalendarBlank size={16} weight="duotone" className="text-sangre" />
                <span data-testid="readings-date-picker-label">{localDate}</span>
                {/* Hidden native input positioned over the button so the
                    browser's own date picker handles calendar UI for free
                    (mobile keyboards, i18n, a11y). */}
                <input
                    ref={dateInputRef}
                    type="date"
                    value={localDate}
                    min={minDate}
                    max={maxDate}
                    onChange={(e) => e.target.value && onPick(e.target.value)}
                    data-testid="readings-date-picker-input"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    aria-hidden="true"
                    tabIndex={-1}
                />
            </button>

            <button
                type="button"
                onClick={onNext}
                disabled={atMax}
                aria-label={t("readings.next_day")}
                title={t("readings.next_day")}
                data-testid="readings-date-next"
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-md border border-sand-300 text-stoneMuted hover:border-sangre hover:text-sangre transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-sand-300 disabled:hover:text-stoneMuted"
            >
                <CaretRight size={18} weight="bold" />
            </button>

            {!isToday && (
                <button
                    type="button"
                    onClick={onToday}
                    data-testid="readings-date-today"
                    className="shrink-0 h-10 px-3 rounded-md border border-sangre bg-sangre text-sand-50 ui-sans text-xs uppercase tracking-widest font-semibold hover:bg-sangre/90 transition-colors"
                >
                    {t("readings.go_today")}
                </button>
            )}
        </div>
    );
}
