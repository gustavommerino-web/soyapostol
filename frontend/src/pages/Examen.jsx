import React from "react";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import api, { API } from "@/lib/api";
import { toast } from "sonner";
import { UploadSimple, FilePdf, FileText, Trash } from "@phosphor-icons/react";

export default function Examen() {
    const { t, lang } = useLang();
    const { user } = useAuth();
    const isAdmin = user && user.role === "admin";
    const [docs, setDocs] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [title, setTitle] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [file, setFile] = React.useState(null);
    const [uploading, setUploading] = React.useState(false);

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const r = await api.get("/examen");
            setDocs(r.data);
        } finally { setLoading(false); }
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const onUpload = async (e) => {
        e.preventDefault();
        if (!file || !title) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("title", title);
            fd.append("description", description);
            fd.append("lang", lang);
            await api.post("/examen/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
            toast.success(t("common.saved"));
            setTitle(""); setDescription(""); setFile(null);
            await load();
        } catch (err) {
            toast.error(err.response?.data?.detail || err.message);
        } finally { setUploading(false); }
    };

    const onDelete = async (id) => {
        try { await api.delete(`/examen/${id}`); await load(); }
        catch (err) { toast.error(err.response?.data?.detail || err.message); }
    };

    const fileIcon = (ct) => ct?.includes("pdf") ? <FilePdf size={28} weight="duotone" className="text-sangre" /> : <FileText size={28} weight="duotone" className="text-stoneMuted" />;

    return (
        <div className="max-w-4xl mx-auto" data-testid="examen-page">
            <p className="label-eyebrow mb-3">{t("nav.examen")}</p>
            <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-3">{t("nav.examen")}</h1>
            <p className="text-stoneMuted mb-10 max-w-2xl">{t("sections.examen_desc")}</p>

            {isAdmin ? (
                <form onSubmit={onUpload} className="surface-card p-6 mb-10 grid gap-4" data-testid="examen-upload-form">
                    <p className="label-eyebrow">{t("examen.upload")}</p>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("examen.title")}
                        required data-testid="examen-title-input"
                        className="px-3 py-2.5 bg-sand-50 border border-sand-300 rounded-md ui-sans text-sm focus:outline-none focus:border-sangre" />
                    <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("examen.description")}
                        data-testid="examen-desc-input"
                        className="px-3 py-2.5 bg-sand-50 border border-sand-300 rounded-md ui-sans text-sm focus:outline-none focus:border-sangre" />
                    <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)}
                        accept=".pdf,.doc,.docx,.txt,.md" required data-testid="examen-file-input"
                        className="ui-sans text-sm file:mr-3 file:px-4 file:py-2 file:rounded-md file:border-0 file:bg-sangre file:text-sand-50" />
                    <button type="submit" disabled={uploading} className="btn-primary inline-flex items-center gap-2 self-start"
                        data-testid="examen-upload-btn">
                        <UploadSimple size={16} weight="bold" /> {uploading ? t("common.loading") : t("examen.upload")}
                    </button>
                </form>
            ) : (
                <p className="text-sm text-stoneFaint mb-8 italic" data-testid="examen-admin-note">{t("examen.admin_only")}</p>
            )}

            {loading && <p className="text-stoneMuted">{t("common.loading")}</p>}
            {!loading && docs.length === 0 && <p className="text-stoneMuted" data-testid="examen-empty">{t("examen.empty")}</p>}

            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="examen-list">
                {docs.map((d) => (
                    <li key={d.id} className="surface-card p-5 flex items-start gap-4" data-testid={`examen-item-${d.id}`}>
                        {fileIcon(d.content_type)}
                        <div className="flex-1 min-w-0">
                            <h3 className="reading-serif text-lg leading-snug truncate">{d.title}</h3>
                            {d.description && <p className="text-sm text-stoneMuted mt-1">{d.description}</p>}
                            <div className="mt-3 flex items-center gap-3">
                                <a href={`${API}/examen/${d.id}/file`} target="_blank" rel="noreferrer"
                                    className="ui-sans text-xs uppercase tracking-widest text-sangre hover:underline"
                                    data-testid={`examen-view-${d.id}`}>{t("common.view")}</a>
                                {isAdmin && (
                                    <button onClick={() => onDelete(d.id)}
                                        data-testid={`examen-delete-${d.id}`}
                                        className="ui-sans text-xs uppercase tracking-widest text-stoneFaint hover:text-sangre inline-flex items-center gap-1">
                                        <Trash size={14} /> {t("common.remove")}
                                    </button>
                                )}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
