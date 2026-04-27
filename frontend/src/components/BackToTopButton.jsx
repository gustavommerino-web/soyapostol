import React from "react";
import { ArrowUp } from "@phosphor-icons/react";
import { useLang } from "@/contexts/LangContext";

/**
 * Floating "back to top" button. Becomes visible after `threshold` px of
 * vertical scroll and smooth-scrolls to the top of the page on click.
 */
export default function BackToTopButton({ threshold = 400, onClick, testId = "back-to-top" }) {
    const { t } = useLang();
    const [show, setShow] = React.useState(false);

    React.useEffect(() => {
        const onScroll = () => setShow(window.scrollY > threshold);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [threshold]);

    if (!show) return null;

    const handleClick = () => {
        if (onClick) onClick();
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            data-testid={testId}
            aria-label={t("common.back_to_top")}
            title={t("common.back_to_top")}
            className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-30 h-12 w-12 rounded-full bg-sangre text-sand-50 shadow-lg hover:bg-sangre-hover transition-all flex items-center justify-center"
        >
            <ArrowUp size={20} weight="bold" />
        </button>
    );
}
