import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { loadBible } from "@/pages/Bible";
import { BookOpen, Heart, HeartBreak, Copy, ShareNetwork, ArrowRight } from "@phosphor-icons/react";

// Deterministic day-of-year so every user sees the same verse on the same day,
// independent of timezone jitter. We use local-date components so the verse
// "resets" at local midnight, which matches a user's intuition of "hoy".
function dayOfYear(d = new Date()) {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d - start;
    return Math.floor(diff / 86_400_000);
}

// Resolve a verse ({en, es, chapter, verse}) against the already-normalized
// Bible data for the current language. Returns { text, bookDisplay } or null.
function resolveVerse(entry, data, lang) {
    if (!data || !entry) return null;
    const bookName = lang === "es" ? entry.es : entry.en;
    const book = data.books.find((b) => b.name === bookName);
    if (!book) return null;
    const chapter = book.chapters.find((c) => c.chapter === entry.chapter);
    if (!chapter) return null;
    const verse = chapter.verses.find((v) => v.verse === entry.verse);
    if (!verse) return null;
    return {
        book: book.name,
        bookDisplay: book.name,
        chapter: entry.chapter,
        verse: entry.verse,
        text: verse.text,
    };
}

export default function VerseOfTheDay() {
    const { t, lang } = useLang();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [list, setList] = React.useState(null);
    const [data, setData] = React.useState(null);
    const [idx, setIdx] = React.useState(null);        // absolute index into list
    const [error, setError] = React.useState("");
    const [savedId, setSavedId] = React.useState(null); // favorite id when saved

    // Load the curated list once.
    React.useEffect(() => {
        let cancelled = false;
        fetch("/data/verse-of-the-day.json", { cache: "force-cache" })
            .then((r) => r.json())
            .then((j) => { if (!cancelled) setList(j.verses || []); })
            .catch(() => { if (!cancelled) setError("list"); });
        return () => { cancelled = true; };
    }, []);

    // Load the Bible for the current language (reuses IDB / in-memory cache).
    React.useEffect(() => {
        let cancelled = false;
        loadBible(lang)
            .then((d) => { if (!cancelled) setData(d); })
            .catch(() => { if (!cancelled) setError("bible"); });
        return () => { cancelled = true; };
    }, [lang]);

    // Compute today's index, skipping entries that fail to resolve in the
    // current translation (e.g. missing Psalms due to numbering drift).
    React.useEffect(() => {
        if (!list || list.length === 0 || !data) return;
        const base = dayOfYear() % list.length;
        for (let step = 0; step < list.length; step += 1) {
            const tryIdx = (base + step) % list.length;
            if (resolveVerse(list[tryIdx], data, lang)) {
                setIdx(tryIdx);
                return;
            }
        }
        setError("resolve");
    }, [list, data, lang]);

    const current = idx != null && list ? list[idx] : null;
    const resolved = React.useMemo(
        () => resolveVerse(current, data, lang),
        [current, data, lang],
    );

    // Reflect favorite status: on mount + when idx changes, ask the server if
    // this verse is already saved for this user. Cheap + one request.
    React.useEffect(() => {
        setSavedId(null);
        if (!user || !resolved) return;
        let cancelled = false;
        (async () => {
            try {
                const r = await api.get("/favorites");
                if (cancelled) return;
                const match = (r.data || []).find(
                    (f) =>
                        f.section === "bible" &&
                        f.metadata?.kind === "verse" &&
                        f.metadata?.book === resolved.book &&
                        f.metadata?.chapter === resolved.chapter &&
                        f.metadata?.verse === resolved.verse &&
                        (!f.metadata?.lang || f.metadata.lang === lang),
                );
                if (match) setSavedId(match.id);
            } catch { /* silent */ }
        })();
        return () => { cancelled = true; };
    }, [user, resolved, lang]);

    if (!list || !data || !resolved) {
        // Subtle placeholder so the Dashboard doesn't jump; show nothing on
        // hard errors rather than a visible failure state.
        if (error) return null;
        return (
            <section
                className="surface-card p-6 sm:p-8 animate-pulse"
                data-testid="votd-loading"
                aria-hidden="true"
            >
                <div className="h-3 w-24 bg-sand-200 rounded mb-4" />
                <div className="h-6 w-48 bg-sand-200 rounded mb-6" />
                <div className="h-4 w-full bg-sand-200 rounded mb-2" />
                <div className="h-4 w-11/12 bg-sand-200 rounded mb-2" />
                <div className="h-4 w-2/3 bg-sand-200 rounded" />
            </section>
        );
    }

    const reference = `${resolved.bookDisplay} ${resolved.chapter}:${resolved.verse}`;
    const formatted = `"${resolved.text}" — ${reference}`;

    const doCopy = async () => {
        try {
            await navigator.clipboard.writeText(formatted);
            toast.success(t("bible.verse_copied"));
        } catch {
            toast.error(t("common.error"));
        }
    };

    const doShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: t("bible.share_title"), text: formatted });
                return;
            } catch { /* cancelled or blocked — fall back to copy */ }
        }
        await doCopy();
    };

    const doFavorite = async () => {
        if (!user) { navigate("/login"); return; }
        try {
            if (savedId) {
                await api.delete(`/favorites/${savedId}`);
                setSavedId(null);
                toast.success(t("common.remove"));
            } else {
                const r = await api.post("/favorites", {
                    section: "bible",
                    title: reference,
                    content: resolved.text,
                    metadata: {
                        kind: "verse",
                        book: resolved.book,
                        chapter: resolved.chapter,
                        verse: resolved.verse,
                        lang,
                    },
                    lang,
                });
                setSavedId(r.data?.id || null);
                toast.success(t("common.saved"));
            }
        } catch {
            toast.error(t("common.error"));
        }
    };

    const goToBible = () => {
        const ref = `${resolved.book}|${resolved.chapter}|${resolved.verse}`;
        navigate(`/bible?ref=${encodeURIComponent(ref)}`);
    };

    return (
        <section
            className="surface-card p-6 sm:p-8 relative overflow-hidden"
            data-testid="votd-card"
            aria-label={t("votd.title")}
        >
            <span
                aria-hidden="true"
                className="absolute -top-4 -right-4 text-sangre/10 pointer-events-none"
            >
                <BookOpen size={140} weight="duotone" />
            </span>

            <div className="relative flex items-start justify-between gap-4 flex-wrap mb-4">
                <div className="min-w-0">
                    <p className="label-eyebrow text-sangre mb-1">{t("votd.title")}</p>
                    <h2
                        className="heading-serif text-2xl sm:text-3xl tracking-tight leading-tight m-0"
                        data-testid="votd-reference"
                    >
                        {reference}
                    </h2>
                </div>
            </div>

            <blockquote
                className="reading-serif text-lg sm:text-xl text-stone900 leading-[1.65] italic border-l-2 border-sangre/50 pl-4 my-6"
                data-testid="votd-text"
            >
                "{resolved.text}"
            </blockquote>

            <div className="flex flex-wrap items-center gap-2 relative" data-testid="votd-actions">
                <button
                    type="button"
                    onClick={doFavorite}
                    data-testid="votd-fav"
                    className="inline-flex items-center gap-1.5 px-3 py-2 ui-sans text-xs uppercase tracking-widest font-semibold rounded-md border border-sand-300 text-stone900 hover:border-sangre hover:text-sangre transition-colors"
                    aria-pressed={!!savedId}
                >
                    {savedId
                        ? <HeartBreak size={14} weight="duotone" />
                        : <Heart size={14} weight="duotone" />}
                    <span>{savedId ? t("bible.remove_favorite") : t("common.save_favorite")}</span>
                </button>
                <button
                    type="button"
                    onClick={doCopy}
                    data-testid="votd-copy"
                    className="inline-flex items-center gap-1.5 px-3 py-2 ui-sans text-xs uppercase tracking-widest font-semibold rounded-md border border-sand-300 text-stone900 hover:border-sangre hover:text-sangre transition-colors"
                >
                    <Copy size={14} weight="duotone" />
                    <span>{t("bible.copy_verse")}</span>
                </button>
                <button
                    type="button"
                    onClick={doShare}
                    data-testid="votd-share"
                    className="inline-flex items-center gap-1.5 px-3 py-2 ui-sans text-xs uppercase tracking-widest font-semibold rounded-md border border-sand-300 text-stone900 hover:border-sangre hover:text-sangre transition-colors"
                >
                    <ShareNetwork size={14} weight="duotone" />
                    <span>{t("bible.share_verse")}</span>
                </button>
                <span className="flex-1" />
                <button
                    type="button"
                    onClick={goToBible}
                    data-testid="votd-open-bible"
                    className="inline-flex items-center gap-1.5 px-4 py-2 ui-sans text-xs uppercase tracking-widest font-semibold rounded-md bg-sangre text-sand-50 hover:bg-sangre-hover transition-colors"
                >
                    <span>{t("votd.open_bible")}</span>
                    <ArrowRight size={14} weight="bold" />
                </button>
            </div>
        </section>
    );
}
