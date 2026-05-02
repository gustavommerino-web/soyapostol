import React from "react";
import { useLang } from "@/contexts/LangContext";
import {
    CheckCircle, ArrowLeft, TrashSimple, CheckSquareOffset,
    Heart, UserCircle, Lightning, UserFocus, Moon, Sparkle, ArrowCounterClockwise,
    HandHeart, HeartStraight, Clock, Flame, Leaf, HandsPraying,
    Wind, GraduationCap, Scroll, Briefcase, House, DeviceMobile,
} from "@phosphor-icons/react";

const DATA_URL = (lang) => `/data/examen-${lang}.json`;
const STORAGE_KEY = (lang) => `soyapostol:examen:${lang}`;

// Profiles offered on the cover. Each is addressable by its id, which also
// serves as the `examId` key in the cumulative checks map.
const PROFILES = [
    { id: "adults",          icon: UserFocus,     kind: "general",  target: null },
    { id: "married_couples", icon: Heart,         kind: "general",  target: "married_couples" },
    { id: "single_adults",   icon: UserCircle,    kind: "general",  target: "single_adults" },
    { id: "teenagers",       icon: Lightning,     kind: "general",  target: "teenagers" },
    { id: "beatitudes",      icon: Sparkle,       kind: "alt_exam", target: "beatitudes_exam" },
    { id: "triple_love",     icon: HeartStraight, kind: "alt_exam", target: "triple_love_exam" },
    { id: "capital_sins",    icon: Flame,         kind: "alt_exam", target: "capital_sins_exam" },
    { id: "virtues",         icon: Leaf,          kind: "alt_exam", target: "virtues_moral_exam" },
    { id: "mercy_works",     icon: HandsPraying,  kind: "alt_exam", target: "mercy_works_exam" },
    { id: "ignatian_daily",  icon: Clock,         kind: "alt_exam", target: "ignatian_daily_examen" },
    { id: "charity_hymn",    icon: Scroll,        kind: "alt_exam", target: "charity_hymn_exam" },
    { id: "holy_spirit",     icon: Wind,          kind: "alt_exam", target: "holy_spirit_gifts_exam" },
    { id: "youth",           icon: GraduationCap, kind: "alt_exam", target: "youth_exam" },
    { id: "work",            icon: Briefcase,     kind: "alt_exam", target: "professional_ethics_work_exam" },
    { id: "family",          icon: House,         kind: "alt_exam", target: "marriage_family_exam" },
    { id: "digital",         icon: DeviceMobile,  kind: "alt_exam", target: "digital_world_exam" },
];

/* ---------- State helpers ---------- */
// Shape:
//   { profile: <examId|null>, checks: { [examId]: { [sectionId]: { [qIdx]: true } } } }
function loadState(lang) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY(lang));
        if (!raw) return { profile: null, checks: {} };
        const parsed = JSON.parse(raw);
        const c = (parsed && typeof parsed.checks === "object" && parsed.checks) || {};
        // Legacy format migration: old shape stored sections flat at the top of
        // `checks` (keys like `gen_1`, `spec_...`, `alt_...`). Wrap those under
        // the persisted profile so the cumulative model can absorb them.
        const isLegacy = Object.keys(c).some(
            (k) => k.startsWith("gen_") || k.startsWith("spec_") || k.startsWith("alt_"),
        );
        if (isLegacy) {
            const migrated = parsed.profile ? { [parsed.profile]: c } : {};
            return { profile: null, checks: migrated };
        }
        // Always land on the cover when returning to the page.
        return { profile: null, checks: c };
    } catch {
        return { profile: null, checks: {} };
    }
}
function saveState(lang, state) {
    try { localStorage.setItem(STORAGE_KEY(lang), JSON.stringify(state)); } catch { /* ignore */ }
}
function clearState(lang) {
    try { localStorage.removeItem(STORAGE_KEY(lang)); } catch { /* ignore */ }
}

function countExam(checks, examId) {
    const ex = checks?.[examId];
    if (!ex) return 0;
    return Object.values(ex).reduce(
        (n, s) => n + Object.values(s || {}).filter(Boolean).length, 0,
    );
}

/* ---------- Section builder (shared by live view + summary) ---------- */
function buildSections(data, profileId, t) {
    if (!data || !profileId) return [];
    const selected = PROFILES.find((p) => p.id === profileId);
    if (!selected) return [];
    const out = [];

    if (selected.kind === "alt_exam") {
        const alt = (data.alternative_exams || []).find((a) => a.id === selected.target);
        if (alt?.categories) {
            alt.categories.forEach((c) => {
                out.push({
                    id: `alt_${alt.id}_${c.id}`,
                    eyebrow: alt.title,
                    title: c.name,
                    focus: c.focus,
                    questions: c.questions || [],
                });
            });
        }
        return out;
    }

    const gen = data.general_sections?.[0];
    if (gen?.questions_by_commandment) {
        gen.questions_by_commandment.forEach((c) => {
            out.push({
                id: `gen_${c.commandment}`,
                eyebrow: `${t("examen.commandment")} ${c.commandment}`,
                title: c.title,
                questions: c.questions || [],
            });
        });
    }
    if (selected.target) {
        const spec = (data.specific_states || []).find((s) => s.id === selected.target);
        if (spec) {
            out.push({
                id: `spec_${spec.id}`,
                eyebrow: t("examen.your_state"),
                title: spec.title,
                questions: spec.questions || [],
            });
        }
    }
    return out;
}

/* ================================================================== */

export default function Examen() {
    const { lang, t } = useLang();
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");

    const initial = React.useMemo(() => loadState(lang), [lang]);
    const [profile, setProfile] = React.useState(initial.profile);
    const [checks, setChecks] = React.useState(initial.checks);
    const [showSummary, setShowSummary] = React.useState(false);
    const [finished, setFinished] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        setLoading(true); setError("");
        fetch(DATA_URL(lang), { cache: "force-cache" })
            .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then((j) => { if (!cancelled) setData(j.examination_of_conscience_app || j); })
            .catch((e) => { if (!cancelled) setError(e.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [lang]);

    // Rehydrate on language flip.
    React.useEffect(() => {
        const s = loadState(lang);
        setProfile(s.profile);
        setChecks(s.checks);
        setShowSummary(false);
        setFinished(false);
    }, [lang]);

    // Persist.
    React.useEffect(() => {
        if (!profile && Object.keys(checks).length === 0) return;
        saveState(lang, { profile, checks });
    }, [lang, profile, checks]);

    const sections = React.useMemo(
        () => buildSections(data, profile, t),
        [data, profile, t],
    );

    const currentExamChecks = checks[profile] || {};

    const totalChecked = React.useMemo(
        () => (profile ? countExam(checks, profile) : 0),
        [checks, profile],
    );

    const toggleQuestion = (sectionId, qIdx) => {
        if (!profile) return;
        setChecks((prev) => {
            const ex = { ...(prev[profile] || {}) };
            const sec = { ...(ex[sectionId] || {}) };
            if (sec[qIdx]) delete sec[qIdx];
            else sec[qIdx] = true;
            if (Object.keys(sec).length === 0) delete ex[sectionId];
            else ex[sectionId] = sec;
            const next = { ...prev };
            if (Object.keys(ex).length === 0) delete next[profile];
            else next[profile] = ex;
            return next;
        });
    };

    // Complete wipe — only triggered by the two explicit reset actions.
    const wipeAll = () => {
        clearState(lang);
        setChecks({});
        setProfile(null);
        setShowSummary(false);
    };
    const startOver = () => { wipeAll(); };
    const finishAndExit = () => {
        wipeAll();
        setFinished(true);
    };

    // Leaving an exam never wipes — cumulative model.
    const backToCover = () => {
        setProfile(null);
        setShowSummary(false);
    };

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto">
                <p className="text-stoneMuted" data-testid="examen-loading">{t("common.loading")}</p>
            </div>
        );
    }
    if (error || !data) {
        return (
            <div className="max-w-3xl mx-auto">
                <p className="text-sangre" data-testid="examen-error">{error || t("common.error")}</p>
            </div>
        );
    }

    if (finished) {
        return <PeaceScreen onClose={() => setFinished(false)} />;
    }

    if (!profile) {
        return (
            <ProfileCover
                onPick={setProfile}
                checks={checks}
                onViewSummary={() => setShowSummary(true)}
                showSummary={showSummary}
                data={data}
                onStartOver={startOver}
                onFinish={finishAndExit}
            />
        );
    }

    if (showSummary) {
        return (
            <SummaryView
                data={data}
                checks={checks}
                actOfContrition={data.closing?.act_of_contrition}
                onBack={() => setShowSummary(false)}
                onStartOver={startOver}
                onFinish={finishAndExit}
            />
        );
    }

    return (
        <div className="max-w-3xl mx-auto" data-testid="examen-page">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                <div>
                    <p className="label-eyebrow mb-3">{t("nav.examen")}</p>
                    <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none">
                        {t("examen.title")}
                    </h1>
                </div>
                <button
                    type="button"
                    onClick={backToCover}
                    data-testid="examen-change-profile"
                    className="ui-sans text-xs uppercase tracking-widest text-stoneMuted hover:text-sangre inline-flex items-center gap-1.5"
                >
                    <ArrowLeft size={14} weight="bold" /> {t("examen.change_profile")}
                </button>
            </div>
            <p className="reading-serif italic text-lg text-stoneMuted mt-2 mb-2">
                {t(`examen.profile.${profile}`)}
            </p>
            <p className="text-sm text-stoneMuted mb-6 flex items-center gap-1.5">
                <Moon size={14} weight="duotone" />
                {t("examen.privacy_notice")}
            </p>

            {totalChecked > 0 && (
                <div className="mb-6">
                    <StartOverInline onConfirm={startOver} />
                </div>
            )}

            <SectionsAccordion
                sections={sections}
                checks={currentExamChecks}
                onToggle={toggleQuestion}
            />

            {/* Sticky bottom action bar — the "Ver resumen" CTA is the
                single floating action on this screen.

                v2 layout: the selection count is embedded as a pill INSIDE
                the button so there's only one element in the sticky bar,
                no more two-column layout pushing the button off-screen on
                narrow mobile widths. The button takes full width on mobile
                (centered by `justify-center`) and shrink-to-content on md+. */}
            <div className="sticky bottom-[calc(6rem+env(safe-area-inset-bottom))] md:bottom-6 z-20 mt-10 mb-4 pointer-events-none flex justify-center">
                <button
                    type="button"
                    onClick={() => setShowSummary(true)}
                    disabled={totalAcrossAll(checks) === 0}
                    data-testid="examen-see-summary"
                    className="pointer-events-auto ui-sans inline-flex items-center justify-center gap-3 w-full md:w-auto md:min-w-[280px] px-5 sm:px-7 py-3.5 rounded-full text-sm font-semibold whitespace-nowrap text-sand-50 bg-sangre hover:bg-sangre-hover transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <CheckSquareOffset size={18} weight="bold" />
                    <span>{t("examen.see_summary")}</span>
                    <span
                        className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-full text-xs font-bold bg-sand-50/20 text-sand-50"
                        data-testid="examen-see-summary-count"
                        aria-label={t("examen.selected_count")}
                    >
                        {totalChecked}
                    </span>
                </button>
            </div>
        </div>
    );
}

function totalAcrossAll(checks) {
    return Object.values(checks).reduce(
        (n, ex) => n + Object.values(ex || {}).reduce(
            (m, s) => m + Object.values(s || {}).filter(Boolean).length, 0,
        ), 0,
    );
}

/* ------------------------------------------------------------------ */

function StartOverInline({ onConfirm }) {
    const { t } = useLang();
    const [confirm, setConfirm] = React.useState(false);
    if (!confirm) {
        return (
            <button
                type="button"
                onClick={() => setConfirm(true)}
                data-testid="examen-start-over"
                className="ui-sans inline-flex items-center gap-2 text-xs uppercase tracking-widest text-stoneMuted hover:text-sangre font-semibold"
            >
                <ArrowCounterClockwise size={14} weight="bold" />
                {t("examen.start_over")}
            </button>
        );
    }
    return (
        <div
            className="surface-card p-3 flex items-center gap-3 max-w-md"
            data-testid="examen-start-over-confirm"
        >
            <p className="text-xs text-stone900 flex-1 leading-snug">
                {t("examen.start_over_confirm")}
            </p>
            <button
                type="button"
                onClick={() => { onConfirm(); setConfirm(false); }}
                data-testid="examen-start-over-yes"
                className="ui-sans text-xs uppercase tracking-widest font-semibold px-3 py-2 rounded-md bg-sangre text-sand-50 hover:bg-sangre-hover"
            >
                {t("common.yes")}
            </button>
            <button
                type="button"
                onClick={() => setConfirm(false)}
                data-testid="examen-start-over-no"
                className="ui-sans text-xs uppercase tracking-widest text-stoneMuted hover:text-stone900"
            >
                {t("common.cancel")}
            </button>
        </div>
    );
}

/* ------------------------------------------------------------------ */

function ProfileCover({ onPick, checks, onViewSummary, data, onStartOver, onFinish }) {
    const { t } = useLang();
    const total = totalAcrossAll(checks);

    return (
        <div className="max-w-2xl mx-auto" data-testid="examen-cover">
            <p className="label-eyebrow mb-3">{t("nav.examen")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-3"
                data-testid="examen-title">
                {t("examen.cover_title")}
            </h1>
            <p className="reading-serif italic text-lg text-stoneMuted mb-3">
                {t("examen.cover_subtitle")}
            </p>
            <p className="text-sm text-stoneMuted mb-8 flex items-center gap-1.5">
                <Moon size={14} weight="duotone" />
                {t("examen.privacy_notice")}
            </p>

            {total > 0 && (
                <div
                    className="surface-card p-4 sm:p-5 mb-6 flex items-center justify-between gap-3"
                    data-testid="examen-cumulative-banner"
                    style={{ borderLeft: "3px solid #B33A3A" }}
                >
                    <div className="min-w-0">
                        <p className="ui-sans text-xs uppercase tracking-widest text-stoneMuted">
                            {t("examen.cumulative_title")}
                        </p>
                        <p className="heading-serif text-2xl leading-none tracking-tight mt-1">
                            {t(total === 1 ? "examen.marked_count_one" : "examen.marked_count", { n: total })}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onViewSummary}
                        data-testid="examen-cover-see-summary"
                        className="ui-sans inline-flex items-center gap-2 px-4 py-3 rounded-md text-sm font-semibold text-sand-50 bg-sangre hover:bg-sangre-hover transition-colors shrink-0"
                    >
                        <CheckSquareOffset size={16} weight="bold" />
                        {t("examen.see_summary")}
                    </button>
                </div>
            )}

            <p className="label-eyebrow mb-3">{t("examen.choose_profile")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROFILES.map(({ id, icon: Icon }) => {
                    const count = countExam(checks, id);
                    const active = count > 0;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onPick(id)}
                            data-testid={`examen-profile-${id}`}
                            className={`surface-card p-5 text-left flex items-center gap-4 transition-colors ${
                                active ? "border-sangre/60" : "hover:border-sangre/60"
                            }`}
                        >
                            <div className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                                active ? "bg-sangre text-sand-50" : "bg-sangre/10 text-sangre"
                            }`} aria-hidden="true">
                                <Icon size={24} weight="duotone" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="heading-serif text-xl leading-tight tracking-tight">
                                        {t(`examen.profile.${id}`)}
                                    </p>
                                    {active && (
                                        <span
                                            className="ui-sans text-[10px] uppercase tracking-widest font-semibold px-2 py-1 rounded-full bg-sangre/10 text-sangre shrink-0"
                                            data-testid={`examen-profile-count-${id}`}
                                        >
                                            {t(count === 1 ? "examen.marked_count_one" : "examen.marked_count", { n: count })}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-stoneMuted mt-0.5">
                                    {t(`examen.profile_desc.${id}`)}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {total > 0 && (
                <div className="mt-10 flex flex-col gap-3" data-testid="examen-cover-actions">
                    <StartOverInline onConfirm={onStartOver} />
                    <FinishInline onConfirm={onFinish} />
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */

function SectionsAccordion({ sections, checks, onToggle }) {
    // Single long scroll: every section is rendered as an always-open card
    // so the user can flow through the questions without taps.
    return (
        <div className="flex flex-col gap-5" data-testid="examen-sections">
            {sections.map((sec) => {
                const sectionChecks = checks[sec.id] || {};
                const selected = Object.values(sectionChecks).filter(Boolean).length;
                return (
                    <article
                        key={sec.id}
                        className="surface-card overflow-hidden"
                        data-testid={`examen-section-${sec.id}`}
                    >
                        <header className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4">
                            <p className="label-eyebrow mb-2">{sec.eyebrow}</p>
                            <h2 className="heading-serif text-lg sm:text-xl leading-tight tracking-tight m-0">
                                {sec.title}
                            </h2>
                            {selected > 0 && (
                                <p className="text-xs text-sangre mt-2 ui-sans uppercase tracking-widest font-semibold">
                                    <CheckCircle size={12} weight="fill" className="inline -mt-0.5 mr-1" />
                                    {selected}
                                </p>
                            )}
                        </header>
                        <div className="px-5 sm:px-6 pb-6">
                            {sec.focus && (
                                <blockquote
                                    className="reading-serif italic text-base text-stoneMuted border-l-2 border-sangre/40 pl-4 mb-4"
                                    data-testid={`examen-focus-${sec.id}`}
                                >
                                    {sec.focus}
                                </blockquote>
                            )}
                            <ul className="flex flex-col gap-1">
                                {sec.questions.map((q, i) => {
                                    const checked = !!sectionChecks[i];
                                    return (
                                        <li key={i}>
                                            <button
                                                type="button"
                                                onClick={() => onToggle(sec.id, i)}
                                                data-testid={`examen-q-${sec.id}-${i}`}
                                                aria-pressed={checked}
                                                className={`w-full text-left py-3 px-3 -mx-3 rounded-md flex items-start gap-3 transition-colors ${
                                                    checked ? "bg-sangre/5" : "hover:bg-sand-200"
                                                }`}
                                            >
                                                <span
                                                    className={`shrink-0 w-5 h-5 mt-0.5 rounded-[5px] border-2 flex items-center justify-center transition-colors ${
                                                        checked
                                                            ? "bg-sangre border-sangre"
                                                            : "bg-transparent border-stoneFaint"
                                                    }`}
                                                    aria-hidden="true"
                                                >
                                                    {checked && <CheckCircle size={12} weight="fill" color="#FDFDFD" />}
                                                </span>
                                                <span className="reading-serif text-base leading-relaxed text-stone900 flex-1">
                                                    {q}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

/* ------------------------------------------------------------------ */

function SummaryView({ data, checks, actOfContrition, onBack, onStartOver, onFinish }) {
    const { t } = useLang();

    // Flatten every examId's non-empty sections into a single, ordered list.
    // Order follows the PROFILES array for predictable grouping.
    const groupedCards = React.useMemo(() => {
        const out = [];
        for (const p of PROFILES) {
            const exChecks = checks[p.id];
            if (!exChecks || Object.keys(exChecks).length === 0) continue;
            const secs = buildSections(data, p.id, t);
            secs.forEach((sec) => {
                const c = exChecks[sec.id] || {};
                const qs = sec.questions.filter((_, i) => c[i]);
                if (qs.length > 0) {
                    out.push({
                        key: `${p.id}__${sec.id}`,
                        examId: p.id,
                        profileLabel: t(`examen.profile.${p.id}`),
                        sectionTitle: sec.title,
                        questions: qs,
                    });
                }
            });
        }
        return out;
    }, [data, checks, t]);

    const total = groupedCards.reduce((n, g) => n + g.questions.length, 0);

    return (
        <div className="max-w-3xl mx-auto" data-testid="examen-summary">
            <button
                type="button"
                onClick={onBack}
                data-testid="examen-summary-back"
                className="ui-sans text-sm text-stoneMuted hover:text-sangre inline-flex items-center gap-1.5 mb-6"
            >
                <ArrowLeft size={14} weight="bold" /> {t("examen.back_to_questions")}
            </button>

            <p className="label-eyebrow mb-3">{t("examen.summary_eyebrow")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-3">
                {t("examen.summary_title")}
            </h1>
            <p className="reading-serif italic text-lg text-stoneMuted mb-2">
                {t("examen.summary_subtitle", { n: total })}
            </p>
            <p className="text-sm text-stoneMuted mb-10 flex items-center gap-1.5">
                <Moon size={14} weight="duotone" />
                {t("examen.privacy_notice")}
            </p>

            {total === 0 ? (
                <p className="text-stoneMuted" data-testid="examen-summary-empty">
                    {t("examen.summary_empty")}
                </p>
            ) : (
                <div className="flex flex-col gap-5" data-testid="examen-summary-sections">
                    {groupedCards.map((card) => (
                        <article
                            key={card.key}
                            className="surface-card p-5 sm:p-6"
                            data-testid={`examen-summary-card-${card.key}`}
                            style={{ borderLeft: "3px solid #B33A3A" }}
                        >
                            <p className="label-eyebrow mb-2">{card.profileLabel}</p>
                            <h2 className="heading-serif text-lg sm:text-xl leading-tight tracking-tight mb-4">
                                {card.sectionTitle}
                            </h2>
                            <ul className="flex flex-col gap-2">
                                {card.questions.map((q, i) => (
                                    <li
                                        key={i}
                                        className="reading-serif text-base leading-relaxed text-stone900 flex gap-3"
                                    >
                                        <span className="ui-sans font-semibold text-sangre shrink-0">•</span>
                                        <span className="flex-1">{q}</span>
                                    </li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </div>
            )}

            {actOfContrition && (
                <section className="mt-16 mb-8" data-testid="examen-act-of-contrition">
                    <p className="label-eyebrow mb-3">{t("examen.contrition_eyebrow")}</p>
                    <h2 className="heading-serif text-2xl sm:text-3xl tracking-tight mb-5">
                        {t("examen.contrition_title")}
                    </h2>
                    <article className="surface-card p-6 sm:p-7 reading-prose">
                        <p className="reading-serif text-base sm:text-lg leading-[1.85] text-stone900 m-0 text-justify">
                            {actOfContrition}
                        </p>
                    </article>
                </section>
            )}

            <div className="mt-10 flex flex-col gap-3">
                <StartOverInline onConfirm={onStartOver} />
                <FinishInline onConfirm={onFinish} />
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */

function FinishInline({ onConfirm }) {
    const { t } = useLang();
    const [confirm, setConfirm] = React.useState(false);
    if (!confirm) {
        return (
            <button
                type="button"
                onClick={() => setConfirm(true)}
                data-testid="examen-finish-btn"
                className="ui-sans inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold text-sand-50 bg-sangre hover:bg-sangre-hover transition-colors"
            >
                <TrashSimple size={16} weight="bold" />
                {t("examen.finish_confession")}
            </button>
        );
    }
    return (
        <div
            className="surface-card p-4 flex items-center gap-3"
            data-testid="examen-finish-confirm"
            style={{ borderLeft: "3px solid #B33A3A" }}
        >
            <p className="text-sm text-stone900 flex-1">
                {t("examen.finish_confession_confirm")}
            </p>
            <button
                type="button"
                onClick={onConfirm}
                data-testid="examen-finish-confirm-yes"
                className="ui-sans text-xs uppercase tracking-widest font-semibold px-3 py-2 rounded-md bg-sangre text-sand-50 hover:bg-sangre-hover"
            >
                {t("common.yes")}
            </button>
            <button
                type="button"
                onClick={() => setConfirm(false)}
                data-testid="examen-finish-confirm-no"
                className="ui-sans text-xs uppercase tracking-widest text-stoneMuted hover:text-stone900"
            >
                {t("common.cancel")}
            </button>
        </div>
    );
}

/* ------------------------------------------------------------------ */

function PeaceScreen({ onClose }) {
    const { t } = useLang();
    return (
        <div
            className="max-w-xl mx-auto min-h-[60vh] flex flex-col items-center justify-center text-center"
            data-testid="examen-peace"
        >
            <div
                className="w-16 h-16 rounded-full flex items-center justify-center bg-sangre/10 text-sangre mb-6"
                aria-hidden="true"
            >
                <HandHeart size={32} weight="duotone" />
            </div>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-4"
                data-testid="examen-peace-title">
                {t("examen.finish_done_title")}
            </h1>
            <p className="reading-serif italic text-lg text-stoneMuted mb-10 max-w-md">
                {t("examen.finish_done_subtitle")}
            </p>
            <button
                type="button"
                onClick={onClose}
                data-testid="examen-peace-close"
                className="ui-sans inline-flex items-center gap-2 px-5 py-3 rounded-md text-sm font-semibold text-sand-50 bg-sangre hover:bg-sangre-hover transition-colors"
            >
                <ArrowLeft size={16} weight="bold" />
                {t("examen.return_home")}
            </button>
        </div>
    );
}
