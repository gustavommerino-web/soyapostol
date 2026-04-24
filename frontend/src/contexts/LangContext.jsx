import React, { createContext, useContext, useEffect, useState } from "react";

const STRINGS = {
    es: {
        app_name: "soyapostol",
        tagline: "",
        nav: {
            dashboard: "Inicio",
            readings: "Lecturas",
            liturgy: "Liturgia de las Horas",
            prayers: "Oraciones",
            examen: "Examen de Conciencia",
            news: "Noticias",
            bible: "Biblia",
            catechism: "Catecismo",
            favorites: "Favoritos",
            login: "Entrar",
            register: "Crear cuenta",
            logout: "Salir",
        },
        common: {
            loading: "Cargando…",
            error: "Error",
            today: "Hoy",
            source: "Fuente",
            save_favorite: "Guardar en favoritos",
            saved: "Guardado",
            remove: "Quitar",
            email: "Correo electrónico",
            password: "Contraseña",
            name: "Nombre",
            sign_in: "Iniciar sesión",
            create_account: "Crear cuenta",
            no_account: "¿No tienes cuenta?",
            have_account: "¿Ya tienes cuenta?",
            welcome_back: "Bienvenido de nuevo",
            join_apostol: "Únete a Apostol",
            select: "Seleccionar",
            view: "Ver",
            search: "Buscar",
            refresh: "Actualizar",
        },
        sections: {
            readings_desc: "Las lecturas del día con comentario del Evangelio",
            liturgy_desc: "Oración litúrgica de las Horas",
            prayers_desc: "Compendio de oraciones católicas",
            examen_desc: "Recursos para tu examen de conciencia",
            news_desc: "EWTN, ACI Prensa y Vatican News",
            bible_desc: "La Sagrada Biblia católica completa",
            catechism_desc: "Catecismo de la Iglesia Católica",
            favorites_desc: "Tus textos guardados",
        },
        readings: { first: "Primera Lectura", psalm: "Salmo", second: "Segunda Lectura", gospel: "Evangelio", commentary: "Comentario" },
        examen: { upload: "Subir documento", title: "Título", description: "Descripción", file: "Archivo", admin_only: "Solo el administrador puede subir documentos.", empty: "Aún no hay documentos." },
    },
    en: {
        app_name: "soyapostol",
        tagline: "",
        nav: {
            dashboard: "Home",
            readings: "Readings",
            liturgy: "Liturgy of the Hours",
            prayers: "Prayers",
            examen: "Examen of Conscience",
            news: "News",
            bible: "Bible",
            catechism: "Catechism",
            favorites: "Favorites",
            login: "Sign in",
            register: "Create account",
            logout: "Sign out",
        },
        common: {
            loading: "Loading…",
            error: "Error",
            today: "Today",
            source: "Source",
            save_favorite: "Save to favorites",
            saved: "Saved",
            remove: "Remove",
            email: "Email",
            password: "Password",
            name: "Name",
            sign_in: "Sign in",
            create_account: "Create account",
            no_account: "Don't have an account?",
            have_account: "Already have an account?",
            welcome_back: "Welcome back",
            join_apostol: "Join Apostol",
            select: "Select",
            view: "View",
            search: "Search",
            refresh: "Refresh",
        },
        sections: {
            readings_desc: "Today's readings with Gospel commentary",
            liturgy_desc: "Liturgy of the Hours prayer",
            prayers_desc: "Compendium of Catholic prayers",
            examen_desc: "Resources for your examination of conscience",
            news_desc: "EWTN, ACI Prensa and Vatican News",
            bible_desc: "The complete Catholic Holy Bible",
            catechism_desc: "Catechism of the Catholic Church",
            favorites_desc: "Your saved passages",
        },
        readings: { first: "First Reading", psalm: "Psalm", second: "Second Reading", gospel: "Gospel", commentary: "Commentary" },
        examen: { upload: "Upload document", title: "Title", description: "Description", file: "File", admin_only: "Only the administrator can upload documents.", empty: "No documents yet." },
    },
};

const LangContext = createContext(null);

export function LangProvider({ children }) {
    const [lang, setLang] = useState(() => localStorage.getItem("apostol_lang") || "es");
    useEffect(() => { localStorage.setItem("apostol_lang", lang); }, [lang]);

    const t = (path) => {
        const parts = path.split(".");
        let v = STRINGS[lang];
        for (const p of parts) {
            if (v && Object.prototype.hasOwnProperty.call(v, p)) v = v[p];
            else return path;
        }
        return v;
    };
    return (
        <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
    );
}

export const useLang = () => useContext(LangContext);
