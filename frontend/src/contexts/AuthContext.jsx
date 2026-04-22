import React, { createContext, useContext, useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);     // null = checking, false = anon, object = user
    const [error, setError] = useState("");

    useEffect(() => {
        let mounted = true;
        api.get("/auth/me")
            .then((res) => mounted && setUser(res.data))
            .catch(() => mounted && setUser(false));
        return () => { mounted = false; };
    }, []);

    const login = async (email, password) => {
        setError("");
        try {
            const res = await api.post("/auth/login", { email, password });
            setUser(res.data);
            return true;
        } catch (e) {
            setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
            return false;
        }
    };

    const register = async (email, password, name) => {
        setError("");
        try {
            const res = await api.post("/auth/register", { email, password, name });
            setUser(res.data);
            return true;
        } catch (e) {
            setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
            return false;
        }
    };

    const logout = async () => {
        try { await api.post("/auth/logout"); } catch (e) { /* ignore */ }
        setUser(false);
    };

    return (
        <AuthContext.Provider value={{ user, error, login, register, logout, setError }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
