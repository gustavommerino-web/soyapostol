import React from "react";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import FavoriteButton from "@/components/FavoriteButton";
import PrayersAdmin from "@/components/PrayersAdmin";
import * as Custom from "@/lib/customPrayers";
import { CaretLeft, MagnifyingGlass } from "@phosphor-icons/react";

const CUSTOM_PREFIX = "custom-";

function mergeCustom(apiCategories, customList) {
    const map = new Map();
    for (const c of apiCategories || []) {
        map.set(c.category, c.items.map((i) => ({ ...i, source: "api" })));
    }
    for (const p of customList) {
        const arr = map.get(p.category) || [];
        arr.push({ slug: p.slug, title: p.title, source: "custom" });
        map.set(p.category, arr);
    }
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
}

export default function Prayers() {
    const { lang, t } = useLang();
    const { user } = useAuth();
    const isAdmin = user && user.role === "admin";

    const [apiCategories, setApiCategories] = React.useState([]);
    const [customList, setCustomList] = React.useState(() => Custom.listForLang(lang));
    const [loading, setLoading] = React.useState(true);
    const [query, setQuery] = React.useState("");
    const [selected, setSelected] = React.useState(null);
    const [content, setContent] = React.useState(null);
    const [contentLoading, setContentLoading] = React.useState(false);

    React.useEffect(() => {
        setLoading(true);
        api.get(`/prayers?lang=${lang}`)
            .then((r) => setApiCategories(r.data.categories || []))
            .finally(() => setLoading(false));
        setSelected(null); setContent(null);
        setCustomList(Custom.listForLang(lang));
    }, [lang]);

    // Keep the displayed list in sync with localStorage updates from the admin panel.
    React.useEffect(() => {
        const refresh = () => setCustomList(Custom.listForLang(lang));
        window.addEventListener("custom-prayers-changed", refresh);
        window.addEventListener("storage", refresh);
        return () => {
            window.removeEventListener("custom-prayers-changed", refresh);
            window.removeEventListener("storage", refresh);
        };
    }, [lang]);

    const categories = React.useMemo(
        () => mergeCustom(apiCategories, customList),
        [apiCategories, customList],
    );

    const open = async (item) => {
        setSelected(item);
        setContent(null);
        // Custom prayers are served entirely from localStorage.
        if (item.slug.startsWith(CUSTOM_PREFIX)) {
            const local = Custom.getBySlug(item.slug);
            if (local) {
                setContent({ title: local.title, content: local.content, source_url: null });
            }
            return;
        }
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

            {isAdmin && (
                <PrayersAdmin apiCategories={apiCategories} onChange={() => setCustomList(Custom.listForLang(lang))} />
            )}

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
                            {cat.items.map((item) => (
                                <li key={item.slug}>
                                    <button onClick={() => open(item)}
                                        data-testid={`prayer-item-${item.slug}`}
                                        className="surface-card w-full text-left p-4 hover:border-sangre transition-colors">
                                        <p className="reading-serif text-base leading-snug">{item.title}</p>
                                        {item.source === "custom" && (
                                            <span className="ui-sans text-[10px] uppercase tracking-widest text-sangre mt-1 inline-block">
                                                {t("admin.custom_badge")}
                                            </span>
                                        )}
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
