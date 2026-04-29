import React from "react";
import { useLang } from "@/contexts/LangContext";
import { buildSlides, mysteryKeyForDate, MYSTERY_SETS } from "@/data/rosary";
import { CaretLeft, CaretRight, ArrowClockwise, House } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

const MYSTERY_ACCENT = {
    joyful:    { ring: "#E1B12C", soft: "rgba(225,177,44,0.10)" },   // gold
    sorrowful: { ring: "#B33A3A", soft: "rgba(179,58,58,0.10)" },    // sangre
    glorious:  { ring: "#FFD700", soft: "rgba(255,215,0,0.12)" },   // gold
    luminous:  { ring: "#1E88E5", soft: "rgba(30,136,229,0.10)" },   // bright blue
};

function dayLabel(lang, key) {
    const map = {
        es: { joyful: "Gozosos", sorrowful: "Dolorosos", glorious: "Gloriosos", luminous: "Luminosos" },
        en: { joyful: "Joyful", sorrowful: "Sorrowful", glorious: "Glorious", luminous: "Luminous" },
    };
    return (map[lang] || map.es)[key];
}

function todayLabel(lang) {
    return new Intl.DateTimeFormat(lang === "es" ? "es-ES" : "en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    }).format(new Date());
}

export default function Rosary() {
    const { lang, t } = useLang();

    // Mystery selection — defaults to today's. User can override on the cover.
    const todayKey = React.useMemo(() => mysteryKeyForDate(new Date()), []);
    const [mysteryKey, setMysteryKey] = React.useState(todayKey);
    const slides = React.useMemo(() => buildSlides(mysteryKey, lang), [mysteryKey, lang]);

    const [idx, setIdx] = React.useState(0);
    const total = slides.length;
    const slide = slides[idx];

    // Bead counter for hailMaryRepeat slides — lifted to the parent so that
    // tapping anywhere on the slide card (not just on the bead dots) advances
    // the count. Reset whenever the active slide changes.
    const [beadCount, setBeadCount] = React.useState(0);
    React.useEffect(() => { setBeadCount(0); }, [idx]);

    const isCounterSlide = slide.kind === "hailMaryRepeat";
    const beadMax = isCounterSlide ? slide.count : 0;
    const incrementBead = React.useCallback(() => {
        setBeadCount((c) => Math.min(beadMax, c + 1));
    }, [beadMax]);
    const resetBead = React.useCallback(() => setBeadCount(0), []);

    // Reset to start when mystery or language changes.
    React.useEffect(() => { setIdx(0); }, [mysteryKey, lang]);

    const next = React.useCallback(() => setIdx((i) => Math.min(total - 1, i + 1)), [total]);
    const prev = React.useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
    const goTo = (i) => setIdx(Math.max(0, Math.min(total - 1, i)));

    // Keyboard navigation
    React.useEffect(() => {
        const onKey = (e) => {
            if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
            else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [next, prev]);

    // Swipe (touch) — disabled on counter slides so taps anywhere on the card
    // increment the bead instead of triggering navigation.
    const touch = React.useRef({ x: 0, y: 0, active: false });
    const onTouchStart = (e) => {
        if (isCounterSlide) return;
        const t0 = e.touches[0];
        touch.current = { x: t0.clientX, y: t0.clientY, active: true };
    };
    const onTouchEnd = (e) => {
        if (!touch.current.active) return;
        const t1 = e.changedTouches[0];
        const dx = t1.clientX - touch.current.x;
        const dy = t1.clientY - touch.current.y;
        touch.current.active = false;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) next(); else prev();
        }
    };

    const accent = MYSTERY_ACCENT[slide.mysteryKey || mysteryKey] || MYSTERY_ACCENT.joyful;
    const progressPct = total > 1 ? (idx / (total - 1)) * 100 : 0;

    return (
        <div data-testid="rosary-page">
            <p className="label-eyebrow mb-3">{t("nav.rosary")}</p>
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
                <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none"
                    data-testid="rosary-title">
                    {t("rosary.title")}
                </h1>
                <span className="ui-sans text-xs text-stoneMuted tabular-nums" data-testid="rosary-progress-text">
                    {idx + 1} / {total}
                </span>
            </div>
            <p className="reading-serif italic text-lg text-stoneMuted mt-2 mb-6"
               data-testid="rosary-date">
                {todayLabel(lang)}
            </p>

            {/* Progress bar */}
            <div className="h-1 bg-sand-200 rounded-full overflow-hidden mb-6"
                 aria-hidden="true" data-testid="rosary-progress-bar">
                <div className="h-full transition-[width] duration-300"
                     style={{ width: `${progressPct}%`, backgroundColor: accent.ring }} />
            </div>

            {/* Slide */}
            <div
                className={`surface-card relative overflow-hidden ${isCounterSlide ? "cursor-pointer select-none" : ""}`}
                style={{ borderColor: accent.ring + "55" }}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                onClick={isCounterSlide ? incrementBead : undefined}
                data-testid="rosary-slide"
                data-slide-kind={slide.kind}
            >
                {/* accent bar */}
                <div className="h-1 w-full" style={{ backgroundColor: accent.ring }} />

                <div className="px-6 sm:px-10 py-10 sm:py-14 min-h-[460px] flex flex-col">
                    <SlideBody
                        slide={slide}
                        lang={lang}
                        accent={accent}
                        mysteryKey={mysteryKey}
                        setMysteryKey={setMysteryKey}
                        onBegin={next}
                        onRestart={() => setIdx(0)}
                        beadCount={beadCount}
                        onBeadReset={resetBead}
                    />
                </div>

                {/* Tap zones (mobile-friendly) — hidden on counter slides so the
                    whole card becomes a tap target for the bead counter. */}
                {!isCounterSlide && (
                    <>
                        <button
                            type="button"
                            aria-label={t("rosary.previous")}
                            onClick={prev}
                            disabled={idx === 0}
                            data-testid="rosary-tap-prev"
                            className="absolute left-0 top-0 h-full w-1/4 sm:w-16 disabled:opacity-30 group focus:outline-none"
                        >
                            <span className="sr-only">{t("rosary.previous")}</span>
                        </button>
                        <button
                            type="button"
                            aria-label={t("rosary.next")}
                            onClick={next}
                            disabled={idx === total - 1}
                            data-testid="rosary-tap-next"
                            className="absolute right-0 top-0 h-full w-1/4 sm:w-16 disabled:opacity-30 group focus:outline-none"
                        >
                            <span className="sr-only">{t("rosary.next")}</span>
                        </button>
                    </>
                )}
            </div>

            {/* Controls */}
            <div className="mt-5 flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={prev}
                    disabled={idx === 0}
                    data-testid="rosary-prev-btn"
                    className="ui-sans inline-flex items-center gap-2 px-3 sm:px-4 py-2 border border-sand-300 rounded-md text-sm hover:border-sangre disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <CaretLeft size={16} weight="bold" />
                    <span className="hidden sm:inline">{t("rosary.previous")}</span>
                </button>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIdx(0)}
                        data-testid="rosary-restart-btn"
                        className="ui-sans inline-flex items-center gap-1.5 px-3 py-2 border border-sand-300 rounded-md text-xs text-stoneMuted hover:border-sangre hover:text-stone900 transition-colors"
                        title={t("rosary.restart")}
                    >
                        <ArrowClockwise size={14} weight="bold" />
                        <span className="hidden sm:inline">{t("rosary.restart")}</span>
                    </button>
                </div>

                <button
                    type="button"
                    onClick={next}
                    disabled={idx === total - 1}
                    data-testid="rosary-next-btn"
                    className="ui-sans inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    style={{ backgroundColor: accent.ring, color: "#FDFDFD" }}
                >
                    <span className="hidden sm:inline">{t("rosary.next")}</span>
                    <CaretRight size={16} weight="bold" />
                </button>
            </div>

            <p className="text-xs text-stoneMuted text-center mt-4 ui-sans">
                {t("rosary.help")}
            </p>
        </div>
    );
}

/* --------------------------------------------------------------------- */

function SlideBody({ slide, lang, accent, mysteryKey, setMysteryKey, onBegin, onRestart, beadCount, onBeadReset }) {
    const { t } = useLang();

    if (slide.kind === "cover") {
        return (
            <CoverSlide
                lang={lang}
                accent={accent}
                mysteryKey={mysteryKey}
                setMysteryKey={setMysteryKey}
                onBegin={onBegin}
            />
        );
    }

    if (slide.kind === "end") {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center" data-testid="rosary-end">
                <p className="label-eyebrow mb-3" style={{ color: accent.ring }}>
                    {t("rosary.completed_eyebrow")}
                </p>
                <h2 className="heading-serif text-3xl sm:text-4xl tracking-tight mb-3">
                    {t("rosary.completed_title")}
                </h2>
                <p className="reading-serif text-stoneMuted text-base sm:text-lg max-w-md mb-8">
                    {t("rosary.completed_subtitle")}
                </p>
                <div className="flex items-center gap-3 flex-wrap justify-center">
                    <button
                        type="button"
                        onClick={onRestart}
                        data-testid="rosary-end-restart"
                        className="ui-sans inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-sand-50"
                        style={{ backgroundColor: accent.ring }}
                    >
                        <ArrowClockwise size={16} weight="bold" />
                        {t("rosary.pray_again")}
                    </button>
                    <Link
                        to="/"
                        data-testid="rosary-end-home"
                        className="ui-sans inline-flex items-center gap-2 px-4 py-2 border border-sand-300 rounded-md text-sm hover:border-sangre transition-colors"
                    >
                        <House size={16} weight="duotone" />
                        {t("nav.dashboard")}
                    </Link>
                </div>
            </div>
        );
    }

    if (slide.kind === "mystery") {
        return (
            <div className="flex-1 flex flex-col" data-testid="rosary-mystery-body">
                <p className="label-eyebrow mb-3" style={{ color: accent.ring }}>
                    {t("rosary.mystery_n", { n: slide.ordinal })} · {slide.label}
                </p>
                <h2 className="heading-serif text-3xl sm:text-4xl tracking-tight mb-4"
                    data-testid="rosary-mystery-title">
                    {slide.title}
                </h2>

                {slide.verse && (
                    <blockquote
                        className="border-l-2 pl-4 sm:pl-5 mb-5"
                        style={{ borderColor: accent.ring }}
                        data-testid="rosary-mystery-verse"
                    >
                        <p className="reading-serif italic text-base sm:text-lg leading-relaxed text-stone900 m-0">
                            {slide.verse}
                        </p>
                        {slide.scripture && (
                            <p className="ui-sans text-xs uppercase tracking-widest font-semibold mt-2 m-0"
                               style={{ color: accent.ring }}>
                                {slide.scripture}
                            </p>
                        )}
                    </blockquote>
                )}
                {!slide.verse && slide.scripture && (
                    <p className="ui-sans text-sm font-semibold mb-5" style={{ color: accent.ring }}>
                        {slide.scripture}
                    </p>
                )}

                {slide.fruit && (
                    <p className="reading-serif text-base sm:text-lg leading-relaxed text-stone900 mb-3"
                       data-testid="rosary-mystery-fruit">
                        <span className="ui-sans text-xs uppercase tracking-widest font-semibold mr-2"
                              style={{ color: accent.ring }}>
                            {t("rosary.fruit_label")}
                        </span>
                        {slide.fruit}
                    </p>
                )}

                {slide.meditation && (
                    <p className="reading-serif text-base sm:text-lg leading-relaxed text-stone900 m-0"
                       data-testid="rosary-mystery-meditation">
                        <span className="ui-sans text-xs uppercase tracking-widest font-semibold mr-2"
                              style={{ color: accent.ring }}>
                            {t("rosary.meditation_label")}
                        </span>
                        {slide.meditation}
                    </p>
                )}
            </div>
        );
    }

    if (slide.kind === "hailMaryRepeat") {
        return <HailMaryRepeatSlide slide={slide} accent={accent} count={beadCount} onReset={onBeadReset} />;
    }

    if (slide.kind === "postDecade") {
        return (
            <div className="flex-1 flex flex-col" data-testid="rosary-post-decade-body">
                <p className="label-eyebrow mb-3" style={{ color: accent.ring }}>
                    {t("rosary.after_decade_label")}
                </p>
                <h2 className="heading-serif text-3xl sm:text-4xl tracking-tight mb-6"
                    data-testid="rosary-post-decade-title">
                    {t("rosary.after_decade_title")}
                </h2>
                <div className="flex flex-col gap-5">
                    {slide.items.map((it, i) => (
                        <div
                            key={i}
                            className="border-l-2 pl-4 sm:pl-5"
                            style={{ borderColor: accent.ring }}
                            data-testid={`rosary-post-decade-item-${i}`}
                        >
                            <p className="ui-sans text-xs uppercase tracking-widest font-semibold mb-2"
                               style={{ color: accent.ring }}>
                                {it.title}
                            </p>
                            {it.versicle ? (
                                <>
                                    <p className="reading-serif text-base sm:text-lg leading-relaxed text-stone900 m-0">
                                        {it.versicle}
                                    </p>
                                    <p className="reading-serif italic text-base sm:text-lg leading-relaxed text-stoneMuted m-0 mt-1">
                                        {it.response}
                                    </p>
                                </>
                            ) : (
                                <p className="reading-serif text-base sm:text-lg leading-relaxed text-stone900 m-0">
                                    {it.text}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Default: prayer slide.
    return (
        <div className="flex-1 flex flex-col" data-testid="rosary-prayer-body">
            <p className="label-eyebrow mb-3" style={{ color: accent.ring }}>
                {t("rosary.prayer_label")}
            </p>
            <h2 className="heading-serif text-3xl sm:text-4xl tracking-tight mb-5"
                data-testid="rosary-prayer-title">
                {slide.title}
            </h2>
            {slide.text.split(/\n+/).map((p, i) => (
                <p key={i} className="reading-serif text-base sm:text-lg leading-[1.85] text-stone900 mb-4 last:mb-0">
                    {p}
                </p>
            ))}
        </div>
    );
}

function CoverSlide({ lang, accent, mysteryKey, setMysteryKey, onBegin }) {
    const { t } = useLang();
    const todayKey = React.useMemo(() => mysteryKeyForDate(new Date()), []);
    const isToday = mysteryKey === todayKey;

    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center" data-testid="rosary-cover">
            <p className="label-eyebrow mb-3" style={{ color: accent.ring }}>
                {isToday ? t("rosary.today_eyebrow") : t("rosary.choose_eyebrow")}
            </p>
            <h2 className="heading-serif text-3xl sm:text-5xl tracking-tight leading-tight mb-3"
                data-testid="rosary-cover-title">
                {dayLabel(lang, mysteryKey)}
            </h2>
            <p className="reading-serif italic text-stoneMuted text-base sm:text-lg max-w-md mb-8">
                {t("rosary.cover_subtitle")}
            </p>

            <button
                type="button"
                onClick={onBegin}
                data-testid="rosary-cover-begin"
                className="ui-sans inline-flex items-center gap-2 px-6 py-3 rounded-md text-base font-semibold text-sand-50 mb-8 shadow-md"
                style={{ backgroundColor: accent.ring }}
            >
                {t("rosary.begin")}
                <CaretRight size={16} weight="bold" />
            </button>

            {/* Mystery picker */}
            <div className="w-full max-w-md">
                <p className="label-eyebrow mb-3 text-stoneMuted">
                    {t("rosary.change_mystery")}
                </p>
                <div className="grid grid-cols-2 gap-2" data-testid="rosary-mystery-picker">
                    {Object.keys(MYSTERY_SETS).map((k) => {
                        const active = k === mysteryKey;
                        const a = MYSTERY_ACCENT[k];
                        return (
                            <button
                                key={k}
                                type="button"
                                onClick={() => setMysteryKey(k)}
                                data-testid={`rosary-pick-${k}`}
                                className="ui-sans text-sm py-2 px-3 rounded-md border transition-colors text-left"
                                style={{
                                    borderColor: active ? a.ring : "#DFE4EA",
                                    backgroundColor: active ? a.soft : "transparent",
                                    color: active ? a.ring : "#2D3436",
                                    fontWeight: active ? 600 : 500,
                                }}
                            >
                                {dayLabel(lang, k)}
                                {k === todayKey && (
                                    <span className="ml-1 ui-sans text-[10px] uppercase tracking-wider opacity-70">
                                        · {t("common.today")}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function HailMaryRepeatSlide({ slide, accent, count, onReset }) {
    const { t } = useLang();
    // Bead count is owned by the parent (Rosary) so taps anywhere on the card
    // can advance it. We just render its current value.

    // Reset / increment buttons need to stop propagation so they don't double-
    // fire the parent's "tap anywhere on card" handler.
    const stop = (fn) => (e) => { e.stopPropagation(); fn?.(); };

    return (
        <div className="flex-1 flex flex-col" data-testid="rosary-decade-body">
            <p className="label-eyebrow mb-3" style={{ color: accent.ring }}>
                {slide.decade
                    ? t("rosary.decade_n", { n: slide.decade })
                    : t("rosary.intro_three_eyebrow")}
            </p>
            <h2 className="heading-serif text-3xl sm:text-4xl tracking-tight mb-5"
                data-testid="rosary-decade-title">
                {slide.title}
            </h2>

            <p className="reading-serif text-base sm:text-lg leading-[1.85] text-stone900 mb-6">
                {slide.text}
            </p>

            {/* Bead row */}
            <div className="mt-auto pt-4 border-t border-sand-300/70">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="ui-sans text-xs text-stoneMuted">
                        {slide.hints && slide.hints[count]
                            ? slide.hints[count]
                            : t("rosary.bead_progress", { n: count, total: slide.count })}
                    </p>
                    {count > 0 && (
                        <button
                            type="button"
                            onClick={stop(onReset)}
                            data-testid="rosary-bead-reset"
                            className="ui-sans text-xs text-stoneMuted hover:text-sangre underline-offset-2 hover:underline"
                        >
                            {t("rosary.reset")}
                        </button>
                    )}
                </div>
                <div
                    className="flex items-center justify-center gap-2 flex-wrap pointer-events-none"
                    aria-hidden="true"
                    data-testid="rosary-bead-row"
                >
                    {Array.from({ length: slide.count }).map((_, i) => {
                        const filled = i < count;
                        return (
                            <span
                                key={i}
                                data-testid={`rosary-bead-${i}`}
                                className="rounded-full transition-all"
                                style={{
                                    width: 18,
                                    height: 18,
                                    backgroundColor: filled ? accent.ring : "transparent",
                                    border: `2px solid ${filled ? accent.ring : "#B2BEC3"}`,
                                    transform: filled ? "scale(1.05)" : "scale(1)",
                                    display: "inline-block",
                                }}
                            />
                        );
                    })}
                </div>
                <p className="text-center mt-3 ui-sans text-xs text-stoneMuted">
                    {count >= slide.count
                        ? t("rosary.decade_done_hint")
                        : t("rosary.tap_anywhere")}
                </p>
            </div>
        </div>
    );
}
