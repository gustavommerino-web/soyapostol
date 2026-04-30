/**
 * Thin Promise wrapper around IndexedDB for soyapostol.
 *
 * We use IDB as a durable cache for already-normalized heavy datasets
 * (Bible, Catechism). Storing the post-normalize JS object — rather than the
 * raw fetched JSON — means cold reloads skip both the network round-trip AND
 * the parse + normalize step, which on low-end phones can be 200-500 ms for
 * the 5 MB Jerusalen Biblia.
 *
 * The store is a single key/value bucket: `datasets` where `key = id`.
 * Entries store `{ id, version, savedAt, payload }`. A `version` mismatch
 * forces a re-fetch so future data updates roll out cleanly.
 *
 * All operations degrade gracefully: if IDB is unavailable (Safari private
 * mode, disabled storage, etc.) the functions resolve to `null` / no-op and
 * the caller falls back to its regular fetch path.
 */

const DB_NAME = "soyapostol";
const DB_VERSION = 1;
const STORE = "datasets";

let _dbPromise = null;

function openDb() {
    if (_dbPromise) return _dbPromise;
    if (typeof indexedDB === "undefined") {
        _dbPromise = Promise.resolve(null);
        return _dbPromise;
    }
    _dbPromise = new Promise((resolve) => {
        let req;
        try { req = indexedDB.open(DB_NAME, DB_VERSION); }
        catch { resolve(null); return; }
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: "id" });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
    });
    return _dbPromise;
}

async function tx(mode) {
    const db = await openDb();
    if (!db) return null;
    try { return db.transaction(STORE, mode).objectStore(STORE); }
    catch { return null; }
}

export async function idbGet(id) {
    const store = await tx("readonly");
    if (!store) return null;
    return new Promise((resolve) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    });
}

export async function idbSet(id, version, payload) {
    const store = await tx("readwrite");
    if (!store) return false;
    return new Promise((resolve) => {
        const req = store.put({ id, version, savedAt: Date.now(), payload });
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
    });
}

export async function idbDelete(id) {
    const store = await tx("readwrite");
    if (!store) return false;
    return new Promise((resolve) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
    });
}
