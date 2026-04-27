import React from "react";

/**
 * Subtle reading-progress bar pinned to the very top of the viewport.
 * Tracks vertical scroll progress of the document and renders as a thin
 * deep-blue line that fills left-to-right as the user reads.
 */
export default function ReadingProgressBar() {
    const [progress, setProgress] = React.useState(0);

    React.useEffect(() => {
        const update = () => {
            const doc = document.documentElement;
            const scrollTop = window.scrollY || doc.scrollTop || 0;
            const max = (doc.scrollHeight || 0) - (window.innerHeight || 0);
            const pct = max > 0 ? (scrollTop / max) * 100 : 0;
            setProgress(Math.max(0, Math.min(100, pct)));
        };
        update();
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        return () => {
            window.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, []);

    return (
        <div
            className="fixed top-0 left-0 right-0 h-[3px] z-50 pointer-events-none"
            data-testid="reading-progress"
            aria-hidden="true"
        >
            <div
                className="h-full bg-sangre transition-[width] duration-150 ease-out"
                style={{ width: `${progress}%`, opacity: progress > 0.5 ? 1 : 0 }}
                data-testid="reading-progress-fill"
            />
        </div>
    );
}
