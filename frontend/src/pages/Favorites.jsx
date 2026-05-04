import React from "react";
import DOMPurify from "dompurify";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFavoritesCount } from "@/contexts/FavoritesCountContext";
import api from "@/lib/api";
import BackToTopButton from "@/components/BackToTopButton";
import {
    Trash, ArrowSquareOut, HeartBreak, CaretDown, CaretUp,
    MagnifyingGlass, X,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const SECTION_LABELS = {
    es: { readings: "Lecturas", liturgy: "Liturgia", prayers: "Oración", examen: "Examen", news: "Noticia", bible: "Biblia", catechism: "Catecismo" },
    en: { readings: "Readings", liturgy: "Liturgy", prayers: "Prayer", examen: "Examen", news: "News", bible: "Bible", catechism: "Catechism" },
};

// Height of the collapsed content body in px. Anything shorter than this
// renders without the "Read more" affordance.
const COLLAPSED_HEIGHT = 160;

export default function Favorites() {
    const { t, lang } = useLang();
    const { user } = useAuth();
    const { refresh: refreshCount } = useFavoritesCount();
    const [items, setItems] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [filter, setFilter] = React.useState("all");
    const [query, setQuery] = React.useState("");

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

    // When the user changes language, their previously selected section
    // filter may no longer apply to any item in the new language — reset
    // to "all" so the list isn't unexpectedly empty.
    React.useEffect(() => { setFilter("all"); }, [lang]);

    const onDelete = async (id) => {
        try {
            await api.delete(`/favorites/${id}`);
            setItems((arr) => arr.filter((i) => i.id !== id));
            refreshCount();
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

    // Show only favourites stored in the user's current UI language. Legacy
    // rows without a `lang` field are treated as Spanish (the old default).
    // A small counter below announces how many favourites live in the
    // *other* language so the user never thinks they disappeared.
    const langItems = items.filter((i) => (i.lang || "es") === lang);
    const otherLang = lang === "es" ? "en" : "es";
    const otherCount = items.filter((i) => (i.lang || "es") === otherLang).length;

    const sections = Array.from(new Set(langItems.map((i) => i.section)));
    const q = query.trim().toLowerCase();
    const filtered = langItems.filter((i) => {
        if (filter !== "all" && i.section !== filter) return false;
        if (!q) return true;
        const hay = `${i.title || ""}\n${i.content || ""}`.toLowerCase();
        return hay.includes(q);
    });

    return (
        <div className="max-w-4xl mx-auto" data-testid="favorites-page">
            <p className="label-eyebrow mb-3">{t("nav.favorites")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-3">{t("nav.favorites")}</h1>
            <p className="text-stoneMuted mb-6 max-w-2xl">{t("sections.favorites_desc")}</p>

            {/* Sticky toolbox: search + filter chips stay pinned below the
                app header so filtering long favourite lists stays within
                easy reach as the user scrolls. Negative margins + matching
                horizontal padding make the backdrop span the full reading
                column width (same pattern used by /readings tabs). */}
            {langItems.length > 0 && (
                <div
                    className="sticky top-[57px] lg:top-[73px] z-20 -mx-4 sm:-mx-6 lg:-mx-12 px-4 sm:px-6 lg:px-12 py-3 bg-sand-50/95 backdrop-blur-md border-b border-sand-300 mb-6"
                    data-testid="favorites-sticky-toolbar"
                >
                    <div data-testid="favorites-search-wrap" className="mb-3">
                        <label htmlFor="fav-search" className="relative block">
                            <MagnifyingGlass
                                size={16}
                                weight="bold"
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-stoneFaint pointer-events-none"
                                aria-hidden="true"
                            />
                            <input
                                id="fav-search"
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={t("favorites.search_placeholder")}
                                data-testid="favorites-search-input"
                                className="w-full pl-10 pr-10 py-3 ui-sans text-sm text-stone900 bg-white border border-sand-300 rounded-md focus:outline-none focus:border-sangre placeholder:text-stoneFaint"
                                aria-label={t("favorites.search_placeholder")}
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery("")}
                                    data-testid="favorites-search-clear"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-stoneFaint hover:text-sangre hover:bg-sangre/5"
                                    aria-label={t("common.cancel")}
                                >
                                    <X size={14} weight="bold" />
                                </button>
                            )}
                        </label>
                    </div>

                    <div className="flex flex-wrap gap-2" data-testid="favorites-filter">
                        <button onClick={() => setFilter("all")} data-testid="fav-filter-all"
                            className={`px-3 py-1.5 ui-sans text-xs uppercase tracking-widest rounded-md border transition-colors ${filter === "all" ? "bg-sangre text-sand-50 border-sangre" : "bg-sand-100 text-stoneMuted border-sand-300 hover:border-sangre"}`}>
                            {lang === "es" ? "Todos" : "All"} ({langItems.length})
                        </button>
                        {sections.map((s) => (
                            <button key={s} onClick={() => setFilter(s)} data-testid={`fav-filter-${s}`}
                                className={`px-3 py-1.5 ui-sans text-xs uppercase tracking-widest rounded-md border transition-colors ${filter === s ? "bg-sangre text-sand-50 border-sangre" : "bg-sand-100 text-stoneMuted border-sand-300 hover:border-sangre"}`}>
                                {SECTION_LABELS[lang]?.[s] || s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {loading && <p className="text-stoneMuted">{t("common.loading")}</p>}
            {!loading && items.length === 0 && (
                <p className="text-stoneMuted" data-testid="favorites-empty">
                    {lang === "es" ? "Aún no has guardado nada." : "You haven't saved anything yet."}
                </p>
            )}
            {!loading && items.length > 0 && langItems.length === 0 && (
                <p className="text-stoneMuted" data-testid="favorites-empty-lang">
                    {lang === "es"
                        ? `No tienes favoritos guardados en español todavía. Tienes ${otherCount} guardados en inglés — cambia el idioma desde Ajustes para verlos.`
                        : `You haven't saved any favourites in English yet. You have ${otherCount} saved in Spanish — change the language from Settings to view them.`}
                </p>
            )}
            {!loading && langItems.length > 0 && filtered.length === 0 && (
                <p className="text-stoneMuted" data-testid="favorites-empty-search">
                    {t("favorites.no_results", { q: query })}
                </p>
            )}

            <ul className="space-y-5" data-testid="favorites-list">
                {filtered.map((f) => (
                    <FavoriteCard key={f.id} fav={f} query={q} onDelete={() => onDelete(f.id)} />
                ))}
            </ul>

            {/* Cross-language hint below the list so users always know
                their favourites in the other language are safe. */}
            {!loading && langItems.length > 0 && otherCount > 0 && (
                <p
                    className="mt-8 text-xs text-stoneFaint italic text-center"
                    data-testid="favorites-other-lang-hint"
                >
                    {lang === "es"
                        ? `También tienes ${otherCount} favorito(s) guardado(s) en inglés.`
                        : `You also have ${otherCount} favourite(s) saved in Spanish.`}
                </p>
            )}

            <BackToTopButton testId="favorites-back-to-top" threshold={250} />
        </div>
    );
}

// -------------------------------------------------------------------

// Detect HTML so prayers/readings/liturgy content (which arrives as real
// markup with <span style="color:#ff0000"> rubrics, <br>, <em>, etc.) is
// rendered faithfully; plain text is kept with its original line breaks.
function isHtmlContent(s) {
    if (!s || typeof s !== "string") return false;
    return /<[a-zA-Z!/]/.test(s);
}

// ---- search highlighting --------------------------------------------

const ESC_RE = /[.*+?^${}()|[\]\\]/g;
const escapeRegex = (s) => s.replace(ESC_RE, "\\$&");

// Plain-text → React nodes. Uses a capture group in split() so odd-index
// parts are the matched separators and can be wrapped in <mark>.
function highlightText(text, query) {
    if (!text) return text;
    if (!query) return text;
    const re = new RegExp(`(${escapeRegex(query)})`, "gi");
    const parts = String(text).split(re);
    return parts.map((part, i) =>
        i % 2 === 1
            ? <mark key={i}>{part}</mark>
            : <React.Fragment key={i}>{part}</React.Fragment>,
    );
}

// HTML string → HTML string with <mark> wrapping every text match. We parse
// into a DocumentFragment and walk only TEXT_NODEs, so tag structure (red
// rubric spans, <br>, <em>, …) stays untouched.
function highlightHtml(html, query) {
    if (!html) return html;
    if (!query || typeof window === "undefined") return html;
    try {
        const re = new RegExp(escapeRegex(query), "gi");
        const doc = new DOMParser().parseFromString(html, "text/html");
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
        const hits = [];
        let n;
        while ((n = walker.nextNode())) {
            if (n.parentElement && n.parentElement.tagName === "MARK") continue;
            if (!n.nodeValue) continue;
            if (n.nodeValue.toLowerCase().includes(query.toLowerCase())) {
                hits.push(n);
            }
        }
        for (const node of hits) {
            const text = node.nodeValue;
            const frag = doc.createDocumentFragment();
            let last = 0;
            let m;
            re.lastIndex = 0;
            while ((m = re.exec(text)) !== null) {
                if (m.index > last) {
                    frag.appendChild(doc.createTextNode(text.slice(last, m.index)));
                }
                const mark = doc.createElement("mark");
                mark.textContent = m[0];
                frag.appendChild(mark);
                last = m.index + m[0].length;
                if (m.index === re.lastIndex) re.lastIndex++; // zero-width guard
            }
            if (last < text.length) {
                frag.appendChild(doc.createTextNode(text.slice(last)));
            }
            node.parentNode.replaceChild(frag, node);
        }
        return doc.body.innerHTML;
    } catch {
        return html;
    }
}

function FavoriteCard({ fav, query, onDelete }) {
    const { t, lang } = useLang();
    const bodyRef = React.useRef(null);
    const [expanded, setExpanded] = React.useState(false);
    const [fullHeight, setFullHeight] = React.useState(COLLAPSED_HEIGHT);
    const [overflows, setOverflows] = React.useState(false);

    const html = isHtmlContent(fav.content);
    // Sanitize any user-saved HTML before rendering — even though the
    // content comes from backend-scraped Catholic sources, we defence-in-
    // depth strip scripts, iframes, inline event handlers, and form tags.
    const highlightedHtml = React.useMemo(() => {
        if (!html) return null;
        const raw = highlightHtml(fav.content, query);
        return DOMPurify.sanitize(raw, {
            USE_PROFILES: { html: true },
            FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
            FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
        });
    }, [html, fav.content, query]);

    // Measure the rendered body every time content/language/query changes so
    // the animation target is the real scrollHeight, not a magic big number.
    React.useLayoutEffect(() => {
        if (!bodyRef.current) return;
        const h = bodyRef.current.scrollHeight;
        setFullHeight(h);
        setOverflows(h > COLLAPSED_HEIGHT + 2);
    }, [fav.content, lang, query]);

    const toggle = () => {
        if (overflows) setExpanded((e) => !e);
    };

    const onCardKeyDown = (e) => {
        if (!overflows) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((x) => !x);
        }
    };

    const stop = (e) => e.stopPropagation();

    return (
        <li
            className={`surface-card relative p-6 ${overflows ? "cursor-pointer" : ""}`}
            data-testid={`favorite-${fav.id}`}
            onClick={toggle}
            onKeyDown={onCardKeyDown}
            role={overflows ? "button" : undefined}
            tabIndex={overflows ? 0 : undefined}
            aria-expanded={overflows ? expanded : undefined}
        >
            {/* Delete button — always visible, corner anchored. */}
            <button
                onClick={(e) => { stop(e); onDelete(); }}
                data-testid={`fav-delete-${fav.id}`}
                className="absolute top-4 right-4 p-2 rounded-md text-stoneFaint hover:text-sangre hover:bg-sangre/5 transition-colors"
                aria-label={t("common.remove")}
                title={t("common.remove")}
            >
                <Trash size={16} />
            </button>

            <div className="pr-10 mb-3">
                <span className="label-eyebrow text-sangre">
                    {SECTION_LABELS[lang]?.[fav.section] || fav.section}
                </span>
                <h3 className="heading-serif text-2xl tracking-tight leading-snug mt-1">
                    {highlightText(fav.title, query)}
                </h3>
            </div>

            {/* Collapsible body with animated max-height + fade overlay. */}
            <div className="relative">
                <div
                    ref={bodyRef}
                    className="reading-prose overflow-hidden transition-[max-height] duration-500 ease-in-out"
                    style={{
                        maxHeight: expanded || !overflows ? `${fullHeight}px` : `${COLLAPSED_HEIGHT}px`,
                    }}
                    data-testid={`fav-body-${fav.id}`}
                >
                    {html ? (
                        <div
                            className="reading-serif text-base leading-relaxed text-stone900"
                            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                        />
                    ) : (
                        <p className="reading-serif text-base leading-relaxed text-stone900 whitespace-pre-line m-0">
                            {highlightText(fav.content, query)}
                        </p>
                    )}
                </div>
                {overflows && !expanded && (
                    <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/90 to-transparent"
                        aria-hidden="true"
                        data-testid={`fav-fade-${fav.id}`}
                    />
                )}
            </div>

            {/* Footer row: toggle + source */}
            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                {overflows ? (
                    <button
                        type="button"
                        onClick={(e) => { stop(e); setExpanded((x) => !x); }}
                        data-testid={`fav-toggle-${fav.id}`}
                        aria-expanded={expanded}
                        className="ui-sans inline-flex items-center gap-1.5 text-xs uppercase tracking-widest font-semibold text-sangre hover:underline"
                    >
                        {expanded ? t("common.show_less") : t("common.show_more")}
                        {expanded ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
                    </button>
                ) : <span />}
                {fav.source_url && (
                    <a
                        href={fav.source_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={stop}
                        className="inline-flex items-center gap-1.5 ui-sans text-xs uppercase tracking-widest text-stoneMuted hover:text-sangre"
                    >
                        {t("common.source")} <ArrowSquareOut size={12} />
                    </a>
                )}
            </div>
        </li>
    );
}
