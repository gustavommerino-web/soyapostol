"""Catholic Bible - proxy to bolls.life (free Bible API).
DRA (Douay-Rheims American 1899) for English Catholic Bible with deuterocanonicals.
RV1909 / NVI for Spanish (closest freely-available).
"""
from typing import Optional
import httpx
from fastapi import APIRouter, Request, Query, HTTPException
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/bible", tags=["bible"])

BOLLS_BASE = "https://bolls.life"

# Default Catholic-friendly translations
DEFAULT_TRANSLATIONS = {
    "en": "DRA",   # Douay-Rheims American 1899 (Catholic)
    "es": "NVI",   # Nueva Versión Internacional (Spanish)
}


@router.get("/translations")
async def translations():
    """Return suggested translation codes per language."""
    return {
        "en": [{"code": "DRA", "name": "Douay-Rheims American 1899 (Catholic)"}],
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
    if cached:
        try:
            if datetime.now(timezone.utc) - datetime.fromisoformat(cached["fetched_at"]) < timedelta(days=30):
                return {"translation": code, "books": cached["books"]}
        except Exception:
            pass
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{BOLLS_BASE}/get-books/{code}/")
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail="Bible source error")
    data = r.json()
    doc = {"_id": cache_key, "translation": code, "books": data,
           "fetched_at": datetime.now(timezone.utc).isoformat()}
    await db.bible_cache.replace_one({"_id": cache_key}, doc, upsert=True)
    return {"translation": code, "books": data}


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
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{BOLLS_BASE}/get-text/{code}/{book}/{chapter}/")
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail="Bible chapter error")
    verses = r.json()
    doc = {"_id": cache_key, "translation": code, "book": book, "chapter": chapter,
           "verses": verses, "fetched_at": datetime.now(timezone.utc).isoformat()}
    await db.bible_cache.replace_one({"_id": cache_key}, doc, upsert=True)
    return {"translation": code, "book": book, "chapter": chapter, "verses": verses}
