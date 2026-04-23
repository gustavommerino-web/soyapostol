import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";

const HERO_IMG = "https://images.pexels.com/photos/33527869/pexels-photo-33527869.jpeg";

export default function Register() {
    const { register, error, user, setError } = useAuth();
    const { t } = useLang();
    const navigate = useNavigate();
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [name, setName] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);

    React.useEffect(() => { if (user) navigate("/"); }, [user, navigate]);
    React.useEffect(() => { setError && setError(""); }, [setError]);

    const onSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const ok = await register(email, password, name);
        setSubmitting(false);
        if (ok) navigate("/");
    };

    return (
        <div className="min-h-screen bg-sand-50 flex">
            <div className="hidden lg:block w-1/2 relative overflow-hidden">
                <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-stone900/55" />
                <div className="relative z-10 h-full flex flex-col justify-end p-16 text-sand-50">
                    <img src="/logo.png" alt="soyapostol" className="h-14 w-14 object-contain mb-6" />
                    <h2 className="heading-serif text-5xl leading-none mb-3">soyapostol</h2>
                    <p className="reading-serif italic text-xl text-sand-100/90 max-w-md">"Venid a mí, todos los que estáis cansados."</p>
                    <p className="ui-sans text-sm text-sand-100/70 mt-1">Mateo 11, 28</p>
                </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
                <div className="w-full max-w-sm">
                    <div className="lg:hidden flex items-center gap-3 mb-10">
                        <img src="/logo.png" alt="soyapostol" className="h-9 w-9 object-contain" />
                        <span className="heading-serif text-3xl font-semibold">soyapostol</span>
                    </div>
                    <p className="label-eyebrow mb-3">{t("common.join_apostol")}</p>
                    <h1 className="heading-serif text-4xl sm:text-5xl tracking-tight leading-none mb-10">{t("common.create_account")}</h1>

                    <form onSubmit={onSubmit} className="space-y-5" data-testid="register-form">
                        <div>
                            <label className="label-eyebrow block mb-2">{t("common.name")}</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                                data-testid="register-name-input"
                                className="w-full px-3 py-3 bg-sand-100 border border-sand-300 rounded-md focus:outline-none focus:border-sangre transition-colors ui-sans" />
                        </div>
                        <div>
                            <label className="label-eyebrow block mb-2">{t("common.email")}</label>
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                data-testid="register-email-input"
                                className="w-full px-3 py-3 bg-sand-100 border border-sand-300 rounded-md focus:outline-none focus:border-sangre transition-colors ui-sans" />
                        </div>
                        <div>
                            <label className="label-eyebrow block mb-2">{t("common.password")}</label>
                            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                                data-testid="register-password-input"
                                className="w-full px-3 py-3 bg-sand-100 border border-sand-300 rounded-md focus:outline-none focus:border-sangre transition-colors ui-sans" />
                        </div>
                        {error && <p className="text-sangre text-sm" data-testid="register-error">{error}</p>}
                        <button type="submit" disabled={submitting} data-testid="register-submit-btn"
                            className="btn-primary w-full disabled:opacity-60">
                            {submitting ? t("common.loading") : t("common.create_account")}
                        </button>
                    </form>

                    <p className="mt-8 text-sm text-stoneMuted">
                        {t("common.have_account")} <Link to="/login" className="text-sangre hover:underline" data-testid="goto-login-link">{t("common.sign_in")}</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
