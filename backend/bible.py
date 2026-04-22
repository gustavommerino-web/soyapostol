"""Catholic Bible - proxy to bolls.life (free Bible API).
DRA (Douay-Rheims American 1899) for English Catholic Bible with deuterocanonicals.
NVI / RV1909 for Spanish.
Includes retry + stale-cache fallback when the upstream is rate-limited or unavailable.
"""
from typing import Optional
import asyncio
import httpx
from fastapi import APIRouter, Request, Query, HTTPException
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/bible", tags=["bible"])

BOLLS_BASE = "https://bolls.life"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

DEFAULT_TRANSLATIONS = {
    "en": "NABRE",  # New American Bible Revised Edition — 73 books (US Catholic)
    "es": "NVI",    # Nueva Versión Internacional
}


async def _bolls_get(url: str, retries: int = 4, timeout: int = 20):
    """GET with retry on 429/5xx/timeouts; returns Response or raises HTTPException(502/503)."""
    last_status: Optional[int] = None
    last_exc: Optional[Exception] = None
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(timeout=timeout, headers=HEADERS, follow_redirects=True) as client:
                r = await client.get(url)
            last_status = r.status_code
            if r.status_code < 400:
                return r
            # 429 / 5xx → retry with backoff; 404 → don't retry (endpoint wrong)
            if r.status_code == 404:
                raise HTTPException(status_code=502, detail="Bible source returned 404")
        except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.ConnectError, httpx.RemoteProtocolError) as e:
            last_exc = e
        # Exponential-ish backoff: 0.8, 1.6, 3.2, 6.4 s
        await asyncio.sleep(0.8 * (2 ** attempt))
    # exhausted
    msg = f"Bible source temporarily unavailable (last_status={last_status})"
    raise HTTPException(status_code=503, detail=msg) from last_exc


@router.get("/translations")
async def translations():
    return {
        "en": [{"code": "NABRE", "name": "New American Bible Revised Edition (Catholic, 73 books)"}],
        "es": [
            {"code": "NVI", "name": "Nueva Versión Internacional"},
            {"code": "RV1909", "name": "Reina-Valera 1909"},
        ],
    }


@router.get("/books")
async def books(request: Request, lang: str = Query("es"), translation: Optional[str] = None):
    code = translation or DEFAULT_TRANSLATIONS.get(lang, "DRA")
    db = request.app.state.db
    cache_key = f"bible_books_{code}"
    cached = await db.bible_cache.find_one({"_id": cache_key})
    # Serve cache if < 30 days old
    if cached:
        try:
            if datetime.now(timezone.utc) - datetime.fromisoformat(cached["fetched_at"]) < timedelta(days=30):
                return {"translation": code, "books": cached["books"]}
        except Exception:
            pass
    # Try fresh fetch; on failure fall back to any cache we have (even stale)
    try:
        r = await _bolls_get(f"{BOLLS_BASE}/get-books/{code}/")
        data = r.json()
        doc = {"_id": cache_key, "translation": code, "books": data,
               "fetched_at": datetime.now(timezone.utc).isoformat()}
        await db.bible_cache.replace_one({"_id": cache_key}, doc, upsert=True)
        return {"translation": code, "books": data}
    except HTTPException:
        if cached:
            return {"translation": code, "books": cached["books"], "stale": True}
        raise


@router.get("/chapter")
async def chapter(request: Request,
                  book: int = Query(...),
                  chapter: int = Query(...),
                  lang: str = Query("es"),
                  translation: Optional[str] = None):
    code = translation or DEFAULT_TRANSLATIONS.get(lang, "DRA")
    db = request.app.state.db
    cache_key = f"bible_ch_{code}_{book}_{chapter}"
    cached = await db.bible_cache.find_one({"_id": cache_key})
    if cached:
        return {"translation": code, "book": book, "chapter": chapter, "verses": cached["verses"]}
    try:
        r = await _bolls_get(f"{BOLLS_BASE}/get-text/{code}/{book}/{chapter}/")
        verses = r.json()
        doc = {"_id": cache_key, "translation": code, "book": book, "chapter": chapter,
               "verses": verses, "fetched_at": datetime.now(timezone.utc).isoformat()}
        await db.bible_cache.replace_one({"_id": cache_key}, doc, upsert=True)
        return {"translation": code, "book": book, "chapter": chapter, "verses": verses}
    except HTTPException:
        # Last-ditch: look for same book/chapter across translations in cache
        alt = await db.bible_cache.find_one(
            {"book": book, "chapter": chapter, "translation": code}
        )
        if alt:
            return {"translation": code, "book": book, "chapter": chapter,
                    "verses": alt["verses"], "stale": True}
        raise
