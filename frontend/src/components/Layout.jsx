import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { Cross, BookOpen, Heart, SignOut, Translate, List } from "@phosphor-icons/react";
import { Toaster } from "sonner";

const NAV_ITEMS = [
    { to: "/", key: "dashboard", end: true },
    { to: "/readings", key: "readings" },
    { to: "/liturgy", key: "liturgy" },
    { to: "/prayers", key: "prayers" },
    { to: "/examen", key: "examen" },
    { to: "/news", key: "news" },
    { to: "/bible", key: "bible" },
    { to: "/catechism", key: "catechism" },
    { to: "/favorites", key: "favorites" },
];

export default function Layout() {
    const { user, logout } = useAuth();
    const { lang, setLang, t } = useLang();
    const navigate = useNavigate();
    const [navOpen, setNavOpen] = React.useState(false);

    const onLogout = async () => { await logout(); navigate("/login"); };

    return (
        <div className="min-h-screen bg-sand-50 text-stone900">
            {/* Header */}
            <header className="border-b border-sand-300 bg-sand-50 sticky top-0 z-30 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex items-center justify-between gap-4">
                    <Link to="/" className="flex items-center gap-3" data-testid="header-logo">
                        <Cross size={28} weight="duotone" className="text-sangre" />
                        <div className="leading-none">
                            <div className="heading-serif text-2xl font-semibold tracking-tight">{t("app_name")}</div>
                            <div className="label-eyebrow text-[10px] mt-0.5 hidden sm:block">{t("tagline")}</div>
                        </div>
                    </Link>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Lang toggle */}
                        <div className="flex items-center gap-1 border border-sand-300 rounded-md p-0.5 bg-sand-100" data-testid="lang-toggle">
                            <button
                                onClick={() => setLang("es")}
                                data-testid="lang-toggle-es"
                                className={`px-3 py-1 text-xs uppercase tracking-widest rounded-sm transition-colors ${lang === "es" ? "bg-sangre text-sand-50" : "text-stoneMuted hover:text-stone900"}`}
                            >ES</button>
                            <button
                                onClick={() => setLang("en")}
                                data-testid="lang-toggle-en"
                                className={`px-3 py-1 text-xs uppercase tracking-widest rounded-sm transition-colors ${lang === "en" ? "bg-sangre text-sand-50" : "text-stoneMuted hover:text-stone900"}`}
                            >EN</button>
                        </div>

                        {user ? (
                            <button onClick={onLogout} data-testid="logout-btn"
                                className="ui-sans text-sm flex items-center gap-2 px-3 py-2 border border-sand-300 rounded-md hover:border-sangre transition-colors">
                                <SignOut size={16} weight="bold" />
                                <span className="hidden sm:inline">{t("nav.logout")}</span>
                            </button>
                        ) : (
                            <>
                                <Link to="/login" data-testid="header-login-link"
                                    className="ui-sans text-sm px-3 py-2 hover:text-sangre transition-colors">{t("nav.login")}</Link>
                                <Link to="/register" data-testid="header-register-link"
                                    className="btn-primary text-sm">{t("nav.register")}</Link>
                            </>
                        )}

                        <button onClick={() => setNavOpen(!navOpen)} data-testid="nav-toggle"
                            className="lg:hidden p-2 rounded-md border border-sand-300">
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
                {/* Side nav */}
                <aside className={`${navOpen ? 'block' : 'hidden'} lg:block w-full lg:w-60 lg:shrink-0 border-r border-sand-300 lg:min-h-[calc(100vh-73px)] py-8 px-6`}>
                    <nav className="flex flex-col gap-1">
                        {NAV_ITEMS.map((item) => (
                            <NavLink key={item.key} to={item.to} end={item.end}
                                onClick={() => setNavOpen(false)}
                                data-testid={`nav-${item.key}`}
                                className={({ isActive }) =>
                                    `ui-sans text-sm px-3 py-2 rounded-md border-l-2 transition-colors ${isActive ? 'border-sangre text-sangre bg-sand-100 font-medium' : 'border-transparent text-stoneMuted hover:text-stone900 hover:bg-sand-100/50'}`
                                }>
                                {t(`nav.${item.key}`)}
                            </NavLink>
                        ))}
                    </nav>
                </aside>

                {/* Main content */}
                <main className="flex-1 px-6 lg:px-12 py-10 lg:py-14 min-h-[calc(100vh-73px)]" data-testid="main-content">
                    <Outlet />
                </main>
            </div>

            {/* Footer */}
            <footer className="border-t border-sand-300 py-6 px-6 lg:px-10 text-center">
                <p className="label-eyebrow">Apostol &middot; Ad maiorem Dei gloriam</p>
            </footer>

            <Toaster position="bottom-right" richColors closeButton />
        </div>
    );
}
