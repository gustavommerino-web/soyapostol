import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LangProvider } from "@/contexts/LangContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Readings from "@/pages/Readings";
import Liturgy from "@/pages/Liturgy";
import Prayers from "@/pages/Prayers";
import Examen from "@/pages/Examen";
import News from "@/pages/News";
import Bible from "@/pages/Bible";
import Catechism from "@/pages/Catechism";
import Favorites from "@/pages/Favorites";
import Rosary from "@/pages/Rosary";
import Settings from "@/pages/Settings";
import AccountDeleted from "@/pages/AccountDeleted";

function PublicOnly({ children }) {
    const { user } = useAuth();
    if (user === null) return null; // checking
    if (user) return <Navigate to="/" replace />;
    return children;
}

function App() {
    return (
        <LangProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
                        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
                        <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
                        <Route path="/reset-password" element={<PublicOnly><ResetPassword /></PublicOnly>} />
                        <Route element={<Layout />}>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/readings" element={<Readings />} />
                            <Route path="/liturgy" element={<Liturgy />} />
                            <Route path="/prayers" element={<Prayers />} />
                            <Route path="/rosary" element={<Rosary />} />
                            <Route path="/examen" element={<Examen />} />
                            <Route path="/news" element={<News />} />
                            <Route path="/bible" element={<Bible />} />
                            <Route path="/catechism" element={<Catechism />} />
                            <Route path="/favorites" element={<Favorites />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/account-deleted" element={<AccountDeleted />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </LangProvider>
    );
}

export default App;
