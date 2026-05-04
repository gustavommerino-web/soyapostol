import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import api from "@/lib/api";

/**
 * Lightweight count of the current user's favourites in the UI language.
 *
 * We deliberately piggyback on the existing `GET /api/favorites` endpoint
 * (one cheap round-trip) instead of adding a dedicated `/count` route —
 * the payload is small, the data model is already there, and it keeps
 * the backend surface tight. The count is the single number the header
 * badge needs.
 *
 * Consumers call `refresh()` after any POST/DELETE to /api/favorites so
 * the badge stays in sync without a page reload.
 */
const FavoritesCountContext = createContext({ count: 0, refresh: () => {} });

export function FavoritesCountProvider({ children }) {
    const { user } = useAuth();
    const { lang } = useLang();
    const [count, setCount] = useState(0);

    const refresh = useCallback(async () => {
        if (!user) { setCount(0); return; }
        try {
            const r = await api.get("/favorites");
            const items = Array.isArray(r.data) ? r.data : [];
            // Mirror the lang filter from Favorites.jsx: legacy rows
            // without `lang` are treated as Spanish (the old default).
            setCount(items.filter((i) => (i.lang || "es") === lang).length);
        } catch {
            // Silent — a badge is not worth a toast and we'll recover on
            // the next refresh.
        }
    }, [user, lang]);

    useEffect(() => { refresh(); }, [refresh]);

    return (
        <FavoritesCountContext.Provider value={{ count, refresh }}>
            {children}
        </FavoritesCountContext.Provider>
    );
}

export const useFavoritesCount = () => useContext(FavoritesCountContext);
