import React from "react";
import { useLang } from "@/contexts/LangContext";
import FavoriteButton from "@/components/FavoriteButton";
import { ArrowSquareOut } from "@phosphor-icons/react";

/**
 * Daily Mass readings for English, served by Universalis Publishing Ltd.
 *
 * Universalis exposes a JSONP endpoint:
 *   https://universalis.com/{YYYYMMDD}/jsonpmass.js?callback={fnName}
 * The body is a single function call wrapping a JSON object with HTML
 * fragments for each section. We inject a `<script>` tag, expose a unique
 * global callback, cache the result in localStorage by date, and render
 * the HTML inside our app's reading prose container.
 *
 * Per Universalis' terms, we always include the copyright line and a link
 * back to universalis.com.
 *
 * NOTE: Universalis is English-only. Use this component only when lang="en".
 */

const CACHE_PREFIX = "soyapostol:universalis:";
const CACHE_TTL_DAYS = 7; // safety cap so stale entries don't pile up
const FETCH_TIMEOUT_MS = 8000;

function ymdNumeric(dateStr /* "YYYY-MM-DD" */) {
    return dateStr.replaceAll("-", "");
}

function readCache(date) {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + date);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.data) return null;
        // Soft TTL — if the entry is much older than today's date, drop it.
        if (parsed.savedAt) {
            const ageMs = Date.now() - parsed.savedAt;
            if (ageMs > CACHE_TTL_DAYS * 24 * 60 * 60 * 1000) {
                localStorage.removeItem(CACHE_PREFIX + date);
                return null;
            }
        }
        return parsed.data;
    } catch {
        return null;
    }
}

function writeCache(date, data) {
    try {
        localStorage.setItem(
            CACHE_PREFIX + date,
            JSON.stringify({ savedAt: Date.now(), data })
        );
    } catch {
        // Storage may be full or disabled — non-fatal.
    }
}

function fetchUniversalis(date) {
    return new Promise((resolve, reject) => {
        const cbName = `__universalis_cb_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
        const url = `https://universalis.com/${ymdNumeric(date)}/jsonpmass.js?callback=${cbName}`;

        const script = document.createElement("script");
        script.async = true;
        script.src = url;

        let settled = false;
        const cleanup = () => {
            if (script.parentNode) script.parentNode.removeChild(script);
            try { delete window[cbName]; } catch { window[cbName] = undefined; }
            clearTimeout(timer);
        };

        const finishOk = (data) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(data);
        };
        const finishErr = (err) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(err);
        };

        window[cbName] = (data) => finishOk(data);
        script.onerror = () => finishErr(new Error("network"));

        const timer = setTimeout(() => finishErr(new Error("timeout")), FETCH_TIMEOUT_MS);

        document.head.appendChild(script);
    });
}

export default function UniversalisReadings({ date }) {
    const { t } = useLang();
    const [data, setData] = React.useState(() => readCache(date));
    const [loading, setLoading] = React.useState(!data);
    const [error, setError] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        // Try cache first synchronously (already in initial state); if it hit
        // we don't need to refetch.
        const cached = readCache(date);
        if (cached) {
            setData(cached);
            setLoading(false);
            setError(false);
            return () => { cancelled = true; };
        }
        setData(null);
        setLoading(true);
        setError(false);
        fetchUniversalis(date)
            .then((res) => {
                if (cancelled) return;
                writeCache(date, res);
                setData(res);
                setError(false);
            })
            .catch(() => {
                if (cancelled) return;
                setError(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [date]);

    if (loading) {
        return (
            <p className="text-stoneMuted" data-testid="universalis-loading">
                {t("common.loading")}
            </p>
        );
    }

    if (error || !data) {
        return (
            <div className="surface-card p-5 sm:p-6 mb-8 border-l-4 border-l-sangre"
                 data-testid="universalis-error">
                <p className="reading-serif text-stone900">
                    {t("readings.universalis_unavailable")}
                </p>
            </div>
        );
    }

    return (
        <div data-testid="universalis-readings">
            {data.day && (
                <div className="reading-prose mb-10" data-testid="universalis-day">
                    <div dangerouslySetInnerHTML={{ __html: data.day }} />
                </div>
            )}

            <Section
                idx={0}
                heading={t("readings.first")}
                subheading={data.Mass_R1?.heading}
                source={data.Mass_R1?.source}
                html={data.Mass_R1?.text}
                fallbackTitle={t("readings.first")}
            />
            <Section
                idx={1}
                heading={t("readings.psalm")}
                source={data.Mass_Ps?.source}
                html={data.Mass_Ps?.text}
                fallbackTitle={t("readings.psalm")}
            />
            {data.Mass_R2?.text && (
                <Section
                    idx={2}
                    heading={t("readings.second")}
                    subheading={data.Mass_R2?.heading}
                    source={data.Mass_R2?.source}
                    html={data.Mass_R2.text}
                    fallbackTitle={t("readings.second")}
                />
            )}
            {data.Mass_GA?.text && (
                <Section
                    idx={3}
                    heading={t("readings.gospel_acclamation")}
                    source={data.Mass_GA?.source}
                    html={data.Mass_GA.text}
                    fallbackTitle={t("readings.gospel_acclamation")}
                />
            )}
            <Section
                idx={4}
                heading={t("readings.gospel")}
                subheading={data.Mass_G?.heading}
                source={data.Mass_G?.source}
                html={data.Mass_G?.text}
                fallbackTitle={t("readings.gospel")}
            />

            {/* Required attribution — always render, even if Universalis omits
                the field (it's mandated by their terms). */}
            <p className="text-xs text-stoneMuted mt-12 italic" data-testid="universalis-copyright">
                {data.copyright?.text ? (
                    <span dangerouslySetInnerHTML={{ __html: stripInlineStyles(data.copyright.text) }} />
                ) : (
                    "Copyright \u00a9 Universalis Publishing Ltd. Used with permission."
                )}{" "}
                <a
                    href="https://universalis.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-sangre inline-flex items-center gap-1"
                >
                    universalis.com <ArrowSquareOut size={11} className="inline" />
                </a>
            </p>
        </div>
    );
}

function Section({ idx, heading, subheading, source, html, fallbackTitle }) {
    if (!html) return null;
    const titleForFav = subheading ? `${heading} — ${subheading}` : (heading || fallbackTitle);
    return (
        <article className="mb-14 reading-prose" data-testid={`universalis-section-${idx}`}>
            <div className="flex items-center justify-between mb-4 border-b border-sand-300 pb-2">
                <h2 className="heading-serif text-2xl sm:text-3xl tracking-tight m-0">
                    {heading}
                </h2>
                <FavoriteButton
                    section="readings"
                    title={titleForFav}
                    content={htmlToPlain(html)}
                    source_url="https://universalis.com/mass.html"
                    testId={`universalis-fav-${idx}`}
                />
            </div>
            {source && (
                <p className="ui-sans text-sm text-stoneMuted -mt-1 mb-4">
                    <span dangerouslySetInnerHTML={{ __html: source }} />
                </p>
            )}
            {subheading && (
                <p className="reading-serif italic text-stone900 mb-4">
                    {subheading}
                </p>
            )}
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </article>
    );
}

// Strip inline styles from copyright HTML so it renders in our muted text.
function stripInlineStyles(html) {
    return html.replace(/\sstyle="[^"]*"/gi, "");
}

// Best-effort HTML → plain text for the favorite-button preview.
function htmlToPlain(html) {
    if (typeof html !== "string") return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || "").trim();
}
