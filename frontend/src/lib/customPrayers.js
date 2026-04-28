/**
 * Local-storage persistence for admin-uploaded prayers.
 *
 * Shape of a custom prayer:
 *   { id: string, title, category, content, lang, slug, created_at }
 *
 * The slug is namespaced ("custom-…") so it cannot collide with backend slugs.
 */

const STORAGE_KEY = "soyapostol.custom_prayers";

function read() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function write(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    // Notify other components / tabs.
    window.dispatchEvent(new Event("custom-prayers-changed"));
}

function slugify(text) {
    return (text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 80) || "untitled";
}

function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listAll() {
    return read();
}

export function listForLang(lang) {
    return read().filter((p) => (p.lang || "es") === lang);
}

export function getById(id) {
    return read().find((p) => p.id === id) || null;
}

export function getBySlug(slug) {
    return read().find((p) => p.slug === slug) || null;
}

export function create({ title, category, content, lang }) {
    const list = read();
    const item = {
        id: uid(),
        title: title.trim(),
        category: category.trim(),
        content: content.trim(),
        lang: lang || "es",
        slug: `custom-${slugify(title)}-${uid().slice(0, 6)}`,
        created_at: new Date().toISOString(),
    };
    list.push(item);
    write(list);
    return item;
}

export function update(id, { title, category, content }) {
    const list = read();
    const i = list.findIndex((p) => p.id === id);
    if (i < 0) return null;
    list[i] = {
        ...list[i],
        title: title.trim(),
        category: category.trim(),
        content: content.trim(),
        updated_at: new Date().toISOString(),
    };
    write(list);
    return list[i];
}

export function remove(id) {
    const list = read().filter((p) => p.id !== id);
    write(list);
}

/** Build a JSON ready to be downloaded — merges existing API categories with
 *  the locally-stored custom ones. */
export function buildExport(apiCategories, lang) {
    // apiCategories: [{ category, items:[{ slug, title }] }]  (no content here)
    const byCategory = new Map();

    for (const cat of apiCategories || []) {
        byCategory.set(cat.category, cat.items.map((it) => ({
            slug: it.slug,
            title: it.title,
            // API content is not bundled in the listing endpoint; include only
            // a marker so the consumer knows it lives on the backend.
            source: "backend",
        })));
    }

    for (const p of listForLang(lang)) {
        const arr = byCategory.get(p.category) || [];
        arr.push({
            slug: p.slug,
            title: p.title,
            content: p.content,
            source: "custom",
            created_at: p.created_at,
            updated_at: p.updated_at,
        });
        byCategory.set(p.category, arr);
    }

    return {
        lang,
        exported_at: new Date().toISOString(),
        categories: Array.from(byCategory.entries()).map(([category, items]) => ({
            category,
            items,
        })),
    };
}

export function downloadJSON(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
