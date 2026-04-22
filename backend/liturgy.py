"""Liturgy of the Hours scraper from ibreviary.com"""
from datetime import datetime, timezone
from typing import Optional
import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Request, Query, HTTPException

router = APIRouter(prefix="/liturgy", tags=["liturgy"])

# ibreviary hour codes
HOURS = {
    "office_of_readings": "ufficio_delle_letture",
    "lauds": "lodi",
    "midmorning": "terza",
    "midday": "sesta",
    "midafternoon": "nona",
    "vespers": "vespri",
    "compline": "compieta",
}

BASE = "https://www.ibreviary.com/m2"


async def _fetch_liturgy(hour: str, lang: str) -> dict:
    hour_code = HOURS.get(hour, "lodi")
    url = f"{BASE}/breviario.php?s={hour_code}&lang={lang}"
    async with httpx.AsyncClient(timeout=20, follow_redirects=True,
                                 headers={"User-Agent": "Mozilla/5.0 (ApostolApp)"}) as client:
        r = await client.get(url)
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Liturgy source error: {r.status_code}")
    soup = BeautifulSoup(r.text, "lxml")
    # main content lives inside #contenuto
    container = soup.select_one("#contenuto") or soup.select_one(".contenuto") or soup.select_one("#content") or soup.select_one("main") or soup.select_one("body")
    if not container:
        container = soup
    for s in container.select("script, style, nav, header, footer, .menu, #menu"):
        s.decompose()
    title_el = container.select_one("h1, h2, h3")
    title = title_el.get_text(" ", strip=True) if title_el else hour.replace("_", " ").title()
    content_html = str(container)
    text = container.get_text("\n", strip=True)
    return {
        "hour": hour,
        "lang": lang,
        "title": title,
        "content_html": content_html,
        "content_text": text,
        "source_url": url,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/hours")
async def list_hours(lang: str = Query("es")):
    labels_es = {
        "office_of_readings": "Oficio de Lecturas",
        "lauds": "Laudes",
        "midmorning": "Tercia",
        "midday": "Sexta",
        "midafternoon": "Nona",
        "vespers": "Vísperas",
        "compline": "Completas",
    }
    labels_en = {
        "office_of_readings": "Office of Readings",
        "lauds": "Lauds (Morning Prayer)",
        "midmorning": "Midmorning Prayer",
        "midday": "Midday Prayer",
        "midafternoon": "Midafternoon Prayer",
        "vespers": "Vespers (Evening Prayer)",
        "compline": "Compline (Night Prayer)",
    }
    labels = labels_es if lang == "es" else labels_en
    return [{"id": k, "label": labels[k]} for k in HOURS.keys()]


@router.get("")
async def get_liturgy(request: Request,
                      hour: str = Query("lauds"),
                      lang: str = Query("es"),
                      refresh: bool = Query(False)):
    if hour not in HOURS:
        raise HTTPException(status_code=400, detail="Invalid hour")
    if lang not in ("es", "en", "it"):
        lang = "es"
    db = request.app.state.db
    today = datetime.now(timezone.utc).date().isoformat()
    cache_key = f"{today}_{lang}_{hour}"
    if not refresh:
        cached = await db.liturgy_cache.find_one({"_id": cache_key})
        if cached:
            cached.pop("_id", None)
            return cached
    data = await _fetch_liturgy(hour, lang)
    doc = {"_id": cache_key, **data}
    await db.liturgy_cache.replace_one({"_id": cache_key}, doc, upsert=True)
    doc.pop("_id", None)
    return doc
