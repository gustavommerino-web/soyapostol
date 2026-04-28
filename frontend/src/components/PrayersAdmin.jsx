import React from "react";
import { toast } from "sonner";
import { Plus, PencilSimple, Trash, FloppyDisk, X, MagnifyingGlass } from "@phosphor-icons/react";
import { useLang } from "@/contexts/LangContext";
import api from "@/lib/api";

const NEW_CATEGORY = "__new__";
const EMPTY = { title: "", categorySelect: "", newCategory: "", content: "", editingId: null };
const PRAYERS_CHANGED = "soyapostol-prayers-changed";

/**
 * Admin-only management UI. All operations go through the backend so the
 * data lives in MongoDB and survives reloads. The component emits a
 * `soyapostol-prayers-changed` window event after each mutation so the
 * public list refetches without a page reload.
 */
export default function PrayersAdmin({ apiCategories }) {
    const { t, lang } = useLang();
    const [items, setItems] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [form, setForm] = React.useState(EMPTY);
    const [submitting, setSubmitting] = React.useState(false);
    const [filter, setFilter] = React.useState("");

    const refresh = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/prayers/admin/all?lang=${lang}`);
            setItems(res.data || []);
        } catch (e) {
            toast.error(e.response?.data?.detail || e.message);
        } finally {
            setLoading(false);
        }
    }, [lang]);

    React.useEffect(() => { refresh(); }, [refresh]);

    const apiCategoryNames = (apiCategories || []).map((c) => c.category);
    const allCategories = Array.from(new Set([
        ...apiCategoryNames,
        ...items.map((p) => p.category),
    ])).filter(Boolean).sort((a, b) => a.localeCompare(b, lang === "es" ? "es" : "en"));

    const resetForm = () => setForm(EMPTY);

    const onEdit = (p) => {
        setForm({
            title: p.title,
            categorySelect: allCategories.includes(p.category) ? p.category : NEW_CATEGORY,
            newCategory: allCategories.includes(p.category) ? "" : p.category,
            content: p.content,
            editingId: p.id,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const onDelete = async (p) => {
        if (!window.confirm(t("admin.confirm_delete", { title: p.title }))) return;
        try {
            await api.delete(`/prayers/admin/${p.id}`);
            toast.success(t("admin.deleted"));
            await refresh();
            window.dispatchEvent(new Event(PRAYERS_CHANGED));
            if (form.editingId === p.id) resetForm();
        } catch (e) {
            toast.error(e.response?.data?.detail || e.message);
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        const title = form.title.trim();
        const category = form.categorySelect === NEW_CATEGORY
            ? form.newCategory.trim()
            : form.categorySelect.trim();
        const content = form.content.trim();
        if (!title || !category || !content) {
            toast.error(t("admin.missing_fields"));
            return;
        }
        setSubmitting(true);
        try {
            if (form.editingId) {
                await api.patch(`/prayers/admin/${form.editingId}`, { title, category, content });
                toast.success(t("admin.updated"));
            } else {
                await api.post("/prayers/admin", { title, category, content, lang });
                toast.success(t("admin.created"));
            }
            resetForm();
            await refresh();
            window.dispatchEvent(new Event(PRAYERS_CHANGED));
        } catch (err) {
            toast.error(err.response?.data?.detail || err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const visibleItems = React.useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
        );
    }, [items, filter]);

    return (
        <section
            className="surface-card p-6 sm:p-7 mb-12 border-sangre/30"
            data-testid="prayers-admin-panel"
        >
            <p className="label-eyebrow mb-3">{t("admin.eyebrow")}</p>
            <h2 className="heading-serif text-2xl tracking-tight mb-1">
                {form.editingId ? t("admin.edit_prayer") : t("admin.new_prayer")}
            </h2>
            <p className="text-xs text-stoneMuted mb-5">
                {t("admin.db_hint")}
            </p>

            <form
                onSubmit={onSubmit}
                className="space-y-4"
                data-testid="prayers-admin-form"
            >
                <div>
                    <label className="label-eyebrow block mb-2">{t("admin.title")}</label>
                    <input
                        type="text"
                        required
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        data-testid="prayers-admin-title"
                        className="w-full px-3 py-2.5 bg-white border border-sand-300 rounded-md ui-sans text-sm focus:outline-none focus:border-sangre"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="label-eyebrow block mb-2">{t("admin.category")}</label>
                        <select
                            required
                            value={form.categorySelect}
                            onChange={(e) => setForm((f) => ({ ...f, categorySelect: e.target.value }))}
                            data-testid="prayers-admin-category-select"
                            className="w-full px-3 py-2.5 bg-white border border-sand-300 rounded-md ui-sans text-sm focus:outline-none focus:border-sangre"
                        >
                            <option value="">{t("admin.choose_category")}</option>
                            {allCategories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                            <option value={NEW_CATEGORY}>{t("admin.new_category")}</option>
                        </select>
                    </div>
                    {form.categorySelect === NEW_CATEGORY && (
                        <div>
                            <label className="label-eyebrow block mb-2">{t("admin.new_category_name")}</label>
                            <input
                                type="text"
                                required
                                value={form.newCategory}
                                onChange={(e) => setForm((f) => ({ ...f, newCategory: e.target.value }))}
                                data-testid="prayers-admin-new-category"
                                className="w-full px-3 py-2.5 bg-white border border-sand-300 rounded-md ui-sans text-sm focus:outline-none focus:border-sangre"
                            />
                        </div>
                    )}
                </div>

                <div>
                    <label className="label-eyebrow block mb-2">{t("admin.content")}</label>
                    <textarea
                        required
                        rows={10}
                        value={form.content}
                        onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                        data-testid="prayers-admin-content"
                        className="w-full px-3 py-2.5 bg-white border border-sand-300 rounded-md reading-serif text-sm focus:outline-none focus:border-sangre"
                        placeholder={t("admin.content_placeholder")}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={submitting}
                        data-testid="prayers-admin-submit"
                        className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                    >
                        {form.editingId ? <FloppyDisk size={16} weight="bold" /> : <Plus size={16} weight="bold" />}
                        {form.editingId ? t("admin.save") : t("admin.add")}
                    </button>
                    {form.editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            data-testid="prayers-admin-cancel"
                            className="ui-sans text-sm inline-flex items-center gap-1.5 px-4 py-2 border border-sand-300 rounded-md hover:border-sangre"
                        >
                            <X size={14} /> {t("admin.cancel")}
                        </button>
                    )}
                </div>
            </form>

            <div className="mt-10" data-testid="prayers-admin-list-wrap">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                    <p className="label-eyebrow m-0">
                        {t("admin.stored_count", { count: items.length })}
                    </p>
                    <div className="relative w-full sm:w-64">
                        <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stoneFaint" />
                        <input
                            type="search"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder={t("admin.filter_placeholder")}
                            data-testid="prayers-admin-filter"
                            className="w-full pl-7 pr-2.5 py-2 bg-white border border-sand-300 rounded-md ui-sans text-xs focus:outline-none focus:border-sangre"
                        />
                    </div>
                </div>

                {loading ? (
                    <p className="text-sm text-stoneMuted">{t("common.loading")}</p>
                ) : visibleItems.length === 0 ? (
                    <p className="text-sm text-stoneMuted italic">
                        {filter ? t("admin.no_filter_matches") : t("admin.empty")}
                    </p>
                ) : (
                    <ul className="divide-y divide-sand-300 border border-sand-300 rounded-md overflow-hidden max-h-[420px] overflow-y-auto">
                        {visibleItems.map((p) => (
                            <li
                                key={p.id}
                                data-testid={`prayers-admin-row-${p.id}`}
                                className="flex items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-white"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="reading-serif text-base m-0 truncate" title={p.title}>{p.title}</p>
                                    <p className="text-xs text-stoneMuted mt-0.5 truncate">
                                        {p.category}
                                        {p.source === "scraped" && (
                                            <span className="ml-2 ui-sans uppercase tracking-widest text-[10px] text-stoneFaint">
                                                {t("admin.imported_badge")}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => onEdit(p)}
                                        data-testid={`prayers-admin-edit-${p.id}`}
                                        aria-label={t("admin.edit")}
                                        title={t("admin.edit")}
                                        className="p-2 text-stoneMuted hover:text-sangre hover:bg-sand-100 rounded-md transition-colors"
                                    >
                                        <PencilSimple size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDelete(p)}
                                        data-testid={`prayers-admin-delete-${p.id}`}
                                        aria-label={t("admin.delete")}
                                        title={t("admin.delete")}
                                        className="p-2 text-stoneMuted hover:text-sangre hover:bg-sand-100 rounded-md transition-colors"
                                    >
                                        <Trash size={16} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
