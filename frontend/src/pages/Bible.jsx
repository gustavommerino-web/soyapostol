import React from "react";
import { useLang } from "@/contexts/LangContext";
import api from "@/lib/api";
import FavoriteButton from "@/components/FavoriteButton";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

export default function Bible() {
    const { t, lang } = useLang();
    const [books, setBooks] = React.useState([]);
    const [translation, setTranslation] = React.useState("");
    const [book, setBook] = React.useState(null);
    const [chapter, setChapter] = React.useState(1);
    const [verses, setVerses] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        setLoading(true);
        api.get(`/bible/books?lang=${lang}`)
            .then((r) => {
                setBooks(r.data.books || []);
                setTranslation(r.data.translation || "");
                if (!book && r.data.books?.length) setBook(r.data.books[0]);
            })
            .finally(() => setLoading(false));
    }, [lang]);

    React.useEffect(() => {
        if (!book) return;
        setLoading(true);
        api.get(`/bible/chapter?book=${book.bookid}&chapter=${chapter}&lang=${lang}`)
            .then((r) => setVerses(r.data.verses || []))
            .finally(() => setLoading(false));
    }, [book, chapter, lang]);

    const chapterContent = verses.map((v) => `${v.verse}. ${v.text}`).join("\n");
    const totalChapters = book?.chapters || 1;

    const translationLabel = {
        NABRE: "New American Bible Revised Edition · USCCB",
        BIA:   "Biblia de la Iglesia en América · Vaticano",
    }[translation] || translation;

    return (
        <div className="max-w-6xl mx-auto" data-testid="bible-page">
            <p className="label-eyebrow mb-3">{t("nav.bible")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-2">{t("nav.bible")}</h1>
            {translationLabel && (
                <p className="text-sm text-stoneMuted italic mb-10" data-testid="bible-translation-label">
                    {translationLabel}
                </p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
                {/* Book list */}
                <aside className="surface-card rounded-md p-4 max-h-[70vh] overflow-y-auto" data-testid="bible-books">
                    <p className="label-eyebrow mb-3 px-2">Books</p>
                    {books.map((b) => (
                        <button key={b.bookid} onClick={() => { setBook(b); setChapter(1); }}
                            data-testid={`bible-book-${b.bookid}`}
                            className={`block w-full text-left px-3 py-1.5 rounded-sm reading-serif text-sm transition-colors ${book?.bookid === b.bookid ? "bg-sangre text-sand-50" : "text-stoneMuted hover:bg-sand-200"}`}>
                            {b.name}
                        </button>
                    ))}
                    {books.length === 0 && !loading && <p className="text-sm text-stoneFaint p-2">No books available.</p>}
                </aside>

                {/* Chapter content */}
                <div>
                    {book && (
                        <div className="flex items-center justify-between border-b border-sand-300 pb-3 mb-6">
                            <div>
                                <h2 className="heading-serif text-3xl tracking-tight">{book.name} {chapter}</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setChapter((c) => Math.max(1, c - 1))} disabled={chapter <= 1}
                                    data-testid="bible-prev-chapter"
                                    className="p-2 border border-sand-300 rounded-md hover:border-sangre disabled:opacity-40">
                                    <CaretLeft size={14} weight="bold" />
                                </button>
                                <select value={chapter} onChange={(e) => setChapter(Number(e.target.value))}
                                    data-testid="bible-chapter-select"
                                    className="px-3 py-2 bg-sand-100 border border-sand-300 rounded-md ui-sans text-sm focus:outline-none focus:border-sangre">
                                    {Array.from({ length: totalChapters }, (_, i) => i + 1).map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                                <button onClick={() => setChapter((c) => Math.min(totalChapters, c + 1))} disabled={chapter >= totalChapters}
                                    data-testid="bible-next-chapter"
                                    className="p-2 border border-sand-300 rounded-md hover:border-sangre disabled:opacity-40">
                                    <CaretRight size={14} weight="bold" />
                                </button>
                                <FavoriteButton section="bible"
                                    title={`${book.name} ${chapter}`}
                                    content={chapterContent}
                                    metadata={{ book: book.name, chapter }}
                                    testId="fav-bible-chapter" />
                            </div>
                        </div>
                    )}
                    {loading && <p className="text-stoneMuted" data-testid="bible-loading">{t("common.loading")}</p>}
                    <div className="reading-prose max-w-2xl" data-testid="bible-verses">
                        {verses.map((v) => (
                            <p key={v.verse}>
                                <sup className="text-sangre text-xs mr-1">{v.verse}</sup>
                                {v.text}
                            </p>
                        ))}
                        {!loading && verses.length === 0 && <p className="text-stoneMuted">No verses.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
