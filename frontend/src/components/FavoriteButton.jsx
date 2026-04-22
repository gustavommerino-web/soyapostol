import React from "react";
import { Heart } from "@phosphor-icons/react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { useNavigate } from "react-router-dom";

/**
 * Generic favorite toggle button.
 * Props: section, title, content, source_url, metadata, lang
 */
export default function FavoriteButton({ section, title, content, source_url, metadata, testId }) {
    const { user } = useAuth();
    const { lang, t } = useLang();
    const [saving, setSaving] = React.useState(false);
    const navigate = useNavigate();

    const onClick = async () => {
        if (!user) { navigate("/login"); return; }
        if (saving) return;
        setSaving(true);
        try {
            await api.post("/favorites", { section, title, content, source_url, metadata, lang });
            toast.success(t("common.saved"));
        } catch (e) {
            toast.error(t("common.error"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <button onClick={onClick}
            data-testid={testId || `favorite-btn-${section}`}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-stoneMuted hover:text-sangre transition-colors disabled:opacity-50"
            disabled={saving}
            title={t("common.save_favorite")}>
            <Heart size={16} weight={saving ? "fill" : "duotone"} />
            <span className="hidden sm:inline">{t("common.save_favorite")}</span>
        </button>
    );
}
