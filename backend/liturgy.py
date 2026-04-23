"""Liturgy of the Hours.
- EN (primary): divineoffice.org RSS feed.
- ES (primary): liturgiadelashoras.github.io (GitHub Pages, fast/reliable).
- Fallback for all: ibreviary.com (ES/EN/IT).
Caches per (date, lang, hour); serves stale cache if source is unavailable.
"""
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs
import asyncio
import httpx
import feedparser
from bs4 import BeautifulSoup
from fastapi import APIRouter, Request, Query, HTTPException

router = APIRouter(prefix="/liturgy", tags=["liturgy"])

# Internal hour code → iBreviary id
IBREVIARY_CODES = {
    "office_of_readings": "ufficio_delle_letture",
    "lauds": "lodi",
    "midmorning": "terza",
    "midday": "sesta",
    "midafternoon": "nona",
    "vespers": "vespri",
    "compline": "compieta",
}

# Internal hour code → divineoffice.org RSS prayer code
DIVINE_OFFICE_CODES = {
    "office_of_readings": "OfficeOfReadings",
    "lauds": "MorningPrayer",
    "midmorning": "MidmorningPrayer",
    "midday": "MiddayPrayer",
    "midafternoon": "MidafternoonPrayer",
    "vespers": "EveningPrayer",
    "compline": "NightPrayer",
}

# Internal hour code → liturgiadelashoras.github.io filename
LDLH_CODES = {
    "office_of_readings": "oficio.htm",
    "lauds": "laudes.htm",
    "midmorning": "tercia.htm",
    "midday": "sexta.htm",
    "midafternoon": "nona.htm",
    "vespers": "visperas.htm",
    "compline": "completas.htm",
}

LDLH_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

HOURS = list(IBREVIARY_CODES.keys())
IBREVIARY_BASE = "https://www.ibreviary.com/m2"
DIVINE_OFFICE_FEED = "https://divineoffice.org/feed/"
LDLH_BASE = "https://liturgiadelashoras.github.io/sync"
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


# ---------- Divine Office (EN) ----------

async def _fetch_divine_office(hour: str) -> dict:
    prayer_code = DIVINE_OFFICE_CODES.get(hour)
    if not prayer_code:
        raise HTTPException(status_code=400, detail="Unsupported hour for Divine Office")
    today = datetime.now(timezone.utc).date().strftime("%Y%m%d")
    r = await _fetch_with_retry(DIVINE_OFFICE_FEED)
    feed = feedparser.parse(r.content)

    matching = []
    for entry in feed.entries:
        link = entry.get("link", "")
        q = parse_qs(urlparse(link).query)
        if q.get("prayer", [""])[0] != prayer_code:
            continue
        entry_date = q.get("date", [""])[0]
        matching.append((entry_date, entry))
    if not matching:
        raise HTTPException(status_code=502, detail="Divine Office feed missing entry")
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
    soup = BeautifulSoup(content_html, "lxml")
    for s in soup.select("audio, iframe, script, .powerpress_player, .podcast_links, .sharedaddy, .jp-audio"):
        s.decompose()
    cleaned_html = str(soup)
    text = soup.get_text("\n", strip=True)
    # Normalize entry_date YYYYMMDD → YYYY-MM-DD
    iso_entry_date = chosen_date
    if chosen_date and len(chosen_date) == 8 and chosen_date.isdigit():
        iso_entry_date = f"{chosen_date[:4]}-{chosen_date[4:6]}-{chosen_date[6:8]}"
    return {
        "hour": hour,
        "lang": "en",
        "title": entry.get("title", hour.replace("_", " ").title()),
        "content_html": cleaned_html,
        "content_text": text,
        "source_url": entry.get("link", ""),
        "source": "Divine Office",
        "entry_date": iso_entry_date,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------- Liturgia de las Horas (ES - primary) ----------

async def _fetch_ldlh(hour: str) -> dict:
    fname = LDLH_CODES.get(hour)
    if not fname:
        raise HTTPException(status_code=400, detail="Unsupported hour")
    d = datetime.now(timezone.utc).date()
    month_abbr = LDLH_MONTHS[d.month - 1]
    url = f"{LDLH_BASE}/{d.year}/{month_abbr}/{d.day:02d}/{fname}"
    r = await _fetch_with_retry(url)
    # Pages are declared as iso-8859-1
    r.encoding = "iso-8859-1"
    soup = BeautifulSoup(r.text, "lxml")
    for s in soup.select("script, style"):
        s.decompose()
    # The body text lives inside #cuerpo; the A/A/A font-size switcher sits in a div[align=right]
    for switcher in soup.select("div[align='right'], div[align=right]"):
        switcher.decompose()
    cuerpo = soup.select_one("#cuerpo") or soup.body or soup
    # Hour title is the first <STRONG> inside cuerpo (e.g., LAUDES, VÍSPERAS)
    strong = cuerpo.find("strong")
    spanish_titles = {
        "office_of_readings": "Oficio de Lecturas",
        "lauds": "Laudes",
        "midmorning": "Tercia",
        "midday": "Sexta",
        "midafternoon": "Nona",
        "vespers": "Vísperas",
        "compline": "Completas",
    }
    title = (strong.get_text(" ", strip=True).title() if strong else None) or spanish_titles.get(hour, hour.title())
    return {
        "hour": hour,
        "lang": "es",
        "title": title,
        "content_html": str(cuerpo),
        "content_text": cuerpo.get_text("\n", strip=True),
        "source_url": url,
        "source": "Liturgia de las Horas",
        "entry_date": d.isoformat(),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------- iBreviary (fallback) ----------

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
    return {
        "hour": hour,
        "lang": lang,
        "title": title,
        "content_html": str(container),
        "content_text": container.get_text("\n", strip=True),
        "source_url": url,
        "source": "iBreviary",
        "entry_date": datetime.now(timezone.utc).date().isoformat(),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


async def _fetch_liturgy(hour: str, lang: str) -> dict:
    """Try primary source, fall back to iBreviary if it fails."""
    if lang == "en":
        try:
            return await _fetch_divine_office(hour)
        except HTTPException:
            return await _fetch_ibreviary(hour, "en")
    if lang == "es":
        try:
            return await _fetch_ldlh(hour)
        except HTTPException:
            return await _fetch_ibreviary(hour, "es")
    # IT or other
    return await _fetch_ibreviary(hour, lang)


# ---------- API ----------

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
