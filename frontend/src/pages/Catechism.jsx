import React from "react";
import { useLang } from "@/contexts/LangContext";
import api from "@/lib/api";
import FavoriteButton from "@/components/FavoriteButton";
import { CaretLeft } from "@phosphor-icons/react";

export default function Catechism() {
    const { t, lang } = useLang();
    const [structure, setStructure] = React.useState([]);
    const [section, setSection] = React.useState(null);
    const [paragraphs, setParagraphs] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [chunkStart, setChunkStart] = React.useState(null);

    React.useEffect(() => {
        setLoading(true);
        api.get(`/catechism/structure?lang=${lang}`)
            .then((r) => setStructure(r.data || []))
            .finally(() => setLoading(false));
    }, [lang]);

    const openSection = async (s) => {
        setSection(s);
        setChunkStart(s.start);
        await loadChunk(s.start, s);
    };

    const loadChunk = async (start, s = section) => {
        const end = Math.min(s.end, start + 39);
        setLoading(true);
        try {
            const r = await api.get(`/catechism/paragraphs?start=${start}&end=${end}&lang=${lang}`);
            setParagraphs(r.data.paragraphs || []);
            setChunkStart(start);
        } finally { setLoading(false); }
    };

    if (section) {
        const nextStart = chunkStart + 40;
        const prevStart = Math.max(section.start, chunkStart - 40);
        return (
            <div className="max-w-3xl mx-auto" data-testid="catechism-section-page">
                <button onClick={() => { setSection(null); setParagraphs([]); }}
                    data-testid="catechism-back-btn"
                    className="inline-flex items-center gap-1.5 text-sm text-stoneMuted hover:text-sangre mb-6">
                    <CaretLeft size={14} weight="bold" /> {t("nav.catechism")}
                </button>
                <p className="label-eyebrow mb-2">CCC §{section.start}–{section.end}</p>
                <h1 className="heading-serif text-4xl tracking-tight leading-tight mb-8">{section.title}</h1>

                {loading && <p className="text-stoneMuted" data-testid="catechism-loading">{t("common.loading")}</p>}

                <article className="reading-prose">
                    {paragraphs.map((p) => (
                        <div key={p.number} className="mb-8 group" data-testid={`ccc-para-${p.number}`}>
                            <div className="flex items-start gap-3">
                                <span className="text-sangre font-medium ui-sans text-sm mt-1 shrink-0">§{p.number}</span>
                                <div className="flex-1">
                                    <p className="m-0">{p.text}</p>
                                    <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <FavoriteButton section="catechism"
                                            title={`CCC §${p.number}`}
                                            content={p.text}
                                            metadata={{ paragraph: p.number, section: section.id }}
                                            testId={`fav-ccc-${p.number}`} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </article>

                <div className="flex gap-3 mt-10">
                    {chunkStart > section.start && (
                        <button onClick={() => loadChunk(prevStart)} className="btn-ghost" data-testid="ccc-prev-chunk">
                            ← §{prevStart}
                        </button>
                    )}
                    {chunkStart + 40 <= section.end && (
                        <button onClick={() => loadChunk(nextStart)} className="btn-primary" data-testid="ccc-next-chunk">
                            §{nextStart} →
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto" data-testid="catechism-page">
            <p className="label-eyebrow mb-3">{t("nav.catechism")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-3">{t("nav.catechism")}</h1>
            <p className="text-stoneMuted mb-12 max-w-2xl">{t("sections.catechism_desc")}</p>

            {loading && <p className="text-stoneMuted">{t("common.loading")}</p>}

            <div className="space-y-12">
                {structure.map((part) => (
                    <section key={part.part} data-testid={`ccc-part-${part.part}`}>
                        <p className="label-eyebrow mb-2">Pars {part.part}</p>
                        <h2 className="heading-serif text-3xl tracking-tight mb-6 border-b border-sand-300 pb-3">{part.title}</h2>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {part.sections.map((s) => (
                                <li key={s.id}>
                                    <button onClick={() => openSection(s)}
                                        data-testid={`ccc-section-${s.id}`}
                                        className="surface-card w-full text-left rounded-md p-5">
                                        <p className="label-eyebrow mb-1">§{s.start}–{s.end}</p>
                                        <p className="reading-serif text-lg leading-snug">{s.title}</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </div>
    );
}
