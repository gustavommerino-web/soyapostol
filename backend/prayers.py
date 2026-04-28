"""Catholic prayers stored in MongoDB.

Source-of-truth is the ``prayers`` collection. On first run we seed it once
from aciprensa.com (Spanish catalog). After that, scraping never runs again
and all changes — admin add / edit / delete — persist directly in MongoDB.

Document shape:
    {
        _id: ObjectId,
        lang: "es" | "en",
        slug: str,                      # unique per (lang, slug)
        title: str,
        category: str,
        content: str,                   # plain text, blank-line-separated paragraphs
        source: "scraped" | "custom",
        source_url: str | None,
        created_at: datetime,
        updated_at: datetime,
    }
"""
from datetime import datetime, timezone
from typing import Optional
import asyncio
import hashlib
import logging
import re

import httpx
from bs4 import BeautifulSoup
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/prayers", tags=["prayers"])

ACI_INDEX_ES = "https://www.aciprensa.com/recursos/20/oraciones"
HEADERS = {"User-Agent": "Mozilla/5.0 (ApostolApp)"}


# ---------------------- helpers ----------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _slugify(text: str) -> str:
    base = (text or "").lower().strip()
    base = re.sub(r"[áàä]", "a", base)
    base = re.sub(r"[éèë]", "e", base)
    base = re.sub(r"[íìï]", "i", base)
    base = re.sub(r"[óòö]", "o", base)
    base = re.sub(r"[úùü]", "u", base)
    base = re.sub(r"ñ", "n", base)
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return base[:80] or "oracion"


def _hash_slug(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:8]


def _doc_to_public(doc: dict, full: bool = False) -> dict:
    out = {
        "id": str(doc["_id"]),
        "slug": doc["slug"],
        "title": doc["title"],
        "category": doc["category"],
        "lang": doc["lang"],
        "source": doc.get("source", "custom"),
    }
    if full:
        out["content"] = doc.get("content", "")
        out["source_url"] = doc.get("source_url")
        out["created_at"] = (doc.get("created_at") or _now()).isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at")
        out["updated_at"] = (doc.get("updated_at") or _now()).isoformat() if isinstance(doc.get("updated_at"), datetime) else doc.get("updated_at")
    return out


# ---------------------- one-time seed from aciprensa ----------------------

async def _scrape_aci_index() -> list[dict]:
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers=HEADERS) as client:
        r = await client.get(ACI_INDEX_ES)
        if r.status_code >= 400:
            raise RuntimeError(f"ACI index HTTP {r.status_code}")
        soup = BeautifulSoup(r.text, "lxml")
    out = []
    for h2 in soup.select("h2"):
        cat = h2.get_text(" ", strip=True)
        if not cat or len(cat) > 60:
            continue
        ul = h2.find_next_sibling("ul")
        if not ul:
            continue
        items = []
        for a in ul.select("li a"):
            href = a.get("href", "")
            name = a.get_text(" ", strip=True)
            if not href or not name or "/recurso/" not in href:
                continue
            full = href if href.startswith("http") else f"https://www.aciprensa.com{href}"
            items.append({"title": name, "url": full})
        if items:
            out.append({"category": cat, "items": items})
    return out


async def _scrape_aci_content(url: str) -> str:
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers=HEADERS) as client:
        r = await client.get(url)
        if r.status_code >= 400:
            return ""
        soup = BeautifulSoup(r.text, "lxml")
    article = soup.select_one("article, .content, .entry-content, main") or soup
    for s in article.select("script, style, nav, header, footer, .ads, aside, .breadcrumbs"):
        s.decompose()
    paragraphs = []
    for el in article.find_all(["p", "h3", "h4", "blockquote"]):
        txt = el.get_text(" ", strip=True)
        if txt and len(txt) > 2:
            paragraphs.append(txt)
    return "\n\n".join(paragraphs)


async def seed_prayers_if_empty(db) -> None:
    """Populate the prayers collection on first run. Idempotent."""
    count = await db.prayers.count_documents({"lang": "es"})
    if count > 0:
        return
    logger.info("Seeding prayers from aciprensa (one-time)…")
    try:
        index = await _scrape_aci_index()
    except Exception as e:
        logger.error("Prayer seed: index fetch failed: %s", e)
        return

    now = _now()
    flat = [(cat["category"], it) for cat in index for it in cat["items"]]

    async def fetch_one(category: str, item: dict):
        try:
            content = await _scrape_aci_content(item["url"])
        except Exception:
            content = ""
        if not content:
            return None
        slug = f"{_slugify(item['title'])}-{_hash_slug(item['url'])}"
        return {
            "lang": "es",
            "slug": slug,
            "title": item["title"],
            "category": category,
            "content": content,
            "source": "scraped",
            "source_url": item["url"],
            "created_at": now,
            "updated_at": now,
        }

    # Limit concurrency so we don't hammer ACI.
    sem = asyncio.Semaphore(5)

    async def bound(cat, it):
        async with sem:
            return await fetch_one(cat, it)

    docs = await asyncio.gather(*(bound(c, i) for c, i in flat))
    docs = [d for d in docs if d]
    if not docs:
        logger.warning("Prayer seed: no documents fetched")
        return
    await db.prayers.insert_many(docs)
    logger.info("Prayer seed: inserted %d prayers", len(docs))


# ---------------------- public endpoints ----------------------

@router.get("")
async def list_prayers(request: Request, lang: str = Query("es")):
    if lang not in ("es", "en"):
        lang = "es"
    db = request.app.state.db
    cursor = db.prayers.find(
        {"lang": lang},
        {"slug": 1, "title": 1, "category": 1, "source": 1},
    )
    cats: dict[str, list[dict]] = {}
    async for d in cursor:
        cats.setdefault(d["category"], []).append({
            "slug": d["slug"],
            "title": d["title"],
            "source": d.get("source", "custom"),
        })
    # Stable order: categories alphabetical, items by title
    categories = []
    for cat in sorted(cats.keys(), key=lambda x: x.lower()):
        items = sorted(cats[cat], key=lambda i: i["title"].lower())
        categories.append({"category": cat, "items": items})
    return {"lang": lang, "categories": categories}


@router.get("/{slug}")
async def get_prayer(slug: str, request: Request, lang: str = Query("es")):
    db = request.app.state.db
    doc = await db.prayers.find_one({"slug": slug, "lang": lang})
    if not doc:
        raise HTTPException(status_code=404, detail="Prayer not found")
    return _doc_to_public(doc, full=True)


# ---------------------- admin endpoints ----------------------

class PrayerIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    category: str = Field(..., min_length=1, max_length=80)
    content: str = Field(..., min_length=1, max_length=20000)
    lang: str = Field("es", pattern="^(es|en)$")


class PrayerPatch(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[str] = Field(None, min_length=1, max_length=80)
    content: Optional[str] = Field(None, min_length=1, max_length=20000)


def _require_admin(user: dict):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")


@router.get("/admin/all")
async def admin_list(request: Request,
                     lang: str = Query("es"),
                     user: dict = Depends(get_current_user)):
    _require_admin(user)
    db = request.app.state.db
    out = []
    cursor = db.prayers.find({"lang": lang}).sort("created_at", -1)
    async for d in cursor:
        out.append(_doc_to_public(d, full=True))
    return out


@router.post("/admin")
async def admin_create(data: PrayerIn, request: Request,
                       user: dict = Depends(get_current_user)):
    _require_admin(user)
    db = request.app.state.db
    now = _now()
    slug = f"{_slugify(data.title)}-{_hash_slug(data.title + str(now.timestamp()))}"
    doc = {
        "lang": data.lang,
        "slug": slug,
        "title": data.title.strip(),
        "category": data.category.strip(),
        "content": data.content.strip(),
        "source": "custom",
        "source_url": None,
        "created_at": now,
        "updated_at": now,
    }
    res = await db.prayers.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _doc_to_public(doc, full=True)


@router.patch("/admin/{prayer_id}")
async def admin_update(prayer_id: str, data: PrayerPatch, request: Request,
                       user: dict = Depends(get_current_user)):
    _require_admin(user)
    if not ObjectId.is_valid(prayer_id):
        raise HTTPException(status_code=400, detail="Invalid id")
    db = request.app.state.db
    update = {k: v.strip() for k, v in data.dict(exclude_unset=True).items() if isinstance(v, str)}
    if not update:
        raise HTTPException(status_code=400, detail="No changes")
    update["updated_at"] = _now()
    res = await db.prayers.find_one_and_update(
        {"_id": ObjectId(prayer_id)},
        {"$set": update},
        return_document=True,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Prayer not found")
    return _doc_to_public(res, full=True)


@router.delete("/admin/{prayer_id}")
async def admin_delete(prayer_id: str, request: Request,
                       user: dict = Depends(get_current_user)):
    _require_admin(user)
    if not ObjectId.is_valid(prayer_id):
        raise HTTPException(status_code=400, detail="Invalid id")
    db = request.app.state.db
    res = await db.prayers.delete_one({"_id": ObjectId(prayer_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prayer not found")
    return {"ok": True}
