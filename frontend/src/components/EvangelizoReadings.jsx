import React from "react";
import { useLang } from "@/contexts/LangContext";
import FavoriteButton from "@/components/FavoriteButton";
import { ArrowSquareOut } from "@phosphor-icons/react";

/**
 * Daily Mass readings served by Evangelizo (the team behind
 * evangeliodeldia.org). The site's Angular front-end fetches its data from a
 * public JSON API which we hit directly — same endpoint, no scraping.
 *
 *   Spanish: https://publication.evangelizo.ws/SP/days/{YYYY-MM-DD}
 *   English: https://publication.evangelizo.ws/AM/days/{YYYY-MM-DD}  (American English)
 *
 * The response includes readings, psalm (with chorus), gospel and a daily
 * commentary. Per Evangelizo's terms we surface the attribution + link.
 */

const LANG_CODE = { es: "SP", en: "AM" };
const SITE_URL = {
    es: "https://evangeliodeldia.org/",
    en: "https://evangeliodeldia.org/am/",
};
const ENDPOINT = (date, lang) =>
    `https://publication.evangelizo.ws/${LANG_CODE[lang] || "SP"}/days/${date}`;
const CACHE_PREFIX = "soyapostol:evangelizo:";
const CACHE_TTL_DAYS = 7;
const FETCH_TIMEOUT_MS = 9000;

function readCache(date, lang) {
    try {
        const raw = localStorage.getItem(`${CACHE_PREFIX}${lang}:${date}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.data) return null;
        if (parsed.savedAt && Date.now() - parsed.savedAt > CACHE_TTL_DAYS * 86400000) {
            localStorage.removeItem(`${CACHE_PREFIX}${lang}:${date}`);
            return null;
        }
        return parsed.data;
    } catch {
        return null;
    }
}

function writeCache(date, lang, data) {
    try {
        localStorage.setItem(
            `${CACHE_PREFIX}${lang}:${date}`,
            JSON.stringify({ savedAt: Date.now(), data }),
        );
    } catch { /* storage full or disabled */ }
}

async function fetchEvangelizo(date, lang) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(ENDPOINT(date, lang), {
            signal: ctrl.signal,
            headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`http ${res.status}`);
        const json = await res.json();
        return json?.data || null;
    } finally {
        clearTimeout(timer);
    }
}

// Verse markers like "[[Ac 12,24]]" sit inline before each verse — strip
// them for clean reading prose. Each marker is replaced with a paragraph
// boundary so verses render as separate paragraphs.
function cleanVerseText(text) {
    if (!text) return [];
    // Normalize line endings.
    const normalized = text.replace(/\r\n/g, "\n").trim();
    // Split on the bracket markers, keeping verse content.
    const parts = normalized.split(/\[\[[^\]]+\]\]/g)
        .map((p) => p.trim())
        .filter(Boolean);
    return parts;
}

// Psalms are split by the chorus refrain into stanzas. We split on blank
// lines to preserve the source's stanza breaks.
function splitPsalmStanzas(text) {
    if (!text) return [];
    const cleaned = text.replace(/\[\[[^\]]+\]\]/g, "").replace(/\r\n/g, "\n");
    return cleaned.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
}

export default function EvangelizoReadings({ date }) {
    const { lang, t } = useLang();
    const [data, setData] = React.useState(() => readCache(date, lang));
    const [loading, setLoading] = React.useState(!data);
    const [error, setError] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        const cached = readCache(date, lang);
        if (cached) {
            setData(cached);
            setLoading(false);
            setError(false);
            return () => { cancelled = true; };
        }
        setData(null);
        setLoading(true);
        setError(false);
        fetchEvangelizo(date, lang)
            .then((res) => {
                if (cancelled) return;
                if (!res) { setError(true); return; }
                writeCache(date, lang, res);
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
    }, [date, lang]);

    if (loading) {
        return (
            <p className="text-stoneMuted" data-testid="evangelizo-loading">
                {t("common.loading")}
            </p>
        );
    }

    if (error || !data) {
        return (
            <div className="surface-card p-5 sm:p-6 mb-8 border-l-4 border-l-sangre"
                 data-testid="evangelizo-error">
                <p className="reading-serif text-stone900">
                    {t("readings.universalis_unavailable")}
                </p>
            </div>
        );
    }

    const readings = Array.isArray(data.readings) ? data.readings : [];
    const reading = readings.find((r) => r.type === "reading");
    const reading2 = readings.find((r) => r.type === "reading2");
    const psalm = readings.find((r) => r.type === "psalm");
    const gospel = readings.find((r) => r.type === "gospel");
    const commentary = data.commentary;

    return (
        <div data-testid="evangelizo-readings">
            {reading && (
                <ReadingSection
                    idx={0}
                    label={t("readings.first")}
                    item={reading}
                    testIdPrefix="evangelizo-r1"
                />
            )}
            {psalm && (
                <PsalmSection idx={1} label={t("readings.psalm")} item={psalm} />
            )}
            {reading2 && (
                <ReadingSection
                    idx={2}
                    label={t("readings.second")}
                    item={reading2}
                    testIdPrefix="evangelizo-r2"
                />
            )}
            {gospel && (
                <ReadingSection
                    idx={3}
                    label={t("readings.gospel")}
                    item={gospel}
                    testIdPrefix="evangelizo-g"
                />
            )}

            {commentary && commentary.description && (
                <CommentarySection commentary={commentary} />
            )}

            <p className="text-xs text-stoneMuted mt-12 italic" data-testid="evangelizo-copyright">
                Copyright © Evangelizo · Used with permission.{" "}
                <a
                    href={SITE_URL[lang] || SITE_URL.es}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-sangre inline-flex items-center gap-1"
                >
                    evangeliodeldia.org <ArrowSquareOut size={11} className="inline" />
                </a>
            </p>
        </div>
    );
}

function ReadingSection({ idx, label, item, testIdPrefix }) {
    const paragraphs = cleanVerseText(item.text);
    const reference = item.reference_displayed
        ? `${item.book?.short_title || item.book?.code || ""} ${item.reference_displayed}`.trim()
        : (item.book?.full_title || "");
    return (
        <article className="mb-14 reading-prose" data-testid={`${testIdPrefix}`}>
            <div className="flex items-center justify-between mb-4 border-b border-sand-300 pb-2">
                <h2 className="heading-serif text-2xl sm:text-3xl tracking-tight m-0">{label}</h2>
                <FavoriteButton
                    section="readings"
                    title={`${label} — ${reference}`}
                    content={paragraphs.join("\n\n")}
                    source_url="https://evangeliodeldia.org/"
                    testId={`fav-evangelizo-${idx}`}
                />
            </div>
            {item.title && (
                <p className="ui-sans text-sm text-stoneMuted -mt-1 mb-1">{item.title}</p>
            )}
            {reference && (
                <p className="reading-serif italic text-stoneMuted mb-4">{reference}</p>
            )}
            {item.before_reading && (
                <p className="reading-serif italic text-stone900 mb-4">{item.before_reading}</p>
            )}
            {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
            ))}
        </article>
    );
}

function PsalmSection({ label, item }) {
    const stanzas = splitPsalmStanzas(item.text);
    const reference = item.reference_displayed
        ? `${item.book?.short_title || ""} ${item.reference_displayed}`.trim()
        : "";
    return (
        <article className="mb-14 reading-prose" data-testid="evangelizo-psalm">
            <div className="flex items-center justify-between mb-4 border-b border-sand-300 pb-2">
                <h2 className="heading-serif text-2xl sm:text-3xl tracking-tight m-0">{label}</h2>
                <FavoriteButton
                    section="readings"
                    title={`${label} — ${reference}`}
                    content={stanzas.join("\n\n")}
                    source_url="https://evangeliodeldia.org/"
                    testId="fav-evangelizo-psalm"
                />
            </div>
            {reference && (
                <p className="reading-serif italic text-stoneMuted mb-4">{reference}</p>
            )}
            {item.chorus && (
                <p className="reading-serif italic text-stone900 mb-4 font-semibold">
                    R. {item.chorus}
                </p>
            )}
            {stanzas.map((stanza, i) => (
                <React.Fragment key={i}>
                    {stanza.split("\n").map((line, j) => (
                        <p key={j} className="my-1">{line}</p>
                    ))}
                    {item.chorus && (
                        <p className="reading-serif italic text-stone900 my-4 font-semibold">
                            R. {item.chorus}
                        </p>
                    )}
                </React.Fragment>
            ))}
        </article>
    );
}

function CommentarySection({ commentary }) {
    const { t } = useLang();
    const paragraphs = (commentary.description || "")
        .replace(/\r\n/g, "\n")
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
    // `author` is sometimes an object {name, short_description} and sometimes
    // a plain string — normalize both shapes so React never sees an object.
    let authorName = "";
    let authorDescription = "";
    if (commentary.author && typeof commentary.author === "object") {
        authorName = commentary.author.name || "";
        authorDescription = commentary.author.short_description || "";
    } else if (typeof commentary.author === "string") {
        authorName = commentary.author;
    }
    return (
        <section className="mt-16 mb-12" data-testid="evangelizo-commentary">
            <p className="label-eyebrow mb-3">{t("readings.eod_eyebrow")}</p>
            <h2 className="heading-serif text-2xl sm:text-3xl tracking-tight mb-5">
                {commentary.title || t("readings.eod_title")}
            </h2>
            <article className="surface-card p-6 sm:p-7 reading-prose text-justify">
                {authorName && (
                    <p className="heading-serif text-lg sm:text-xl tracking-tight m-0 mb-1">
                        {authorName}
                    </p>
                )}
                {authorDescription && (
                    <p className="text-sm text-stoneMuted m-0 mb-1">{authorDescription}</p>
                )}
                {commentary.source && typeof commentary.source === "string" && (
                    <p className="text-sm text-stoneMuted italic m-0 mb-5">{commentary.source}</p>
                )}
                {paragraphs.map((p, i) => (
                    <p key={i} className="m-0 mb-4 last:mb-0">{p}</p>
                ))}
            </article>
        </section>
    );
}
