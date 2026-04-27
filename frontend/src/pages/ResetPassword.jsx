import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useLang } from "@/contexts/LangContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle } from "@phosphor-icons/react";

const HERO_IMG = "https://images.pexels.com/photos/33527869/pexels-photo-33527869.jpeg";

export default function ResetPassword() {
    const { t } = useLang();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const token = params.get("token") || "";

    const [password, setPassword] = React.useState("");
    const [confirm, setConfirm] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [success, setSuccess] = React.useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 8) {
            toast.error(t("auth.password_too_short"));
            return;
        }
        if (password !== confirm) {
            toast.error(t("auth.passwords_mismatch"));
            return;
        }
        setSubmitting(true);
        try {
            await api.post("/auth/reset-password", { token, new_password: password });
            setSuccess(true);
            toast.success(t("auth.password_updated"));
            setTimeout(() => navigate("/login"), 1800);
        } catch (err) {
            toast.error(err.response?.data?.detail || err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-sand-50 flex">
            <div className="hidden lg:block w-1/2 relative overflow-hidden">
                <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-stone900/55" />
                <div className="relative z-10 h-full flex flex-col justify-end p-16 text-sand-50">
                    <img src="/logo.png" alt="soyapostol" className="h-14 w-14 object-contain mb-6" />
                    <h2 className="heading-serif text-5xl leading-none mb-3">soyapostol</h2>
                    <p className="reading-serif italic text-xl text-sand-100/90 max-w-md">"Permaneced en mi amor."</p>
                    <p className="ui-sans text-sm text-sand-100/70 mt-1">Juan 15, 9</p>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
                <div className="w-full max-w-sm" data-testid="reset-password-page">
                    <button
                        type="button"
                        onClick={() => navigate("/login")}
                        data-testid="reset-back-btn"
                        className="ui-sans text-sm text-stoneMuted hover:text-sangre inline-flex items-center gap-1.5 mb-8"
                    >
                        <ArrowLeft size={14} weight="bold" /> {t("common.sign_in")}
                    </button>

                    <p className="label-eyebrow mb-3">{t("auth.recover_eyebrow")}</p>
                    <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-10">
                        {t("auth.reset_password")}
                    </h1>

                    {!token && (
                        <p
                            className="text-sangre text-sm mb-6"
                            data-testid="reset-missing-token"
                        >
                            {t("auth.reset_missing_token")}
                        </p>
                    )}

                    {success ? (
                        <div className="surface-card p-6 flex items-center gap-3" data-testid="reset-success">
                            <CheckCircle size={28} weight="duotone" className="text-sangre" />
                            <p className="reading-serif">{t("auth.password_updated")}</p>
                        </div>
                    ) : (
                        <form onSubmit={onSubmit} className="space-y-5" data-testid="reset-form">
                            <div>
                                <label className="label-eyebrow block mb-2">{t("auth.new_password")}</label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    data-testid="reset-password-input"
                                    className="w-full px-3 py-3 bg-sand-100 border border-sand-300 rounded-md focus:outline-none focus:border-sangre transition-colors ui-sans"
                                />
                            </div>
                            <div>
                                <label className="label-eyebrow block mb-2">{t("auth.confirm_password")}</label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    data-testid="reset-confirm-input"
                                    className="w-full px-3 py-3 bg-sand-100 border border-sand-300 rounded-md focus:outline-none focus:border-sangre transition-colors ui-sans"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting || !token}
                                data-testid="reset-submit-btn"
                                className="btn-primary w-full disabled:opacity-60"
                            >
                                {submitting ? t("common.loading") : t("auth.update_password")}
                            </button>
                        </form>
                    )}

                    <p className="mt-8 text-sm text-stoneMuted">
                        <Link to="/login" className="text-sangre hover:underline" data-testid="reset-login-link">
                            {t("common.sign_in")}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
