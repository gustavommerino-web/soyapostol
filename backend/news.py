"""Catholic News aggregator - RSS feeds from Vatican News, EWTN, ACI Prensa."""
from datetime import datetime, timezone, timedelta
from typing import Optional
import feedparser
import httpx
from fastapi import APIRouter, Request, Query

router = APIRouter(prefix="/news", tags=["news"])

FEEDS = {
    "es": [
        {"source": "Vatican News", "url": "https://www.vaticannews.va/es.rss.xml"},
        {"source": "ACI Prensa", "url": "https://www.aciprensa.com/rss/noticias.xml"},
    ],
    "en": [
        {"source": "Vatican News", "url": "https://www.vaticannews.va/en.rss.xml"},
        {"source": "Catholic News Agency", "url": "https://www.catholicnewsagency.com/rss/news.xml"},
        {"source": "National Catholic Register", "url": "https://www.ncregister.com/rss/daily-news.xml"},
    ],
}


async def _fetch_feed(url: str) -> bytes:
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True,
                                     headers={"User-Agent": "Mozilla/5.0 (ApostolApp)"}) as client:
            r = await client.get(url)
            if r.status_code < 400:
                return r.content
    except Exception:
        pass
    return b""


async def _fetch_all(lang: str) -> list[dict]:
    items = []
    feeds = FEEDS.get(lang, FEEDS["es"])
    for feed_info in feeds:
        data = await _fetch_feed(feed_info["url"])
        if not data:
            continue
        parsed = feedparser.parse(data)
        for entry in parsed.entries[:15]:
            # published datetime normalization
            published = entry.get("published") or entry.get("updated") or ""
            try:
                if entry.get("published_parsed"):
                    pub_dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                    published = pub_dt.isoformat()
            except Exception:
                pass
            summary = entry.get("summary", "") or entry.get("description", "")
            # Strip html
            from bs4 import BeautifulSoup
            summary_text = BeautifulSoup(summary, "lxml").get_text(" ", strip=True) if summary else ""
            items.append({
                "source": feed_info["source"],
                "title": entry.get("title", ""),
                "link": entry.get("link", ""),
                "summary": summary_text[:400],
                "published": published,
            })
    # Sort newest first
    items.sort(key=lambda x: x["published"] or "", reverse=True)
    return items


@router.get("")
async def get_news(request: Request, lang: str = Query("es"), refresh: bool = Query(False)):
    if lang not in ("es", "en"):
        lang = "es"
    db = request.app.state.db
    cache_key = f"news_{lang}"
    doc = await db.news_cache.find_one({"_id": cache_key})
    fresh = False
    if doc and not refresh:
        ts = doc.get("fetched_at")
        if ts:
            try:
                if datetime.now(timezone.utc) - datetime.fromisoformat(ts) < timedelta(hours=2):
                    fresh = True
            except Exception:
                pass
    if not fresh:
        items = await _fetch_all(lang)
        doc = {"_id": cache_key, "lang": lang, "items": items,
               "fetched_at": datetime.now(timezone.utc).isoformat()}
        await db.news_cache.replace_one({"_id": cache_key}, doc, upsert=True)
    return {"lang": lang, "items": doc["items"], "fetched_at": doc["fetched_at"]}
