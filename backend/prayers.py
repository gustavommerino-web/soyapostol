"""Catholic Prayers from aciprensa.com (es) grouped by category.
Individual prayer URLs live at aciprensa.com/recurso/{id}/{slug}
Index: /recursos/20/oraciones with H2 category headings followed by UL lists.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
import hashlib
import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Request, Query, HTTPException

router = APIRouter(prefix="/prayers", tags=["prayers"])

ACI_INDEX_ES = "https://www.aciprensa.com/recursos/20/oraciones"
HEADERS = {"User-Agent": "Mozilla/5.0 (ApostolApp)"}


def _slug(url: str) -> str:
    return hashlib.md5(url.encode("utf-8")).hexdigest()[:10]


async def _fetch_index_es() -> list[dict]:
    """Return list of {category, items:[{title, url, slug}]}."""
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=HEADERS) as client:
        r = await client.get(ACI_INDEX_ES)
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail="Prayers source error")
    soup = BeautifulSoup(r.text, "lxml")
    categories = []
    # Each <h2> that is followed by a <ul> of prayer links
    for h2 in soup.select("h2"):
        title = h2.get_text(" ", strip=True)
        if not title or len(title) > 60:
            continue
        nxt = h2.find_next_sibling("ul")
        if not nxt:
            continue
        items = []
        for a in nxt.select("li a"):
            link = a.get("href", "")
            name = a.get_text(" ", strip=True)
            if not link or not name or "/recurso/" not in link:
                continue
            full = link if link.startswith("http") else f"https://www.aciprensa.com{link}"
            items.append({"title": name, "url": full, "slug": _slug(full)})
        if items:
            categories.append({"category": title, "items": items})
    return categories


async def _fetch_prayer_content(url: str) -> dict:
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=HEADERS) as client:
        r = await client.get(url)
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail="Prayer fetch error")
    soup = BeautifulSoup(r.text, "lxml")
    article = soup.select_one("article, .content, .entry-content, main") or soup
    for s in article.select("script, style, nav, header, footer, .ads, aside, .breadcrumbs"):
        s.decompose()
    title_el = article.select_one("h1, h2")
    title = title_el.get_text(" ", strip=True) if title_el else "Oración"
    paragraphs = []
    for el in article.find_all(["p", "h3", "h4", "blockquote"]):
        txt = el.get_text(" ", strip=True)
        if txt and len(txt) > 2:
            paragraphs.append(txt)
    body = "\n\n".join(paragraphs)
    return {"title": title, "content": body, "source_url": url}


@router.get("")
async def list_prayers(request: Request, lang: str = Query("es"), refresh: bool = Query(False)):
    if lang not in ("es", "en"):
        lang = "es"
    db = request.app.state.db
    cache_key = f"prayer_index_{lang}"
    doc = await db.prayers_cache.find_one({"_id": cache_key})
    fresh = False
    if doc and not refresh:
        ts = doc.get("fetched_at")
        if ts:
            try:
                if datetime.now(timezone.utc) - datetime.fromisoformat(ts) < timedelta(days=7):
                    fresh = True
            except Exception:
                pass
    if not fresh:
        # Currently only ES is implemented via aciprensa
        categories = await _fetch_index_es() if lang == "es" else []
        doc = {
            "_id": cache_key,
            "lang": lang,
            "categories": categories,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.prayers_cache.replace_one({"_id": cache_key}, doc, upsert=True)
    return {"lang": lang, "categories": doc.get("categories", []), "fetched_at": doc["fetched_at"]}


@router.get("/{slug}")
async def get_prayer(slug: str, request: Request, lang: str = Query("es")):
    db = request.app.state.db
    index_doc = await db.prayers_cache.find_one({"_id": f"prayer_index_{lang}"})
    if not index_doc:
        await list_prayers(request, lang=lang)
        index_doc = await db.prayers_cache.find_one({"_id": f"prayer_index_{lang}"})
    found = None
    for cat in index_doc.get("categories", []):
        for item in cat["items"]:
            if item["slug"] == slug:
                found = item
                break
        if found:
            break
    if not found:
        raise HTTPException(status_code=404, detail="Prayer not found")
    content_key = f"prayer_{slug}_{lang}"
    cached = await db.prayers_content.find_one({"_id": content_key})
    if cached:
        cached.pop("_id", None)
        return cached
    data = await _fetch_prayer_content(found["url"])
    data["slug"] = slug
    data["lang"] = lang
    data["fetched_at"] = datetime.now(timezone.utc).isoformat()
    await db.prayers_content.replace_one({"_id": content_key}, {"_id": content_key, **data}, upsert=True)
    return data
