import React from "react";
import { useLang } from "@/contexts/LangContext";
import api from "@/lib/api";
import FavoriteButton from "@/components/FavoriteButton";
import { CaretLeft, MagnifyingGlass } from "@phosphor-icons/react";

export default function Prayers() {
    const { lang, t } = useLang();
    const [categories, setCategories] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [query, setQuery] = React.useState("");
    const [selected, setSelected] = React.useState(null);
    const [content, setContent] = React.useState(null);
    const [contentLoading, setContentLoading] = React.useState(false);

    React.useEffect(() => {
        setLoading(true);
        api.get(`/prayers?lang=${lang}`)
            .then((r) => setCategories(r.data.categories || []))
            .finally(() => setLoading(false));
        setSelected(null); setContent(null);
    }, [lang]);

    const open = async (item) => {
        setSelected(item);
        setContent(null);
        setContentLoading(true);
        try {
            const res = await api.get(`/prayers/${item.slug}?lang=${lang}`);
            setContent(res.data);
        } finally { setContentLoading(false); }
    };

    const filteredCategories = React.useMemo(() => {
        if (!query) return categories;
        const q = query.toLowerCase();
        return categories
            .map((c) => ({ ...c, items: c.items.filter((i) => i.title.toLowerCase().includes(q)) }))
            .filter((c) => c.items.length > 0);
    }, [categories, query]);

    if (selected) {
        return (
            <div className="max-w-3xl mx-auto" data-testid="prayer-detail-page">
                <button onClick={() => { setSelected(null); setContent(null); }}
                    data-testid="prayer-back-btn"
                    className="inline-flex items-center gap-1.5 text-sm text-stoneMuted hover:text-sangre mb-8">
                    <CaretLeft size={14} weight="bold" /> {t("nav.prayers")}
                </button>
                {contentLoading && <p className="text-stoneMuted">{t("common.loading")}</p>}
                {content && (
                    <article className="reading-prose">
                        <div className="flex items-center justify-between border-b border-sand-300 pb-2 mb-6 gap-4">
                            <h1 className="heading-serif text-3xl sm:text-4xl tracking-tight leading-tight m-0">{content.title}</h1>
                            <FavoriteButton section="prayers" title={content.title} content={content.content}
                                source_url={content.source_url} testId="fav-prayer" />
                        </div>
                        {content.content.split(/\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
                    </article>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto" data-testid="prayers-page">
            <p className="label-eyebrow mb-3">{t("nav.prayers")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-3">{t("nav.prayers")}</h1>
            <p className="text-stoneMuted mb-10 max-w-2xl">{t("sections.prayers_desc")}</p>

            <div className="relative mb-12 max-w-md">
                <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stoneFaint" />
                <input value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("common.search")}
                    data-testid="prayers-search-input"
                    className="w-full pl-9 pr-3 py-2.5 bg-sand-100 border border-sand-300 rounded-md ui-sans text-sm focus:outline-none focus:border-sangre" />
            </div>

            {loading && <p className="text-stoneMuted" data-testid="prayers-loading">{t("common.loading")}</p>}
            {!loading && categories.length === 0 && (
                <p className="text-stoneMuted" data-testid="prayers-empty">
                    {lang === "en" ? "English prayer catalog coming soon." : "No hay oraciones disponibles."}
                </p>
            )}

            <div className="space-y-12" data-testid="prayers-categories">
                {filteredCategories.map((cat) => (
                    <section key={cat.category} data-testid={`cat-${cat.category}`}>
                        <h2 className="heading-serif text-2xl tracking-tight mb-5 border-b border-sand-300 pb-2">
                            {cat.category}
                        </h2>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {cat.items.map((item, idx) => (
                                <li key={item.slug}>
                                    <button onClick={() => open(item)}
                                        data-testid={`prayer-item-${item.slug}`}
                                        className="surface-card w-full text-left p-4 hover:border-sangre transition-colors">
                                        <p className="reading-serif text-base leading-snug">{item.title}</p>
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
