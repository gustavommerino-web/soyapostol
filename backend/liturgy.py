"""Liturgy of the Hours.
- EN (primary): divineoffice.org RSS feed — full HTML text for all 7 hours, updated daily.
- ES/IT: ibreviary.com (retained for Spanish/Italian support).
Caches results per (date, lang, hour) in MongoDB and serves stale cache if the source
is temporarily unavailable.
"""
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs
import asyncio
import httpx
import feedparser
from bs4 import BeautifulSoup
from fastapi import APIRouter, Request, Query, HTTPException

router = APIRouter(prefix="/liturgy", tags=["liturgy"])

# Internal hour code → iBreviary id (ES/IT)
IBREVIARY_CODES = {
    "office_of_readings": "ufficio_delle_letture",
    "lauds": "lodi",
    "midmorning": "terza",
    "midday": "sesta",
    "midafternoon": "nona",
    "vespers": "vespri",
    "compline": "compieta",
}

# Internal hour code → divineoffice.org prayer code (EN RSS)
DIVINE_OFFICE_CODES = {
    "office_of_readings": "OfficeOfReadings",
    "lauds": "MorningPrayer",
    "midmorning": "MidmorningPrayer",
    "midday": "MiddayPrayer",
    "midafternoon": "MidafternoonPrayer",
    "vespers": "EveningPrayer",
    "compline": "NightPrayer",
}

HOURS = list(IBREVIARY_CODES.keys())
IBREVIARY_BASE = "https://www.ibreviary.com/m2"
DIVINE_OFFICE_FEED = "https://divineoffice.org/feed/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
}


async def _fetch_with_retry(url: str, retries: int = 3, timeout: int = 30) -> httpx.Response:
    last_exc: Exception | None = None
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=True, headers=HEADERS) as client:
                r = await client.get(url)
            if r.status_code < 400:
                return r
            last_exc = RuntimeError(f"HTTP {r.status_code}")
        except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.ConnectError, httpx.RemoteProtocolError) as e:
            last_exc = e
        await asyncio.sleep(1 + attempt)
    raise HTTPException(status_code=503, detail="Liturgy source temporarily unavailable.") from last_exc


# ----- Divine Office (English) -----

async def _fetch_divine_office(hour: str) -> dict:
    prayer_code = DIVINE_OFFICE_CODES.get(hour)
    if not prayer_code:
        raise HTTPException(status_code=400, detail="Unsupported hour for Divine Office")
    today = datetime.now(timezone.utc).date().strftime("%Y%m%d")
    r = await _fetch_with_retry(DIVINE_OFFICE_FEED)
    feed = feedparser.parse(r.content)

    # Find the entry for today matching the prayer code; fall back to most recent entry
    # with that prayer code if today's entry is not yet published.
    matching = []
    for entry in feed.entries:
        link = entry.get("link", "")
        q = parse_qs(urlparse(link).query)
        if q.get("prayer", [""])[0] != prayer_code:
            continue
        entry_date = q.get("date", [""])[0]
        matching.append((entry_date, entry))

    if not matching:
        raise HTTPException(status_code=502, detail="Could not find entry in Divine Office feed")
    # Prefer today's; else the latest available
    matching.sort(key=lambda x: x[0], reverse=True)
    chosen_date, entry = None, None
    for d, e in matching:
        if d == today:
            chosen_date, entry = d, e
            break
    if entry is None:
        chosen_date, entry = matching[0]

    content_html = ""
    if entry.get("content"):
        content_html = entry["content"][0].get("value", "")
    if not content_html:
        content_html = entry.get("summary", "")
    # Strip divineoffice audio embeds / podcast blocks
    soup = BeautifulSoup(content_html, "lxml")
    for s in soup.select("audio, iframe, script, .powerpress_player, .podcast_links, .sharedaddy, .jp-audio"):
        s.decompose()
    cleaned_html = str(soup)
    text = soup.get_text("\n", strip=True)
    title = entry.get("title", hour.replace("_", " ").title())

    return {
        "hour": hour,
        "lang": "en",
        "title": title,
        "content_html": cleaned_html,
        "content_text": text,
        "source_url": entry.get("link", ""),
        "source": "Divine Office",
        "entry_date": chosen_date,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


# ----- iBreviary (Spanish / Italian) -----

async def _fetch_ibreviary(hour: str, lang: str) -> dict:
    hour_code = IBREVIARY_CODES[hour]
    url = f"{IBREVIARY_BASE}/breviario.php?s={hour_code}&lang={lang}"
    r = await _fetch_with_retry(url)
    soup = BeautifulSoup(r.text, "lxml")
    container = (soup.select_one("#contenuto") or soup.select_one(".contenuto")
                 or soup.select_one("#content") or soup.select_one("main")
                 or soup.select_one("body") or soup)
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
        "source": "iBreviary",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


async def _fetch_liturgy(hour: str, lang: str) -> dict:
    if lang == "en":
        return await _fetch_divine_office(hour)
    return await _fetch_ibreviary(hour, lang)


# ----- API -----

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
        "lauds": "Morning Prayer (Lauds)",
        "midmorning": "Midmorning Prayer",
        "midday": "Midday Prayer",
        "midafternoon": "Midafternoon Prayer",
        "vespers": "Evening Prayer (Vespers)",
        "compline": "Night Prayer (Compline)",
    }
    labels = labels_es if lang == "es" else labels_en
    return [{"id": k, "label": labels[k]} for k in HOURS]


@router.get("")
async def get_liturgy(request: Request,
                      hour: str = Query("lauds"),
                      lang: str = Query("es"),
                      refresh: bool = Query(False)):
    if hour not in IBREVIARY_CODES:
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

    try:
        data = await _fetch_liturgy(hour, lang)
    except HTTPException:
        stale = await db.liturgy_cache.find_one(
            {"hour": hour, "lang": lang},
            sort=[("fetched_at", -1)],
        )
        if stale:
            stale.pop("_id", None)
            stale["stale"] = True
            return stale
        raise

    doc = {"_id": cache_key, **data}
    await db.liturgy_cache.replace_one({"_id": cache_key}, doc, upsert=True)
    doc.pop("_id", None)
    return doc
