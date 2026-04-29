"""Catholic News aggregator — Vatican News RSS only.

Vatican News exposes official RSS feeds at `https://www.vaticannews.va/{en,es}.rss.xml`.
Browsers cannot fetch them directly (no CORS headers), so this thin proxy
fetches the feed server-side, parses it with feedparser, extracts the lead
image (enclosure / media:content / first <img> in description) and returns a
clean JSON payload. The frontend caches the latest 5 items locally for
instant subsequent loads.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
import re

import feedparser
import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Request, Query

router = APIRouter(prefix="/news", tags=["news"])

VATICAN_NEWS_FEEDS = {
    "es": "https://www.vaticannews.va/es.rss.xml",
    "en": "https://www.vaticannews.va/en.rss.xml",
}

CACHE_TTL = timedelta(minutes=30)
MAX_ITEMS = 10  # frontend slices to 5 in the cached preview


async def _fetch_feed(url: str) -> bytes:
    try:
        async with httpx.AsyncClient(
            timeout=15,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (ApostolApp)"},
        ) as client:
            r = await client.get(url)
            if r.status_code < 400:
                return r.content
    except Exception:
        pass
    return b""


def _extract_image(entry, summary_html: str) -> Optional[str]:
    """Extract the lead image URL for a Vatican News RSS item.

    Tries, in order:
    1. <media:content url="..."/>  (exposed by feedparser as `media_content`)
    2. <enclosure url="..." type="image/*"/>
    3. First <img src="..."> in the description HTML
    """
    media = entry.get("media_content") or []
    for m in media:
        url = m.get("url")
        if url and (m.get("medium") in (None, "image") or url.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif"))):
            return url

    for enc in entry.get("enclosures", []) or []:
        url = enc.get("href") or enc.get("url")
        ctype = (enc.get("type") or "").lower()
        if url and (ctype.startswith("image/") or url.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))):
            return url

    if summary_html:
        m = re.search(r'<img[^>]+src="([^"]+)"', summary_html)
        if m:
            return m.group(1)
    return None


def _strip_read_all(text: str) -> str:
    """Vatican News appends 'Read all' / 'Leer todo' anchor — strip it from
    the summary so cards stay clean."""
    text = re.sub(r"\s*(Read all|Leer todo|Ler tudo|Lire tout)\s*$", "", text, flags=re.IGNORECASE)
    return text.strip()


async def _fetch_vatican_news(lang: str) -> list[dict]:
    url = VATICAN_NEWS_FEEDS[lang]
    data = await _fetch_feed(url)
    if not data:
        return []
    parsed = feedparser.parse(data)
    items: list[dict] = []
    for entry in parsed.entries[:MAX_ITEMS]:
        published = entry.get("published") or entry.get("updated") or ""
        try:
            if entry.get("published_parsed"):
                pub_dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                published = pub_dt.isoformat()
        except Exception:
            pass

        summary_html = entry.get("summary", "") or entry.get("description", "")
        summary_text = ""
        if summary_html:
            summary_text = BeautifulSoup(summary_html, "lxml").get_text(" ", strip=True)
            summary_text = _strip_read_all(summary_text)

        items.append({
            "source": "Vatican News",
            "title": (entry.get("title", "") or "").strip(),
            "link": entry.get("link", ""),
            "summary": summary_text[:400],
            "published": published,
            "image": _extract_image(entry, summary_html),
        })
    return items


@router.get("")
async def get_news(request: Request, lang: str = Query("es"), refresh: bool = Query(False)):
    if lang not in ("es", "en"):
        lang = "es"
    db = request.app.state.db
    cache_key = f"news_vatican_{lang}"
    doc = await db.news_cache.find_one({"_id": cache_key})

    fresh = False
    if doc and not refresh:
        try:
            ts = datetime.fromisoformat(doc.get("fetched_at"))
            if datetime.now(timezone.utc) - ts < CACHE_TTL:
                fresh = True
        except Exception:
            pass

    if not fresh:
        items = await _fetch_vatican_news(lang)
        # If the upstream fetch failed, keep serving the previous cache rather
        # than returning an empty list — better UX for transient outages.
        if not items and doc:
            items = doc.get("items", [])
        doc = {
            "_id": cache_key,
            "lang": lang,
            "items": items,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.news_cache.replace_one({"_id": cache_key}, doc, upsert=True)

    return {
        "lang": lang,
        "source": "Vatican News",
        "items": doc.get("items", []),
        "fetched_at": doc.get("fetched_at"),
    }
