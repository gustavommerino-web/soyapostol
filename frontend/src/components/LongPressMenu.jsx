import React from "react";

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_PX = 10;

/**
 * useLongPress — fires `callback` when the user holds a pointer on the element
 * for at least `ms` milliseconds without moving more than 10 px. Also
 * intercepts `contextmenu` (desktop right-click + iOS long-press callout) so
 * the host element can show a custom action sheet instead of the browser's
 * native selection menu.
 *
 * The host element should also apply `user-select: none` permanently to
 * prevent Safari/iOS from opening its text-selection UI before our timer
 * fires. See the `.verse-row` / `.ccc-row` CSS classes.
 */
export function useLongPress(callback, ms = LONG_PRESS_MS) {
    const timer = React.useRef(null);
    const start = React.useRef({ x: 0, y: 0 });
    const fired = React.useRef(false);

    const clear = React.useCallback(() => {
        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }
    }, []);

    const onPointerDown = React.useCallback((e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        fired.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        clear();
        timer.current = setTimeout(() => {
            fired.current = true;
            callback(e);
        }, ms);
    }, [callback, ms, clear]);

    const onPointerMove = React.useCallback((e) => {
        if (!timer.current) return;
        const dx = (e.clientX ?? 0) - start.current.x;
        const dy = (e.clientY ?? 0) - start.current.y;
        if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_PX) clear();
    }, [clear]);

    const onPointerUp = React.useCallback((e) => {
        clear();
        if (fired.current) {
            e.stopPropagation();
            fired.current = false;
        }
    }, [clear]);

    const onContextMenu = React.useCallback((e) => {
        e.preventDefault();
        callback(e);
    }, [callback]);

    return {
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerLeave: onPointerUp,
        onPointerCancel: onPointerUp,
        onContextMenu,
    };
}

/**
 * ContextMenu — floating action menu anchored to its parent element. Measures
 * viewport overflow on mount and flips above when rendering below would push
 * out of view. Closes on outside click, Escape, or any page scroll.
 *
 * Props:
 *   items   — [{ id, label, icon?, onSelect }]
 *   onDismiss — called whenever the menu should close (outside click, scroll,
 *               Esc, or after an item is selected)
 *   testId  — base data-testid; each item gets `${testId}-item-${item.id}`
 */
export function ContextMenu({ items, onDismiss, testId = "context-menu" }) {
    const ref = React.useRef(null);
    const [placement, setPlacement] = React.useState("below");

    React.useLayoutEffect(() => {
        if (!ref.current) return;
        const menuEl = ref.current;
        const hostEl = menuEl.parentElement;
        if (!hostEl) return;
        const hostRect = hostEl.getBoundingClientRect();
        const menuHeight = menuEl.offsetHeight;
        const margin = 16;
        const spaceBelow = window.innerHeight - hostRect.bottom;
        const spaceAbove = hostRect.top;
        if (spaceBelow < menuHeight + margin && spaceAbove > spaceBelow) {
            setPlacement("above");
        } else {
            setPlacement("below");
        }
    }, []);

    React.useEffect(() => {
        const onDown = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onDismiss();
        };
        const onKey = (e) => { if (e.key === "Escape") onDismiss(); };
        const onScroll = () => onDismiss();
        const id = setTimeout(() => {
            document.addEventListener("pointerdown", onDown, true);
            document.addEventListener("keydown", onKey);
            window.addEventListener("scroll", onScroll, { passive: true, capture: true });
        }, 0);
        return () => {
            clearTimeout(id);
            document.removeEventListener("pointerdown", onDown, true);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("scroll", onScroll, { capture: true });
        };
    }, [onDismiss]);

    return (
        <span
            ref={ref}
            role="menu"
            data-testid={testId}
            data-placement={placement}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className={[
                "absolute left-3 z-30 flex flex-col bg-white border border-sand-300 shadow-lg rounded-lg py-1 ui-sans text-sm min-w-[220px] max-w-[90vw]",
                placement === "above" ? "bottom-full mb-2" : "top-full mt-2",
            ].join(" ")}
        >
            {items.map((it, i) => (
                <React.Fragment key={it.id}>
                    {i > 0 && <span className="h-px bg-sand-300 mx-2" aria-hidden="true" />}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            it.onSelect();
                            onDismiss();
                        }}
                        data-testid={`${testId}-item-${it.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-left hover:bg-sangre/5 text-stone900 hover:text-sangre transition-colors"
                    >
                        {it.icon}
                        <span>{it.label}</span>
                    </button>
                </React.Fragment>
            ))}
        </span>
    );
}
