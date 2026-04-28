import React from "react";
import { toast } from "sonner";
import { Plus, PencilSimple, Trash, FloppyDisk, X, DownloadSimple } from "@phosphor-icons/react";
import { useLang } from "@/contexts/LangContext";
import * as Custom from "@/lib/customPrayers";

const NEW_CATEGORY = "__new__";
const EMPTY = { title: "", categorySelect: "", newCategory: "", content: "", editingId: null };

/**
 * Admin-only management UI for prayers.
 * - Form to add new prayers (title, category dropdown w/ "Nueva" option, textarea).
 * - List of stored custom prayers with Edit / Delete actions.
 * - Export button that downloads a merged JSON.
 */
export default function PrayersAdmin({ apiCategories, onChange }) {
    const { t, lang } = useLang();
    const [items, setItems] = React.useState(() => Custom.listForLang(lang));
    const [form, setForm] = React.useState(EMPTY);

    // Refresh local list when storage changes (e.g. after create/update/delete).
    React.useEffect(() => {
        const refresh = () => setItems(Custom.listForLang(lang));
        refresh();
        window.addEventListener("custom-prayers-changed", refresh);
        window.addEventListener("storage", refresh);
        return () => {
            window.removeEventListener("custom-prayers-changed", refresh);
            window.removeEventListener("storage", refresh);
        };
    }, [lang]);

    const apiCategoryNames = (apiCategories || []).map((c) => c.category);
    const customCategoryNames = Array.from(new Set(items.map((p) => p.category)));
    const allCategories = Array.from(new Set([...apiCategoryNames, ...customCategoryNames]))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, lang === "es" ? "es" : "en"));

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

    const onDelete = (p) => {
        if (!window.confirm(t("admin.confirm_delete", { title: p.title }))) return;
        Custom.remove(p.id);
        toast.success(t("admin.deleted"));
        if (form.editingId === p.id) resetForm();
        if (onChange) onChange();
    };

    const onSubmit = (e) => {
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
        if (form.editingId) {
            Custom.update(form.editingId, { title, category, content });
            toast.success(t("admin.updated"));
        } else {
            Custom.create({ title, category, content, lang });
            toast.success(t("admin.created"));
        }
        resetForm();
        if (onChange) onChange();
    };

    const onExport = () => {
        const data = Custom.buildExport(apiCategories, lang);
        const filename = `oraciones-${lang}-${new Date().toISOString().slice(0, 10)}.json`;
        Custom.downloadJSON(filename, data);
        toast.success(t("admin.exported", { filename }));
    };

    return (
        <section
            className="surface-card p-6 sm:p-7 mb-12 border-sangre/30"
            data-testid="prayers-admin-panel"
        >
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <p className="label-eyebrow m-0">{t("admin.eyebrow")}</p>
                <button
                    type="button"
                    onClick={onExport}
                    data-testid="prayers-admin-export"
                    className="ui-sans text-xs inline-flex items-center gap-1.5 px-3 py-2 border border-sangre text-sangre rounded-md hover:bg-sangre hover:text-sand-50 transition-colors"
                >
                    <DownloadSimple size={14} weight="bold" />
                    {t("admin.export_json")}
                </button>
            </div>

            <h2 className="heading-serif text-2xl tracking-tight mb-1">
                {form.editingId ? t("admin.edit_prayer") : t("admin.new_prayer")}
            </h2>
            <p className="text-xs text-stoneMuted mb-5">
                {t("admin.local_hint")}
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
                        data-testid="prayers-admin-submit"
                        className="btn-primary inline-flex items-center gap-2"
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

            {/* Existing custom prayers — control list */}
            <div className="mt-10" data-testid="prayers-admin-list-wrap">
                <p className="label-eyebrow mb-3">
                    {t("admin.stored_count", { count: items.length })}
                </p>
                {items.length === 0 ? (
                    <p className="text-sm text-stoneMuted italic">{t("admin.empty")}</p>
                ) : (
                    <ul className="divide-y divide-sand-300 border border-sand-300 rounded-md overflow-hidden">
                        {items.map((p) => (
                            <li
                                key={p.id}
                                data-testid={`prayers-admin-row-${p.id}`}
                                className="flex items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-white"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="reading-serif text-base m-0 truncate" title={p.title}>{p.title}</p>
                                    <p className="text-xs text-stoneMuted mt-0.5 truncate">
                                        {p.category} · {new Date(p.created_at).toLocaleDateString(lang === "es" ? "es-ES" : "en-US")}
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
