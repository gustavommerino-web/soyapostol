import React from "react";
import { useLang } from "@/contexts/LangContext";
import BackToTopButton from "@/components/BackToTopButton";
import {
    CaretDown, CheckCircle, ArrowLeft, TrashSimple, CheckSquareOffset,
    Heart, Users, UserCircle, Lightning, UserFocus, Moon,
} from "@phosphor-icons/react";

const DATA_URL = (lang) => `/data/examen-${lang}.json`;
const STORAGE_KEY = (lang) => `soyapostol:examen:${lang}`; // local only — never sent to server

// Profiles exposed on the cover. The "adults" profile loads the general
// ten-commandments section; the others append their own state-specific set.
const PROFILES = [
    { id: "adults",         icon: UserFocus,  target: null },
    { id: "married_couples", icon: Heart,     target: "married_couples" },
    { id: "single_adults",   icon: UserCircle, target: "single_adults" },
    { id: "teenagers",       icon: Lightning, target: "teenagers" },
];

// -------- State shape --------
// localStorage saves: { profile, checks: { [sectionId]: { [questionIdx]: true } } }
function loadState(lang) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY(lang));
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}
function saveState(lang, state) {
    try { localStorage.setItem(STORAGE_KEY(lang), JSON.stringify(state)); } catch { /* ignore */ }
}
function clearState(lang) {
    try { localStorage.removeItem(STORAGE_KEY(lang)); } catch { /* ignore */ }
}

export default function Examen() {
    const { lang, t } = useLang();
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");

    const initial = React.useMemo(() => loadState(lang), [lang]);
    const [profile, setProfile] = React.useState(initial?.profile || null);
    const [checks, setChecks] = React.useState(initial?.checks || {});
    const [showSummary, setShowSummary] = React.useState(false);

    // Fetch the dataset (same file for every profile of a given language).
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

    // Rehydrate profile + checks when language flips (each language gets its
    // own localStorage key so translating mid-examen doesn't lose data).
    React.useEffect(() => {
        const s = loadState(lang);
        setProfile(s?.profile || null);
        setChecks(s?.checks || {});
        setShowSummary(false);
    }, [lang]);

    // Persist on every change.
    React.useEffect(() => {
        if (!profile && Object.keys(checks).length === 0) return;
        saveState(lang, { profile, checks });
    }, [lang, profile, checks]);

    const sections = React.useMemo(() => {
        if (!data || !profile) return [];
        const out = [];
        // General commandment-based section for every profile.
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
        // Append state-specific questions for non-adults profiles.
        const selected = PROFILES.find((p) => p.id === profile);
        if (selected?.target) {
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
    }, [data, profile, t]);

    const totalChecked = React.useMemo(
        () => Object.values(checks).reduce((n, s) => n + Object.values(s).filter(Boolean).length, 0),
        [checks],
    );

    const toggleQuestion = (sectionId, qIdx) => {
        setChecks((prev) => {
            const next = { ...prev, [sectionId]: { ...(prev[sectionId] || {}) } };
            if (next[sectionId][qIdx]) delete next[sectionId][qIdx];
            else next[sectionId][qIdx] = true;
            return next;
        });
    };

    const resetAll = () => {
        clearState(lang);
        setChecks({});
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

    // 1) No profile chosen → cover screen with picker.
    if (!profile) {
        return <ProfileCover onPick={setProfile} />;
    }

    // 2) Summary view.
    if (showSummary) {
        return (
            <SummaryView
                sections={sections}
                checks={checks}
                actOfContrition={data.closing?.act_of_contrition}
                profileLabel={t(`examen.profile.${profile}`)}
                onBack={() => setShowSummary(false)}
                onReset={resetAll}
            />
        );
    }

    // 3) Working view — accordion of sections with checkboxes.
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
                    onClick={() => setProfile(null)}
                    data-testid="examen-change-profile"
                    className="ui-sans text-xs uppercase tracking-widest text-stoneMuted hover:text-sangre inline-flex items-center gap-1.5"
                >
                    <ArrowLeft size={14} weight="bold" /> {t("examen.change_profile")}
                </button>
            </div>
            <p className="reading-serif italic text-lg text-stoneMuted mt-2 mb-2">
                {t(`examen.profile.${profile}`)}
            </p>
            <p className="text-sm text-stoneMuted mb-10 flex items-center gap-1.5">
                <Moon size={14} weight="duotone" />
                {t("examen.privacy_notice")}
            </p>

            <SectionsAccordion
                sections={sections}
                checks={checks}
                onToggle={toggleQuestion}
            />

            <div className="sticky bottom-20 md:bottom-6 z-20 mt-10 mb-2 pointer-events-none">
                <div className="surface-card pointer-events-auto flex items-center justify-between gap-3 p-3 sm:p-4 shadow-lg">
                    <div>
                        <p className="ui-sans text-xs uppercase tracking-widest text-stoneMuted">
                            {t("examen.selected_count")}
                        </p>
                        <p className="heading-serif text-2xl leading-none tracking-tight">
                            {totalChecked}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowSummary(true)}
                        disabled={totalChecked === 0}
                        data-testid="examen-see-summary"
                        className="ui-sans inline-flex items-center gap-2 px-4 sm:px-5 py-3 rounded-md text-sm font-semibold text-sand-50 bg-sangre hover:bg-sangre-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <CheckSquareOffset size={16} weight="bold" />
                        {t("examen.see_summary")}
                    </button>
                </div>
            </div>

            <BackToTopButton testId="examen-back-to-top" />
        </div>
    );
}

/* ------------------------------------------------------------------ */

function ProfileCover({ onPick }) {
    const { t } = useLang();
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

            <p className="label-eyebrow mb-3">{t("examen.choose_profile")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROFILES.map(({ id, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onPick(id)}
                        data-testid={`examen-profile-${id}`}
                        className="surface-card p-5 text-left flex items-center gap-4 hover:border-sangre/60 transition-colors"
                    >
                        <div className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-sangre/10 text-sangre"
                             aria-hidden="true">
                            <Icon size={24} weight="duotone" />
                        </div>
                        <div>
                            <p className="heading-serif text-xl leading-tight tracking-tight">
                                {t(`examen.profile.${id}`)}
                            </p>
                            <p className="text-sm text-stoneMuted mt-0.5">
                                {t(`examen.profile_desc.${id}`)}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */

function SectionsAccordion({ sections, checks, onToggle }) {
    // Only one section open at a time keeps the screen focused — especially
    // useful in low-light conditions inside a church.
    const [openId, setOpenId] = React.useState(sections[0]?.id || null);
    return (
        <div className="flex flex-col gap-3" data-testid="examen-sections">
            {sections.map((sec) => {
                const open = openId === sec.id;
                const sectionChecks = checks[sec.id] || {};
                const selected = Object.values(sectionChecks).filter(Boolean).length;
                return (
                    <article
                        key={sec.id}
                        className="surface-card p-0 overflow-hidden"
                        data-testid={`examen-section-${sec.id}`}
                    >
                        <button
                            type="button"
                            onClick={() => setOpenId(open ? null : sec.id)}
                            aria-expanded={open}
                            className="w-full text-left p-5 sm:p-6 flex items-start gap-4"
                        >
                            <div className="flex-1 min-w-0">
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
                            </div>
                            <CaretDown
                                size={18}
                                weight="bold"
                                className="text-stoneFaint transition-transform shrink-0 mt-1"
                                style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
                            />
                        </button>
                        {open && (
                            <div className="px-5 sm:px-6 pb-6">
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
                        )}
                    </article>
                );
            })}
        </div>
    );
}

/* ------------------------------------------------------------------ */

function SummaryView({ sections, checks, actOfContrition, profileLabel, onBack, onReset }) {
    const { t } = useLang();
    const [confirmReset, setConfirmReset] = React.useState(false);

    const groupedSelections = React.useMemo(() => {
        return sections
            .map((sec) => {
                const c = checks[sec.id] || {};
                const questions = sec.questions.filter((_, i) => c[i]);
                return { ...sec, questions };
            })
            .filter((sec) => sec.questions.length > 0);
    }, [sections, checks]);

    const total = groupedSelections.reduce((n, s) => n + s.questions.length, 0);

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

            <p className="label-eyebrow mb-3">{profileLabel}</p>
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
                    {groupedSelections.map((sec) => (
                        <article
                            key={sec.id}
                            className="surface-card p-5 sm:p-6"
                            data-testid={`examen-summary-section-${sec.id}`}
                            style={{ borderLeft: "3px solid #B33A3A" }}
                        >
                            <p className="label-eyebrow mb-2">{sec.eyebrow}</p>
                            <h2 className="heading-serif text-lg sm:text-xl leading-tight tracking-tight mb-4">
                                {sec.title}
                            </h2>
                            <ul className="flex flex-col gap-2">
                                {sec.questions.map((q, i) => (
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

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
                {!confirmReset ? (
                    <button
                        type="button"
                        onClick={() => setConfirmReset(true)}
                        data-testid="examen-clear-btn"
                        className="ui-sans inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold border border-sand-300 text-stone900 hover:border-sangre hover:text-sangre transition-colors"
                    >
                        <TrashSimple size={16} weight="bold" />
                        {t("examen.clear_all")}
                    </button>
                ) : (
                    <div
                        className="surface-card p-4 flex items-center gap-3 flex-1"
                        data-testid="examen-clear-confirm"
                    >
                        <p className="text-sm text-stone900 flex-1">
                            {t("examen.clear_all_confirm")}
                        </p>
                        <button
                            type="button"
                            onClick={onReset}
                            data-testid="examen-clear-confirm-yes"
                            className="ui-sans text-xs uppercase tracking-widest font-semibold px-3 py-2 rounded-md bg-sangre text-sand-50 hover:bg-sangre-hover"
                        >
                            {t("common.yes")}
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmReset(false)}
                            data-testid="examen-clear-confirm-no"
                            className="ui-sans text-xs uppercase tracking-widest text-stoneMuted hover:text-stone900"
                        >
                            {t("common.cancel")}
                        </button>
                    </div>
                )}
            </div>

            <BackToTopButton testId="examen-summary-back-to-top" />
        </div>
    );
}
