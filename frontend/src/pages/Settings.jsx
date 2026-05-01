import React from "react";
import { useLang } from "@/contexts/LangContext";
import {
    Info,
    Shield,
    EnvelopeSimple,
    ArrowSquareOut,
    HandsPraying,
} from "@phosphor-icons/react";

const PRIVACY_POLICY_URL = "#";      // Termly URL — replace when available
const SUPPORT_EMAIL     = "gustavommerino@gmail.com";
const APP_VERSION       = "1.0.0";
const APP_DOMAIN        = "soyapostol.org";
const APP_LOCATION      = "Houston, TX, US";

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

export default function Settings() {
    const { t, lang } = useLang();

    const emphasis = lang === "es" ? ES_EMPHASIS : EN_EMPHASIS;
    const paragraphs = [
        t("settings.about.p1"),
        t("settings.about.p2"),
        t("settings.about.p3_heading"),   // rendered as subheading below
        t("settings.about.p4"),
    ];

    const onContactSupport = () => {
        const subject = encodeURIComponent(t("settings.support.subject"));
        const body    = encodeURIComponent(t("settings.support.body"));
        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    };

    const onOpenPrivacy = () => {
        if (PRIVACY_POLICY_URL === "#") return;
        window.open(PRIVACY_POLICY_URL, "_blank", "noopener,noreferrer");
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
                    disabled={PRIVACY_POLICY_URL === "#"}
                    data-testid="settings-privacy-btn"
                    className="w-full surface-card p-5 text-left flex items-center justify-between gap-4 disabled:cursor-not-allowed disabled:opacity-60 hover:border-purple-400 transition-colors"
                >
                    <div className="min-w-0">
                        <p className="ui-sans font-semibold text-stone900 mb-0.5">
                            {t("settings.legal.privacy_title")}
                        </p>
                        <p className="text-sm text-stoneMuted m-0">
                            {PRIVACY_POLICY_URL === "#"
                                ? t("settings.legal.privacy_pending")
                                : t("settings.legal.privacy_hint")}
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
