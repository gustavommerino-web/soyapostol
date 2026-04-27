import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "@/contexts/LangContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Copy } from "@phosphor-icons/react";

const HERO_IMG = "https://images.pexels.com/photos/33527869/pexels-photo-33527869.jpeg";

export default function ForgotPassword() {
    const { t } = useLang();
    const navigate = useNavigate();
    const [email, setEmail] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [resetUrl, setResetUrl] = React.useState("");

    const onSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setResetUrl("");
        try {
            const res = await api.post("/auth/forgot-password", { email });
            // Demo-only: backend returns reset_path when the email matches a user.
            if (res.data?.reset_path) {
                const url = `${window.location.origin}${res.data.reset_path}`;
                setResetUrl(url);
                toast.success(t("auth.reset_link_issued"), {
                    description: t("auth.reset_link_demo_hint"),
                    duration: 8000,
                });
            } else {
                toast.success(t("auth.reset_link_sent_generic"));
            }
        } catch (err) {
            toast.error(err.response?.data?.detail || err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(resetUrl);
            toast.success(t("auth.link_copied"));
        } catch {
            toast.error(t("common.error"));
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
                <div className="w-full max-w-sm" data-testid="forgot-password-page">
                    <button
                        type="button"
                        onClick={() => navigate("/login")}
                        data-testid="forgot-back-btn"
                        className="ui-sans text-sm text-stoneMuted hover:text-sangre inline-flex items-center gap-1.5 mb-8"
                    >
                        <ArrowLeft size={14} weight="bold" /> {t("common.sign_in")}
                    </button>

                    <p className="label-eyebrow mb-3">{t("auth.recover_eyebrow")}</p>
                    <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-4">
                        {t("auth.forgot_password")}
                    </h1>
                    <p className="reading-serif text-stoneMuted mb-10">
                        {t("auth.forgot_password_intro")}
                    </p>

                    <form onSubmit={onSubmit} className="space-y-5" data-testid="forgot-form">
                        <div>
                            <label className="label-eyebrow block mb-2">{t("common.email")}</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                data-testid="forgot-email-input"
                                className="w-full px-3 py-3 bg-sand-100 border border-sand-300 rounded-md focus:outline-none focus:border-sangre transition-colors ui-sans"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            data-testid="forgot-submit-btn"
                            className="btn-primary w-full disabled:opacity-60"
                        >
                            {submitting ? t("common.loading") : t("auth.send_reset_link")}
                        </button>
                    </form>

                    {resetUrl && (
                        <div
                            className="surface-card p-4 mt-8"
                            data-testid="forgot-demo-link-box"
                        >
                            <p className="label-eyebrow mb-2">{t("auth.demo_link_label")}</p>
                            <p className="text-xs text-stoneMuted mb-3 leading-relaxed">
                                {t("auth.demo_link_help")}
                            </p>
                            <div className="flex items-center gap-2">
                                <code
                                    className="text-xs bg-sand-100 border border-sand-300 px-2 py-2 rounded-md flex-1 truncate ui-sans"
                                    data-testid="forgot-demo-link"
                                    title={resetUrl}
                                >
                                    {resetUrl}
                                </code>
                                <button
                                    type="button"
                                    onClick={copyLink}
                                    data-testid="forgot-copy-link-btn"
                                    className="ui-sans text-xs px-3 py-2 border border-sand-300 rounded-md hover:border-sangre inline-flex items-center gap-1.5 shrink-0"
                                >
                                    <Copy size={14} /> {t("auth.copy")}
                                </button>
                            </div>
                            <Link
                                to={new URL(resetUrl).pathname + new URL(resetUrl).search}
                                data-testid="forgot-open-link"
                                className="ui-sans text-xs text-sangre hover:underline mt-3 inline-block"
                            >
                                {t("auth.open_reset_page")} →
                            </Link>
                        </div>
                    )}

                    <p className="mt-8 text-sm text-stoneMuted">
                        <Link to="/login" className="text-sangre hover:underline" data-testid="forgot-login-link">
                            {t("common.sign_in")}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
