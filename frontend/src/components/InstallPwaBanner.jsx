import React from "react";
import { useLang } from "@/contexts/LangContext";
import { DeviceMobile, X, DownloadSimple, ShareNetwork } from "@phosphor-icons/react";

const DISMISSED_KEY = "soyapostol:pwa-install-dismissed";

/**
 * Install prompt banner shown on the Dashboard.
 *
 * Chromium browsers fire `beforeinstallprompt` when the PWA criteria are met
 * — we capture it and surface a native "Install" button. iOS Safari has no
 * such event, so we fall back to a short instructional card that only shows
 * when the app is not yet running standalone.
 *
 * Users can dismiss the banner; we remember that in localStorage for 14 days
 * so we don't nag on every dashboard visit.
 */
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function isStandalone() {
    if (typeof window === "undefined") return false;
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
    return !!window.navigator.standalone; // iOS Safari
}

function isIos() {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function readDismissed() {
    try {
        const raw = localStorage.getItem(DISMISSED_KEY);
        if (!raw) return false;
        const ts = parseInt(raw, 10);
        if (!Number.isFinite(ts)) return false;
        return Date.now() - ts < DISMISS_TTL_MS;
    } catch { return false; }
}

function writeDismissed() {
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* ignore */ }
}

export default function InstallPwaBanner() {
    const { lang, t } = useLang();
    const [deferredPrompt, setDeferredPrompt] = React.useState(null);
    const [dismissed, setDismissed] = React.useState(() => readDismissed());
    const [standalone, setStandalone] = React.useState(() => isStandalone());
    const ios = React.useMemo(() => isIos(), []);

    React.useEffect(() => {
        const onBefore = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        const onInstalled = () => {
            setDeferredPrompt(null);
            setStandalone(true);
        };
        window.addEventListener("beforeinstallprompt", onBefore);
        window.addEventListener("appinstalled", onInstalled);
        return () => {
            window.removeEventListener("beforeinstallprompt", onBefore);
            window.removeEventListener("appinstalled", onInstalled);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        try {
            deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;
            if (choice?.outcome === "accepted") {
                setDeferredPrompt(null);
            } else {
                // User declined — back off for the dismissal window so we
                // don't keep asking.
                writeDismissed();
                setDismissed(true);
            }
        } catch { /* user cancelled */ }
    };

    const handleDismiss = () => {
        writeDismissed();
        setDismissed(true);
    };

    // Already installed → show nothing.
    if (standalone) return null;
    // User dismissed recently → show nothing.
    if (dismissed) return null;

    const canNativeInstall = !!deferredPrompt;

    // Nothing to show on non-iOS, non-Chromium browsers where the event
    // hasn't fired and we can't guide the install.
    if (!canNativeInstall && !ios) return null;

    return (
        <section
            className="surface-card p-5 sm:p-6 mb-10 flex items-center gap-4 sm:gap-5 relative overflow-hidden"
            data-testid="pwa-install-banner"
            style={{ borderLeft: "3px solid #B33A3A" }}
        >
            <div
                className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-sangre/10 text-sangre"
                aria-hidden="true"
            >
                <DeviceMobile size={24} weight="duotone" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="label-eyebrow mb-1">{t("pwa.eyebrow")}</p>
                <h3 className="heading-serif text-xl sm:text-2xl tracking-tight leading-tight mb-1"
                    data-testid="pwa-install-title">
                    {t("pwa.title")}
                </h3>
                <p className="text-sm text-stoneMuted leading-relaxed">
                    {canNativeInstall
                        ? t("pwa.subtitle_native")
                        : t("pwa.subtitle_ios")}
                </p>

                {!canNativeInstall && ios && (
                    <p className="text-sm text-stone900 mt-3 flex items-center gap-1.5 flex-wrap">
                        <ShareNetwork size={16} weight="regular" className="inline shrink-0" />
                        <span>{t("pwa.ios_step_1")}</span>
                        <span className="text-stoneFaint">·</span>
                        <span>{t("pwa.ios_step_2")}</span>
                    </p>
                )}
            </div>
            <div className="shrink-0 flex items-center gap-2">
                {canNativeInstall && (
                    <button
                        type="button"
                        onClick={handleInstall}
                        data-testid="pwa-install-btn"
                        className="ui-sans inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-sand-50 bg-sangre hover:bg-sangre-hover transition-colors"
                    >
                        <DownloadSimple size={16} weight="bold" />
                        <span className="hidden sm:inline">{t("pwa.install_button")}</span>
                        <span className="sm:hidden">{t("pwa.install_button_short")}</span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleDismiss}
                    data-testid="pwa-install-dismiss"
                    aria-label={t("pwa.dismiss")}
                    title={t("pwa.dismiss")}
                    className="text-stoneFaint hover:text-stone900 p-1.5 rounded-md hover:bg-sand-200 transition-colors"
                >
                    <X size={16} weight="bold" />
                </button>
            </div>
            {/* unused lang prop keeps rerender on language change */}
            <span className="sr-only" data-lang={lang} />
        </section>
    );
}
