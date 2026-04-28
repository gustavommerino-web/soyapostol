import React from "react";
import { useLang } from "@/contexts/LangContext";
import { X, ArrowClockwise, ArrowSquareOut, CircleNotch } from "@phosphor-icons/react";

const USCCB_URL = {
    es: "https://bible.usccb.org/es/lectura-diaria-biblia",
    en: "https://bible.usccb.org/bible/readings",
};

/**
 * Full-screen in-app browser for USCCB daily readings. The site sets
 * `X-Frame-Options: SAMEORIGIN`, so the iframe most likely renders a blank
 * page in production browsers — we surface that case as a graceful fallback
 * with a prominent "open in a new tab" button. While we wait for the first
 * load event, a spinner sits on top of the iframe; if onload doesn't fire
 * within `LOAD_TIMEOUT_MS`, we declare the page blocked and switch the
 * viewport to the fallback panel.
 *
 * Props:
 *   open      bool    — controls visibility (parent owns state)
 *   onClose   fn      — close the overlay
 *   lang      "es"|"en" — picks the right USCCB URL
 */
const LOAD_TIMEOUT_MS = 5000;
// Cross-origin frames that are blocked by X-Frame-Options/CSP often fire
// `load` almost instantly with the browser's "refused to connect" page.
// Treat any `load` event under this threshold as suspect and let the
// timeout decide the final state.
const SUSPECT_LOAD_MS = 600;

export default function UsccbBrowser({ open, onClose, lang }) {
    const { t } = useLang();
    const url = USCCB_URL[lang] || USCCB_URL.es;

    // Bumping the key forces the iframe to remount and reload from scratch
    // (works even when the URL hasn't changed).
    const [reloadKey, setReloadKey] = React.useState(0);
    const [loading, setLoading] = React.useState(true);
    const [blocked, setBlocked] = React.useState(false);
    const startedAtRef = React.useRef(0);

    // Reset transient state on open / reload / language change.
    React.useEffect(() => {
        if (!open) return undefined;
        setLoading(true);
        setBlocked(false);
        startedAtRef.current = Date.now();
        const timer = setTimeout(() => {
            setBlocked(true);
            setLoading(false);
        }, LOAD_TIMEOUT_MS);
        return () => clearTimeout(timer);
    }, [open, reloadKey, lang]);

    // Lock body scroll while the overlay is mounted.
    React.useEffect(() => {
        if (!open) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    // Esc to close.
    React.useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    const onIframeLoad = () => {
        // Suspect-fast loads are almost always X-Frame-Options/CSP error pages
        // — let the timeout fire and switch to the fallback. For real loads
        // we dismiss the spinner immediately.
        const elapsed = Date.now() - startedAtRef.current;
        if (elapsed < SUSPECT_LOAD_MS) return;
        setLoading(false);
    };

    const refresh = () => setReloadKey((k) => k + 1);
    const openExternal = () => window.open(url, "_blank", "noopener,noreferrer");

    return (
        <div
            className="fixed inset-0 z-50 bg-sand-50 flex flex-col"
            data-testid="usccb-browser-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="USCCB"
        >
            {/* Header */}
            <header
                className="border-b border-sand-300 bg-sand-50/95 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0"
                data-testid="usccb-browser-header"
            >
                <button
                    type="button"
                    onClick={onClose}
                    data-testid="usccb-browser-close"
                    aria-label={t("usccb.close")}
                    className="ui-sans inline-flex items-center gap-1.5 px-3 py-2 border border-sand-300 rounded-md text-sm hover:border-sangre transition-colors"
                >
                    <X size={16} weight="bold" />
                    <span className="hidden sm:inline">{t("usccb.close")}</span>
                </button>

                <div className="flex-1 min-w-0 text-center">
                    <p className="label-eyebrow truncate">USCCB</p>
                    <h2 className="heading-serif text-base sm:text-lg tracking-tight truncate"
                        data-testid="usccb-browser-title">
                        {t("usccb.title")}
                    </h2>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={refresh}
                        data-testid="usccb-browser-refresh"
                        aria-label={t("usccb.refresh")}
                        title={t("usccb.refresh")}
                        className="ui-sans inline-flex items-center gap-1.5 px-3 py-2 border border-sand-300 rounded-md text-sm hover:border-sangre transition-colors"
                    >
                        <ArrowClockwise size={16} weight="bold" />
                        <span className="hidden sm:inline">{t("usccb.refresh")}</span>
                    </button>
                    <button
                        type="button"
                        onClick={openExternal}
                        data-testid="usccb-browser-open-external"
                        aria-label={t("usccb.open_external")}
                        title={t("usccb.open_external")}
                        className="ui-sans inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold text-sand-50 bg-sangre hover:bg-sangre-hover transition-colors"
                    >
                        <ArrowSquareOut size={16} weight="bold" />
                        <span className="hidden sm:inline">{t("usccb.open_external")}</span>
                    </button>
                </div>
            </header>

            {/* Body */}
            <div className="flex-1 relative bg-sand-100" data-testid="usccb-browser-body">
                {!blocked && (
                    <iframe
                        key={reloadKey}
                        src={url}
                        title="USCCB"
                        onLoad={onIframeLoad}
                        referrerPolicy="no-referrer"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                        className="absolute inset-0 w-full h-full border-0 bg-sand-50"
                        data-testid="usccb-browser-iframe"
                    />
                )}

                {!blocked && loading && (
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center bg-sand-50/95 backdrop-blur-sm"
                        data-testid="usccb-browser-loading"
                    >
                        <CircleNotch size={36} weight="bold" className="animate-spin text-sangre mb-4" />
                        <p className="ui-sans text-sm text-stoneMuted">{t("usccb.loading")}</p>
                    </div>
                )}

                {blocked && (
                    <BlockedFallback
                        url={url}
                        onRetry={() => { setBlocked(false); refresh(); }}
                        onOpen={openExternal}
                    />
                )}
            </div>
        </div>
    );
}

function BlockedFallback({ url, onRetry, onOpen }) {
    const { t } = useLang();
    return (
        <div
            className="absolute inset-0 flex items-center justify-center px-6"
            data-testid="usccb-browser-blocked"
        >
            <div className="surface-card max-w-md w-full p-7 text-center">
                <p className="label-eyebrow mb-3 text-sangre">{t("usccb.blocked_eyebrow")}</p>
                <h3 className="heading-serif text-2xl sm:text-3xl tracking-tight mb-3">
                    {t("usccb.blocked_title")}
                </h3>
                <p className="reading-serif text-stoneMuted text-base mb-6">
                    {t("usccb.blocked_subtitle")}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                        type="button"
                        onClick={onOpen}
                        data-testid="usccb-browser-blocked-open"
                        className="ui-sans inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md text-sm font-semibold text-sand-50 bg-sangre hover:bg-sangre-hover transition-colors"
                    >
                        <ArrowSquareOut size={16} weight="bold" />
                        {t("usccb.open_external")}
                    </button>
                    <button
                        type="button"
                        onClick={onRetry}
                        data-testid="usccb-browser-blocked-retry"
                        className="ui-sans inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md text-sm border border-sand-300 hover:border-sangre transition-colors"
                    >
                        <ArrowClockwise size={16} weight="bold" />
                        {t("usccb.try_again")}
                    </button>
                </div>
                <p className="ui-sans text-xs text-stoneMuted mt-5 break-all">
                    {url}
                </p>
            </div>
        </div>
    );
}
