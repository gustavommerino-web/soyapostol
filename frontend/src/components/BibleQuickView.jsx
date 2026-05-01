import React from "react";
import { useNavigate } from "react-router-dom";
import { X, ArrowRight, BookOpen } from "@phosphor-icons/react";
import { useLang } from "@/contexts/LangContext";
import { lookupCitation } from "@/lib/bibleAbbrev";

/**
 * BibleQuickView — modal/bottom-sheet that shows the verses cited in a CCC
 * paragraph without leaving the Catechism. The Bible JSON is preloaded
 * upstream and passed in as `bibleData`; lookup is therefore synchronous and
 * the modal opens instantly.
 */
export default function BibleQuickView({ cite, bibleData, onClose }) {
    const { t, lang } = useLang();
    const navigate = useNavigate();

    // Lock body scroll while open.
    React.useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, []);

    // Esc to dismiss.
    React.useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    const resolved = React.useMemo(
        () => (bibleData ? lookupCitation(bibleData, lang, cite) : null),
        [bibleData, lang, cite],
    );

    const reference = resolved
        ? `${resolved.bookName} ${resolved.chapter}:${cite.verse}${cite.endVerse ? `-${cite.endVerse}` : ""}`
        : cite.raw;

    const goToBible = () => {
        if (!resolved) return;
        const ref = `${resolved.bookName}|${resolved.chapter}|${cite.verse}`;
        navigate(`/bible?ref=${encodeURIComponent(ref)}`);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            data-testid="bible-quick-view"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={reference}
        >
            <div className="absolute inset-0 bg-stone900/40 backdrop-blur-sm" aria-hidden="true" />
            <div
                className="relative w-full sm:max-w-2xl max-h-[85vh] bg-white sm:rounded-lg rounded-t-2xl shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle (mobile bottom-sheet feel) */}
                <div className="sm:hidden flex justify-center pt-3 pb-1" aria-hidden="true">
                    <span className="block w-10 h-1 rounded-full bg-sand-300" />
                </div>

                <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-sand-200">
                    <div className="flex items-start gap-3 min-w-0">
                        <span
                            className="shrink-0 w-9 h-9 rounded-full bg-sangre/10 text-sangre flex items-center justify-center"
                            aria-hidden="true"
                        >
                            <BookOpen size={18} weight="duotone" />
                        </span>
                        <div className="min-w-0">
                            <p className="label-eyebrow text-sangre mb-1">{t("nav.bible")}</p>
                            <h2 className="heading-serif text-xl tracking-tight m-0 truncate" data-testid="quickview-reference">
                                {reference}
                            </h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        data-testid="quickview-close"
                        aria-label={t("common.cancel")}
                        className="p-2 rounded-md text-stoneFaint hover:text-sangre hover:bg-sangre/5 transition-colors"
                    >
                        <X size={18} weight="bold" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-6 py-5 reading-prose" data-testid="quickview-body">
                    {!resolved ? (
                        <p className="text-stoneMuted italic" data-testid="quickview-not-found">
                            {t("quickview.not_found", { ref: cite.raw })}
                        </p>
                    ) : (
                        <div className="reading-serif text-base sm:text-lg leading-[1.8] text-stone900">
                            {resolved.verses.map((v) => (
                                <p key={v.verse} className="m-0 mb-3">
                                    <sup className="text-sangre text-xs mr-1 font-semibold">{v.verse}</sup>
                                    {v.text}
                                </p>
                            ))}
                        </div>
                    )}
                </div>

                <footer className="px-6 py-4 border-t border-sand-200 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        data-testid="quickview-cancel"
                        className="px-4 py-2 ui-sans text-xs uppercase tracking-widest text-stoneMuted hover:text-stone900"
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={goToBible}
                        disabled={!resolved}
                        data-testid="quickview-open-bible"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 ui-sans text-xs uppercase tracking-widest font-semibold rounded-md bg-sangre text-sand-50 hover:bg-sangre-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        <span>{t("quickview.open_bible")}</span>
                        <ArrowRight size={14} weight="bold" />
                    </button>
                </footer>
            </div>
        </div>
    );
}
