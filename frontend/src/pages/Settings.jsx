import React from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import {
    Info,
    Shield,
    EnvelopeSimple,
    ArrowSquareOut,
    HandsPraying,
    WarningOctagon,
    Trash,
    X,
    SpinnerGap,
} from "@phosphor-icons/react";

const PRIVACY_POLICY_URL = "/privacy-policy.html";
const SUPPORT_EMAIL     = "gustavommerino@gmail.com";
const APP_VERSION       = "1.0.0";
const APP_DOMAIN        = "soyapostol.org";
const APP_LOCATION      = "Houston, TX, US";

// Domains that appear in the Credits / Fair-Use blocks and must be rendered
// as clickable external links. Every match (case-insensitive) is wrapped in
// an <a target="_blank">.
const SOURCE_LINKS = [
    { domain: "evangelizo.org",   url: "https://evangelizo.org" },
    { domain: "evangeli.net",     url: "https://evangeli.net" },
    { domain: "divineoffice.org", url: "https://divineoffice.org" },
    { domain: "ibreviary.com",    url: "https://www.ibreviary.com" },
    { domain: "vaticannews.va",   url: "https://www.vaticannews.va" },
    { domain: "aciprensa.com",    url: "https://www.aciprensa.com" },
    { domain: "ewtnnews.com",     url: "https://www.ewtnnews.com" },
];

// Words that must render in bold liturgical purple inside the "Quiénes Somos"
// body. Order matters only in that longer matches should be tried first so a
// substring doesn't steal a larger token.
const ES_EMPHASIS = [
    "Corazones A La Obra",
    "Señor Jesucristo",
    "Virgen María",
    "¡Soy Apóstol!",
    "tiempo",
    "talento",
    "tesoro",
];
const EN_EMPHASIS = [
    "Corazones A La Obra",
    "Lord Jesus Christ",
    "Virgin Mary",
    "I Am an Apostle!",
    "time",
    "talent",
    "treasure",
];

// Emphasise whole-word matches + embed the soyapostol.org link. Returns an
// array of React nodes.
function decorateParagraph(text, emphasisWords) {
    // Escape + longest-first so "Corazones A La Obra" wins over sub-tokens.
    const sorted = [...emphasisWords].sort((a, b) => b.length - a.length);
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const emphRe = new RegExp(`(${sorted.map(esc).join("|")})`, "g");
    const linkRe = /(soyapostol\.org)/g;

    // First split by soyapostol.org so the link is independent of emphasis.
    const linkParts = text.split(linkRe);
    const nodes = [];
    linkParts.forEach((chunk, li) => {
        if (chunk === APP_DOMAIN) {
            nodes.push(
                <a
                    key={`link-${li}`}
                    href={`https://${APP_DOMAIN}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="settings-soyapostol-link"
                    className="text-purple-700 font-semibold hover:text-purple-900 underline decoration-purple-300 underline-offset-4 transition-colors"
                >
                    {APP_DOMAIN}
                </a>,
            );
            return;
        }
        // For the non-link chunk, split by emphasis words.
        const parts = chunk.split(emphRe);
        parts.forEach((p, pi) => {
            if (!p) return;
            if (sorted.includes(p)) {
                nodes.push(
                    <strong
                        key={`em-${li}-${pi}`}
                        className="font-semibold text-purple-700"
                    >
                        {p}
                    </strong>,
                );
            } else {
                nodes.push(<React.Fragment key={`t-${li}-${pi}`}>{p}</React.Fragment>);
            }
        });
    });
    return nodes;
}

// Render a paragraph turning every known source-domain occurrence into a
// clickable external link. Used for the Credits + Fair-Use blocks.
function linkifySources(text) {
    if (!text) return null;
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = SOURCE_LINKS.map((s) => escape(s.domain)).join("|");
    if (!pattern) return text;
    const re = new RegExp(`(${pattern})`, "gi");
    const parts = text.split(re);
    return parts.map((p, i) => {
        const match = SOURCE_LINKS.find(
            (s) => s.domain.toLowerCase() === p.toLowerCase(),
        );
        if (!match) return <React.Fragment key={i}>{p}</React.Fragment>;
        return (
            <a
                key={i}
                href={match.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`settings-source-link-${match.domain}`}
                className="inline-flex items-baseline gap-1.5 text-purple-700 hover:text-purple-900 underline decoration-purple-300 underline-offset-4 transition-colors"
            >
                <img
                    src={`https://www.google.com/s2/favicons?domain=${match.domain}&sz=32`}
                    alt=""
                    width="16"
                    height="16"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    aria-hidden="true"
                    className="self-center w-4 h-4 rounded-sm shrink-0"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                <span>{p}</span>
            </a>
        );
    });
}

export default function Settings() {
    const { t, lang } = useLang();
    const { user, deleteAccount } = useAuth();
    const navigate = useNavigate();

    const emphasis = lang === "es" ? ES_EMPHASIS : EN_EMPHASIS;
    const paragraphs = [
        t("settings.about.p1"),
        t("settings.about.p2"),
        t("settings.about.p3_heading"),   // rendered as subheading below
        t("settings.about.p4"),
    ];

    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [confirmEmail, setConfirmEmail] = React.useState("");
    const [deleting, setDeleting] = React.useState(false);
    const [deleteError, setDeleteError] = React.useState("");

    const onContactSupport = () => {
        const subject = encodeURIComponent(t("settings.support.subject"));
        const body    = encodeURIComponent(t("settings.support.body"));
        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    };

    const onOpenPrivacy = () => {
        window.open(PRIVACY_POLICY_URL, "_blank", "noopener,noreferrer");
    };

    const openDeleteModal = () => {
        setConfirmEmail("");
        setDeleteError("");
        setConfirmOpen(true);
    };

    const closeDeleteModal = () => {
        if (deleting) return;
        setConfirmOpen(false);
    };

    const onConfirmDelete = async (e) => {
        e?.preventDefault();
        if (!user || !user.email) return;
        if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
            setDeleteError(t("settings.danger.email_mismatch"));
            return;
        }
        setDeleting(true);
        setDeleteError("");
        const ok = await deleteAccount(confirmEmail.trim().toLowerCase(), lang);
        if (!ok) {
            setDeleting(false);
            setDeleteError(t("settings.danger.error"));
            return;
        }
        // Clear any local state that referenced this user.
        try {
            ["soyapostol:examen:es", "soyapostol:examen:en"].forEach(
                (k) => localStorage.removeItem(k),
            );
        } catch { /* ignore */ }
        navigate("/account-deleted", { replace: true });
    };

    return (
        <div data-testid="settings-page" className="max-w-[720px] mx-auto">
            <p className="label-eyebrow mb-3">{t("settings.eyebrow")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-3">
                {t("settings.title")}
            </h1>
            <p className="text-stoneMuted mb-10">{t("settings.subtitle")}</p>

            {/* ============================================================ */}
            {/* Sobre la App — Quiénes Somos                                 */}
            {/* ============================================================ */}
            <section className="mb-12" data-testid="settings-about">
                <header className="flex items-center gap-3 mb-5">
                    <span
                        className="shrink-0 w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center"
                        aria-hidden="true"
                    >
                        <Info size={20} weight="duotone" />
                    </span>
                    <div>
                        <p className="label-eyebrow text-purple-700">
                            {t("settings.about.eyebrow")}
                        </p>
                        <h2 className="heading-serif text-2xl sm:text-3xl tracking-tight m-0">
                            {t("settings.about.title")}
                        </h2>
                    </div>
                </header>

                <article className="surface-card p-6 sm:p-8">
                    <p
                        className="reading-serif text-base sm:text-lg leading-[1.85] text-stone900 mb-5"
                        data-testid="settings-about-p1"
                    >
                        {decorateParagraph(paragraphs[0], emphasis)}
                    </p>
                    <p
                        className="reading-serif text-base sm:text-lg leading-[1.85] text-stone900 mb-8"
                        data-testid="settings-about-p2"
                    >
                        {decorateParagraph(paragraphs[1], emphasis)}
                    </p>

                    <h3
                        className="heading-serif text-xl tracking-tight mb-3 flex items-center gap-2"
                        data-testid="settings-about-domain-heading"
                    >
                        <HandsPraying size={18} weight="duotone" className="text-purple-700" />
                        <span>{decorateParagraph(paragraphs[2], emphasis)}</span>
                    </h3>
                    <p
                        className="reading-serif text-base sm:text-lg leading-[1.85] text-stone900 m-0"
                        data-testid="settings-about-p4"
                    >
                        {decorateParagraph(paragraphs[3], emphasis)}
                    </p>
                </article>

                {/* ----- Créditos / Credits ----- */}
                <article
                    className="surface-card p-6 sm:p-8 mt-6"
                    data-testid="settings-credits"
                >
                    <h3 className="heading-serif text-xl tracking-tight mb-3 flex items-center gap-2">
                        <HandsPraying size={18} weight="duotone" className="text-purple-700" />
                        <span>{t("settings.credits.title")}</span>
                    </h3>
                    <p
                        className="reading-serif text-base sm:text-lg leading-[1.85] text-stone900 mb-4"
                        data-testid="settings-credits-intro"
                    >
                        {linkifySources(t("settings.credits.intro"))}
                    </p>
                    <ul
                        className="reading-serif text-base sm:text-lg leading-[1.85] text-stone900 mb-4 list-disc pl-6 space-y-1.5"
                        data-testid="settings-credits-list"
                    >
                        <li>
                            <strong className="font-semibold text-stone900">
                                {t("settings.credits.row_readings_label")}
                            </strong>
                            {" "}
                            {linkifySources(t("settings.credits.row_readings_value"))}
                        </li>
                        <li>
                            <strong className="font-semibold text-stone900">
                                {t("settings.credits.row_liturgy_label")}
                            </strong>
                            {" "}
                            {linkifySources(t("settings.credits.row_liturgy_value"))}
                        </li>
                        <li>
                            <strong className="font-semibold text-stone900">
                                {t("settings.credits.row_news_label")}
                            </strong>
                            {" "}
                            {linkifySources(t("settings.credits.row_news_value"))}
                        </li>
                    </ul>
                    <p
                        className="reading-serif text-base sm:text-lg leading-[1.85] text-stone900 mb-4"
                        data-testid="settings-credits-lev"
                    >
                        {linkifySources(t("settings.credits.lev"))}
                    </p>
                    <p
                        className="reading-serif text-base sm:text-lg leading-[1.85] text-stoneMuted italic m-0"
                        data-testid="settings-credits-disclaimer"
                    >
                        {t("settings.credits.disclaimer")}
                    </p>
                </article>

                {/* ----- Uso Justo / Fair Use ----- */}
                <article
                    className="surface-card p-6 sm:p-8 mt-6"
                    data-testid="settings-fair-use"
                >
                    <h3 className="heading-serif text-xl tracking-tight mb-3 flex items-center gap-2">
                        <Shield size={18} weight="duotone" className="text-purple-700" />
                        <span>{t("settings.fair_use.title")}</span>
                    </h3>
                    <p
                        className="reading-serif text-base sm:text-lg leading-[1.85] text-stone900 mb-4"
                        data-testid="settings-fair-use-p1"
                    >
                        {linkifySources(t("settings.fair_use.p1"))}
                    </p>
                    <p
                        className="reading-serif text-base sm:text-lg leading-[1.85] text-stone900 m-0"
                        data-testid="settings-fair-use-p2"
                    >
                        {linkifySources(t("settings.fair_use.p2"))}
                    </p>
                </article>
            </section>

            {/* ============================================================ */}
            {/* Legal                                                         */}
            {/* ============================================================ */}
            <section className="mb-12" data-testid="settings-legal">
                <header className="flex items-center gap-3 mb-5">
                    <span
                        className="shrink-0 w-10 h-10 rounded-full bg-sand-200 text-stoneMuted flex items-center justify-center"
                        aria-hidden="true"
                    >
                        <Shield size={20} weight="duotone" />
                    </span>
                    <div>
                        <p className="label-eyebrow">{t("settings.legal.eyebrow")}</p>
                        <h2 className="heading-serif text-2xl sm:text-3xl tracking-tight m-0">
                            {t("settings.legal.title")}
                        </h2>
                    </div>
                </header>

                <button
                    type="button"
                    onClick={onOpenPrivacy}
                    data-testid="settings-privacy-btn"
                    className="w-full surface-card p-5 text-left flex items-center justify-between gap-4 hover:border-purple-400 transition-colors"
                >
                    <div className="min-w-0">
                        <p className="ui-sans font-semibold text-stone900 mb-0.5">
                            {t("settings.legal.privacy_title")}
                        </p>
                        <p className="text-sm text-stoneMuted m-0">
                            {t("settings.legal.privacy_hint")}
                        </p>
                    </div>
                    <ArrowSquareOut
                        size={20}
                        weight="duotone"
                        className="shrink-0 text-stoneFaint"
                        aria-hidden="true"
                    />
                </button>
            </section>

            {/* ============================================================ */}
            {/* Soporte                                                       */}
            {/* ============================================================ */}
            <section className="mb-12" data-testid="settings-support">
                <header className="flex items-center gap-3 mb-5">
                    <span
                        className="shrink-0 w-10 h-10 rounded-full bg-sangre/10 text-sangre flex items-center justify-center"
                        aria-hidden="true"
                    >
                        <EnvelopeSimple size={20} weight="duotone" />
                    </span>
                    <div>
                        <p className="label-eyebrow text-sangre">
                            {t("settings.support.eyebrow")}
                        </p>
                        <h2 className="heading-serif text-2xl sm:text-3xl tracking-tight m-0">
                            {t("settings.support.title")}
                        </h2>
                    </div>
                </header>

                <button
                    type="button"
                    onClick={onContactSupport}
                    data-testid="settings-support-btn"
                    className="w-full surface-card p-5 text-left flex items-center justify-between gap-4 hover:border-sangre transition-colors"
                >
                    <div className="min-w-0">
                        <p className="ui-sans font-semibold text-stone900 mb-0.5">
                            {t("settings.support.cta")}
                        </p>
                        <p className="text-sm text-stoneMuted m-0 truncate">
                            {SUPPORT_EMAIL}
                        </p>
                    </div>
                    <EnvelopeSimple
                        size={20}
                        weight="duotone"
                        className="shrink-0 text-sangre"
                        aria-hidden="true"
                    />
                </button>
            </section>

            {/* ============================================================ */}
            {/* Danger zone — account deletion                               */}
            {/* ============================================================ */}
            {user && user.email && (
                <section className="mb-12" data-testid="settings-danger">
                    <header className="flex items-center gap-3 mb-5">
                        <span
                            className="shrink-0 w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center"
                            aria-hidden="true"
                        >
                            <WarningOctagon size={20} weight="duotone" />
                        </span>
                        <div>
                            <p className="label-eyebrow text-red-700">
                                {t("settings.danger.eyebrow")}
                            </p>
                            <h2 className="heading-serif text-2xl sm:text-3xl tracking-tight m-0">
                                {t("settings.danger.title")}
                            </h2>
                        </div>
                    </header>

                    <article
                        className="border border-red-200 bg-red-50/50 rounded-md p-5 sm:p-6"
                        data-testid="settings-danger-card"
                    >
                        <p className="ui-sans text-sm leading-relaxed text-stone900 mb-4">
                            {t("settings.danger.body")}
                        </p>
                        <ul className="ui-sans text-sm text-stone900 list-disc pl-5 space-y-1 mb-5">
                            <li>{t("settings.danger.list_user")}</li>
                            <li>{t("settings.danger.list_favs")}</li>
                            <li>{t("settings.danger.list_sessions")}</li>
                        </ul>
                        <button
                            type="button"
                            onClick={openDeleteModal}
                            data-testid="settings-delete-account-btn"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white ui-sans font-semibold rounded-md transition-colors"
                        >
                            <Trash size={16} weight="bold" />
                            {t("settings.danger.cta")}
                        </button>
                    </article>
                </section>
            )}

            {/* Confirmation modal */}
            {confirmOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-stone900/60 backdrop-blur-sm"
                    onClick={closeDeleteModal}
                    data-testid="delete-account-modal-backdrop"
                >
                    <form
                        className="w-full max-w-md bg-white rounded-lg shadow-xl border border-red-200 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={onConfirmDelete}
                        data-testid="delete-account-modal"
                    >
                        <header className="flex items-start gap-3 p-5 border-b border-sand-300">
                            <span
                                className="shrink-0 w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center mt-0.5"
                                aria-hidden="true"
                            >
                                <WarningOctagon size={18} weight="duotone" />
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="label-eyebrow text-red-700 mb-1">
                                    {t("settings.danger.modal.eyebrow")}
                                </p>
                                <h3 className="heading-serif text-xl tracking-tight m-0">
                                    {t("settings.danger.modal.title")}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                disabled={deleting}
                                aria-label="Close"
                                data-testid="delete-account-modal-close"
                                className="text-stoneFaint hover:text-stone900 disabled:opacity-50"
                            >
                                <X size={18} weight="bold" />
                            </button>
                        </header>

                        <div className="p-5">
                            <p className="ui-sans text-sm leading-relaxed text-stone900 mb-4">
                                {t("settings.danger.modal.body")}
                            </p>
                            <label className="block ui-sans text-xs font-semibold uppercase tracking-wider text-stoneMuted mb-2">
                                {t("settings.danger.modal.email_label", { email: user.email })}
                            </label>
                            <input
                                type="email"
                                inputMode="email"
                                autoComplete="off"
                                spellCheck={false}
                                value={confirmEmail}
                                onChange={(e) => setConfirmEmail(e.target.value)}
                                placeholder={user.email}
                                data-testid="delete-account-email-input"
                                className="w-full px-3 py-2.5 border border-sand-300 rounded-md focus:outline-none focus:border-red-700 ui-sans text-sm"
                                disabled={deleting}
                                autoFocus
                            />
                            {deleteError && (
                                <p
                                    className="mt-3 ui-sans text-sm text-red-700"
                                    data-testid="delete-account-error"
                                    role="alert"
                                >
                                    {deleteError}
                                </p>
                            )}
                        </div>

                        <footer className="flex items-center justify-end gap-3 p-5 bg-sand-100 border-t border-sand-300">
                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                disabled={deleting}
                                data-testid="delete-account-cancel-btn"
                                className="px-4 py-2 ui-sans font-semibold text-stoneMuted hover:text-stone900 disabled:opacity-50"
                            >
                                {t("settings.danger.modal.cancel")}
                            </button>
                            <button
                                type="submit"
                                disabled={deleting || !confirmEmail.trim()}
                                data-testid="delete-account-confirm-btn"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-800 text-white ui-sans font-semibold rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {deleting && <SpinnerGap size={14} weight="bold" className="animate-spin" />}
                                {deleting
                                    ? t("settings.danger.modal.deleting")
                                    : t("settings.danger.modal.confirm")}
                            </button>
                        </footer>
                    </form>
                </div>
            )}

            {/* ============================================================ */}
            {/* Footer                                                        */}
            {/* ============================================================ */}
            <footer
                className="mt-16 pt-8 border-t border-sand-300 text-xs text-stoneFaint text-center"
                data-testid="settings-footer"
            >
                {t("settings.footer.version", { v: APP_VERSION })} · {APP_DOMAIN} · {APP_LOCATION}
            </footer>
        </div>
    );
}
