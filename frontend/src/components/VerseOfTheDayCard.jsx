import { useLang } from "@/contexts/LangContext";
import {
    BookOpen, Heart, HeartBreak, Copy, ShareNetwork, ArrowRight,
} from "@phosphor-icons/react";

/**
 * Presentational card for the Verse of the Day.
 * Pure view layer — receives the already-resolved verse and 4 callbacks.
 *
 * Animation / decoration:
 *   - a large watermark <BookOpen> rotated behind the content.
 *   - blockquote styled with a left-border accent in sangre.
 */
export function VerseOfTheDayCard({
    reference,
    text,
    saved,
    onFavorite,
    onCopy,
    onShare,
    onOpenBible,
}) {
    const { t } = useLang();

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
                &ldquo;{text}&rdquo;
            </blockquote>

            <div className="flex flex-wrap items-center gap-2 relative" data-testid="votd-actions">
                <VotdAction
                    onClick={onFavorite}
                    testId="votd-fav"
                    icon={saved ? <HeartBreak size={14} weight="duotone" /> : <Heart size={14} weight="duotone" />}
                    label={saved ? t("bible.remove_favorite") : t("common.save_favorite")}
                    ariaPressed={saved}
                />
                <VotdAction
                    onClick={onCopy}
                    testId="votd-copy"
                    icon={<Copy size={14} weight="duotone" />}
                    label={t("bible.copy_verse")}
                />
                <VotdAction
                    onClick={onShare}
                    testId="votd-share"
                    icon={<ShareNetwork size={14} weight="duotone" />}
                    label={t("bible.share_verse")}
                />
                <span className="flex-1" />
                <button
                    type="button"
                    onClick={onOpenBible}
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

// Internal helper to keep the three secondary action buttons on a single
// visual pattern without copy-pasting className strings.
function VotdAction({ onClick, testId, icon, label, ariaPressed }) {
    return (
        <button
            type="button"
            onClick={onClick}
            data-testid={testId}
            className="inline-flex items-center gap-1.5 px-3 py-2 ui-sans text-xs uppercase tracking-widest font-semibold rounded-md border border-sand-300 text-stone900 hover:border-sangre hover:text-sangre transition-colors"
            aria-pressed={ariaPressed != null ? !!ariaPressed : undefined}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}

export function VerseOfTheDaySkeleton() {
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
