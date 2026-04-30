/**
 * Service worker registration for soyapostol.
 *
 * Only runs in production builds — the CRA dev server serves assets with
 * anti-cache headers that would fight the SW. In production the SW takes
 * over at `load` so the very first render is unaffected, then revalidates
 * the app shell on subsequent visits.
 *
 * When a new SW is installed and waiting, we surface a small toast so the
 * user can reload to pick up fresh content (otherwise the old tab keeps
 * running until all app windows close).
 */
import { toast } from "sonner";

const SW_URL = `${process.env.PUBLIC_URL || ""}/service-worker.js`;

export function registerServiceWorker() {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register(SW_URL)
            .then((registration) => {
                // Periodic update check — every 30 min while the tab lives.
                setInterval(() => { registration.update().catch(() => {}); }, 30 * 60 * 1000);

                registration.addEventListener("updatefound", () => {
                    const installing = registration.installing;
                    if (!installing) return;
                    installing.addEventListener("statechange", () => {
                        if (installing.state === "installed" && navigator.serviceWorker.controller) {
                            // A new SW is ready but the old one still controls
                            // the page. Tell the user how to pick it up.
                            try {
                                toast("Nueva versión disponible", {
                                    description: "Actualiza para obtener el contenido más reciente.",
                                    action: {
                                        label: "Actualizar",
                                        onClick: () => {
                                            installing.postMessage("SKIP_WAITING");
                                            window.location.reload();
                                        },
                                    },
                                    duration: 15000,
                                });
                            } catch {
                                // Fallback if toast can't mount yet.
                            }
                        }
                    });
                });
            })
            .catch(() => {
                // SW registration failures are never user-visible — they
                // just mean offline support is disabled this session.
            });
    });
}
