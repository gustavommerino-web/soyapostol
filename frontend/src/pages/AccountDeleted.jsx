import React from "react";
import { Link } from "react-router-dom";
import { useLang } from "@/contexts/LangContext";
import { Heart } from "@phosphor-icons/react";

export default function AccountDeleted() {
    const { t } = useLang();

    return (
        <div
            data-testid="account-deleted-page"
            className="min-h-[60vh] flex items-center justify-center px-4"
        >
            <div className="max-w-lg text-center">
                <div className="inline-flex w-14 h-14 rounded-full bg-purple-100 text-purple-700 items-center justify-center mb-6">
                    <Heart size={28} weight="duotone" />
                </div>
                <p className="label-eyebrow text-purple-700 mb-3">
                    {t("account_deleted.eyebrow")}
                </p>
                <h1
                    className="heading-serif text-3xl sm:text-4xl tracking-tight leading-tight mb-5"
                    data-testid="account-deleted-title"
                >
                    {t("account_deleted.title")}
                </h1>
                <p
                    className="reading-serif text-base sm:text-lg leading-relaxed text-stone900 mb-3"
                    data-testid="account-deleted-body"
                >
                    {t("account_deleted.body")}
                </p>
                <p className="reading-serif italic text-base text-stoneMuted mb-8">
                    {t("account_deleted.farewell")}
                </p>
                <Link
                    to="/login"
                    data-testid="account-deleted-login-cta"
                    className="inline-block px-6 py-3 bg-sangre text-sand-50 ui-sans font-semibold rounded-md hover:bg-sangre/90 transition-colors"
                >
                    {t("account_deleted.cta")}
                </Link>
            </div>
        </div>
    );
}
