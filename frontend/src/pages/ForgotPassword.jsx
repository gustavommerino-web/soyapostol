import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "@/contexts/LangContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, EnvelopeSimple } from "@phosphor-icons/react";

const HERO_IMG = "https://images.pexels.com/photos/33527869/pexels-photo-33527869.jpeg";

export default function ForgotPassword() {
    const { t, lang } = useLang();
    const navigate = useNavigate();
    const [email, setEmail] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [submitted, setSubmitted] = React.useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post("/auth/forgot-password", { email, lang });
            setSubmitted(true);
            toast.success(t("auth.reset_link_sent_generic"));
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

                    {!submitted ? (
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
                    ) : (
                        <div
                            className="surface-card p-5 sm:p-6"
                            data-testid="forgot-sent-confirmation"
                            style={{ borderLeft: "3px solid #B33A3A" }}
                        >
                            <div className="flex items-start gap-4">
                                <div
                                    className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-sangre/10 text-sangre"
                                    aria-hidden="true"
                                >
                                    <EnvelopeSimple size={22} weight="duotone" />
                                </div>
                                <div>
                                    <h2 className="heading-serif text-xl leading-tight mb-1">
                                        {t("auth.check_inbox_title")}
                                    </h2>
                                    <p className="reading-serif text-sm text-stone900 leading-relaxed">
                                        {t("auth.check_inbox_hint").replace("{email}", email)}
                                    </p>
                                    <p className="text-xs text-stoneMuted mt-3 leading-relaxed">
                                        {t("auth.check_spam_hint")}
                                    </p>
                                </div>
                            </div>
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

