import React from "react";
import { Link } from "react-router-dom";
import { useLang } from "@/contexts/LangContext";
import InstallPwaBanner from "@/components/InstallPwaBanner";
import {
    BookOpen, Sun, HandsPraying, BookOpenText, Newspaper, BookBookmark, Books, Heart, Cross, ArrowRight,
} from "@phosphor-icons/react";

const TILES = [
    { to: "/readings",  key: "readings",  Icon: BookOpen,     accent: "sangre" },
    { to: "/liturgy",   key: "liturgy",   Icon: Sun,          accent: "gold" },
    { to: "/prayers",   key: "prayers",   Icon: HandsPraying, accent: "sangre" },
    { to: "/rosary",    key: "rosary",    Icon: Cross,        accent: "gold" },
    { to: "/examen",    key: "examen",    Icon: BookOpenText, accent: "stone" },
    { to: "/news",      key: "news",      Icon: Newspaper,    accent: "stone" },
    { to: "/bible",     key: "bible",     Icon: BookBookmark, accent: "sangre" },
    { to: "/catechism", key: "catechism", Icon: Books,        accent: "gold" },
    { to: "/favorites", key: "favorites", Icon: Heart,        accent: "sangre" },
];

const accentClass = (a) => ({
    sangre: "text-sangre",
    gold:   "text-gold",
    stone:  "text-stoneMuted",
}[a] || "text-sangre");

export default function Dashboard() {
    const { t, lang } = useLang();

    const today = new Intl.DateTimeFormat(lang === "es" ? "es-ES" : "en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    }).format(new Date());

    return (
        <div data-testid="dashboard-page">
            <section className="mb-10">
                <p className="label-eyebrow mb-4">{today}</p>
            </section>

            <InstallPwaBanner />

            {/* Verse of the day — moved to the top */}
            <section className="mb-12 max-w-3xl" data-testid="verse-of-the-day">
                <div className="border-l-2 border-sangre pl-6">
                    <p className="label-eyebrow mb-3">{lang === "es" ? "Versículo del día" : "Verse of the day"}</p>
                    <p className="reading-serif italic text-2xl leading-relaxed text-stone900">
                        {lang === "es"
                            ? '"Yo soy el camino, la verdad y la vida; nadie va al Padre sino por mí."'
                            : '"I am the way, and the truth, and the life. No one comes to the Father except through me."'}
                    </p>
                    <p className="ui-sans text-sm text-stoneMuted mt-3">
                        {lang === "es" ? "Juan 14, 6" : "John 14:6"}
                    </p>
                </div>
            </section>

            {/* Bento grid */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {TILES.map((tile, idx) => (
                    <Link key={tile.key} to={tile.to}
                        data-testid={`tile-${tile.key}`}
                        style={{ animationDelay: `${idx * 60}ms` }}
                        className={`surface-card p-7 group flex flex-col justify-between min-h-[180px] animate-fade-up`}>
                        <div className="flex items-start justify-between">
                            <tile.Icon size={36} weight="duotone" className={accentClass(tile.accent)} />
                            <ArrowRight size={18} weight="bold" className="text-stoneFaint group-hover:text-sangre group-hover:translate-x-1 transition-all" />
                        </div>
                        <div className="mt-8">
                            <h3 className="heading-serif text-2xl tracking-tight mb-1">{t(`nav.${tile.key}`)}</h3>
                            <p className="text-sm text-stoneMuted leading-relaxed">{t(`sections.${tile.key}_desc`)}</p>
                        </div>
                    </Link>
                ))}
            </section>
        </div>
    );
}
