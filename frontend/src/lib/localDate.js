/**
 * Returns the user's local date as a YYYY-MM-DD string using
 * `toLocaleDateString('en-CA', …)` — the only built-in locale that natively
 * formats dates as ISO 8601. This is what we send to the backend so that
 * cached daily content (Readings, Liturgy) only rolls over at the user's
 * actual local midnight, never earlier.
 */
export function localDateISO(d = new Date()) {
    return d.toLocaleDateString("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}
