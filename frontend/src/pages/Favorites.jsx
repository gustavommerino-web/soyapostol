import React from "react";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Trash, ArrowSquareOut, HeartBreak } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const SECTION_LABELS = {
    es: { readings: "Lecturas", liturgy: "Liturgia", prayers: "Oración", examen: "Examen", news: "Noticia", bible: "Biblia", catechism: "Catecismo" },
    en: { readings: "Readings", liturgy: "Liturgy", prayers: "Prayer", examen: "Examen", news: "News", bible: "Bible", catechism: "Catechism" },
};

export default function Favorites() {
    const { t, lang } = useLang();
    const { user } = useAuth();
    const [items, setItems] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [filter, setFilter] = React.useState("all");

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const r = await api.get("/favorites");
            setItems(r.data || []);
        } catch (e) {
            if (e.response?.status !== 401) toast.error(e.message);
        } finally { setLoading(false); }
    }, []);

    React.useEffect(() => { if (user) load(); else setLoading(false); }, [user, load]);

    const onDelete = async (id) => {
        try {
            await api.delete(`/favorites/${id}`);
            setItems((arr) => arr.filter((i) => i.id !== id));
        } catch (e) { toast.error(e.message); }
    };

    if (!user) {
        return (
            <div className="max-w-xl mx-auto text-center py-20" data-testid="favorites-anon">
                <HeartBreak size={48} weight="duotone" className="text-sangre mx-auto mb-6" />
                <h1 className="heading-serif text-4xl tracking-tight mb-3">{t("nav.favorites")}</h1>
                <p className="text-stoneMuted mb-6">{lang === "es" ? "Inicia sesión para guardar y ver tus favoritos." : "Sign in to save and view your favorites."}</p>
                <Link to="/login" className="btn-primary inline-block" data-testid="favorites-login-cta">{t("common.sign_in")}</Link>
            </div>
        );
    }

    const sections = Array.from(new Set(items.map((i) => i.section)));
    const filtered = filter === "all" ? items : items.filter((i) => i.section === filter);

    return (
        <div className="max-w-4xl mx-auto" data-testid="favorites-page">
            <p className="label-eyebrow mb-3">{t("nav.favorites")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-3">{t("nav.favorites")}</h1>
            <p className="text-stoneMuted mb-10 max-w-2xl">{t("sections.favorites_desc")}</p>

            {items.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-10" data-testid="favorites-filter">
                    <button onClick={() => setFilter("all")} data-testid="fav-filter-all"
                        className={`px-3 py-1.5 ui-sans text-xs uppercase tracking-widest rounded-md border transition-colors ${filter === "all" ? "bg-sangre text-sand-50 border-sangre" : "bg-sand-100 text-stoneMuted border-sand-300 hover:border-sangre"}`}>
                        All ({items.length})
                    </button>
                    {sections.map((s) => (
                        <button key={s} onClick={() => setFilter(s)} data-testid={`fav-filter-${s}`}
                            className={`px-3 py-1.5 ui-sans text-xs uppercase tracking-widest rounded-md border transition-colors ${filter === s ? "bg-sangre text-sand-50 border-sangre" : "bg-sand-100 text-stoneMuted border-sand-300 hover:border-sangre"}`}>
                            {SECTION_LABELS[lang]?.[s] || s}
                        </button>
                    ))}
                </div>
            )}

            {loading && <p className="text-stoneMuted">{t("common.loading")}</p>}
            {!loading && items.length === 0 && (
                <p className="text-stoneMuted" data-testid="favorites-empty">
                    {lang === "es" ? "Aún no has guardado nada." : "You haven't saved anything yet."}
                </p>
            )}

            <ul className="space-y-5" data-testid="favorites-list">
                {filtered.map((f) => (
                    <li key={f.id} className="surface-card p-6" data-testid={`favorite-${f.id}`}>
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="min-w-0 flex-1">
                                <span className="label-eyebrow text-sangre">{SECTION_LABELS[lang]?.[f.section] || f.section}</span>
                                <h3 className="heading-serif text-2xl tracking-tight leading-snug mt-1">{f.title}</h3>
                            </div>
                            <button onClick={() => onDelete(f.id)} data-testid={`fav-delete-${f.id}`}
                                className="text-stoneFaint hover:text-sangre p-2">
                                <Trash size={16} />
                            </button>
                        </div>
                        <div className="reading-prose">
                            <p className="line-clamp-6">{f.content}</p>
                        </div>
                        {f.source_url && (
                            <a href={f.source_url} target="_blank" rel="noreferrer"
                                className="mt-3 inline-flex items-center gap-1.5 ui-sans text-xs uppercase tracking-widest text-sangre hover:underline">
                                {t("common.source")} <ArrowSquareOut size={12} />
                            </a>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
