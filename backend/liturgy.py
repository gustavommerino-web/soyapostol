"""Liturgy of the Hours.
- EN (primary): divineoffice.org RSS feed.
- ES (primary): liturgiadelashoras.github.io (GitHub Pages, fast/reliable).
- Fallback for all: ibreviary.com (ES/EN/IT).
Caches per (date, lang, hour); serves stale cache if source is unavailable.
The cache date honors the client-provided `?date=YYYY-MM-DD` (browser local
date) so the prayer only rolls over at the user's actual midnight.
"""
from datetime import date as date_cls, datetime, timezone
from typing import Optional
from urllib.parse import urlparse, parse_qs
import asyncio
import re
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

# Internal hour code → divineoffice.org RSS prayer code (legacy URL filter)
DIVINE_OFFICE_CODES = {
    "office_of_readings": "OfficeOfReadings",
    "lauds": "MorningPrayer",
    "midmorning": "MidmorningPrayer",
    "midday": "MiddayPrayer",
    "midafternoon": "MidafternoonPrayer",
    "vespers": "EveningPrayer",
    "compline": "NightPrayer",
}

# divineoffice.org exposes each item under multiple <category> tags. Two
# are relevant for filtering:
#   - a human-readable label, e.g. "Divine Office -- Morning Prayer (Lauds)"
#   - a canonical short code, e.g. "MorningPrayer"
# Invitatory/About entries share the human label with their parent hour, so
# we match first on the canonical code (always unique per hour) and accept
# the human label only as a secondary signal when paired with the canonical.
DIVINE_OFFICE_CATEGORY_CODES = {
    "office_of_readings": {"officeofreadings"},
    "lauds":              {"morningprayer"},
    "midmorning":         {"midmorningprayer"},
    "midday":             {"middayprayer"},
    "midafternoon":       {"midafternoonprayer"},
    "vespers":            {"eveningprayer"},
    "compline":           {"nightprayer"},
}

# Human-readable base (after stripping "Divine Office -- " and parenthetical)
DIVINE_OFFICE_CATEGORY_BASES = {
    "office_of_readings": {"office of readings"},
    "lauds":              {"morning prayer"},
    "midmorning":         {"midmorning prayer"},
    "midday":             {"midday prayer"},
    "midafternoon":       {"midafternoon prayer"},
    "vespers":            {"evening prayer"},
    "compline":           {"night prayer"},
}


def _entry_matches_hour(entry, hour: str) -> bool:
    """True when the RSS entry carries the canonical <category> for this hour.

    The feed bundles both a canonical code tag (e.g. ``MorningPrayer``) and a
    prose label (e.g. ``Divine Office -- Morning Prayer (Lauds)``); we match
    on the canonical code because the prose label is shared with Invitatory
    and "About" items for the same day.
    """
    codes = DIVINE_OFFICE_CATEGORY_CODES.get(hour, set())
    if not codes:
        return False
    for tag in entry.get("tags", []) or []:
        term = (tag.get("term") or "").strip().lower()
        if term in codes:
            return True
    return False


def _entry_date(entry) -> Optional[date_cls]:
    """Return the entry's liturgical day.

    Divine Office publishes each prayer the day *before* the liturgical day
    it refers to, so `published_parsed` is usually offset by ~24 h. The URL
    query ``?date=YYYYMMDD`` matches the actual liturgical day — prefer it.
    """
    link = entry.get("link", "")
    q = parse_qs(urlparse(link).query)
    raw = q.get("date", [""])[0]
    if raw and len(raw) == 8 and raw.isdigit():
        try:
            return date_cls(int(raw[:4]), int(raw[4:6]), int(raw[6:8]))
        except ValueError:
            pass
    pp = entry.get("published_parsed")
    if pp:
        try:
            return date_cls(pp.tm_year, pp.tm_mon, pp.tm_mday)
        except (TypeError, ValueError):
            return None
    return None

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
CACHE_TTL_SECONDS = 3600  # 1 hour — hourly refresh per user spec
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
}


_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _resolve_date(date_str: Optional[str]) -> date_cls:
    """Return the requested date when valid, otherwise UTC today."""
    if date_str and _DATE_RE.match(date_str):
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            pass
    return datetime.now(timezone.utc).date()


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

async def _fetch_divine_office(hour: str, target_date: date_cls) -> dict:
    """Read the divineoffice.org RSS feed, iterate <item> elements, filter by
    <category> (e.g. "Morning Prayer (Lauds)") and return the entry that
    matches `target_date`. If no entry for that date exists, return the most
    recent matching item so the user always gets *something*.
    """
    if hour not in DIVINE_OFFICE_CATEGORY_CODES:
        raise HTTPException(status_code=400, detail="Unsupported hour for Divine Office")
    r = await _fetch_with_retry(DIVINE_OFFICE_FEED)
    feed = feedparser.parse(r.content)

    matching = []  # list of (entry_date, entry) — entry_date may be None
    for entry in feed.entries:
        if not _entry_matches_hour(entry, hour):
            continue
        matching.append((_entry_date(entry), entry))

    if not matching:
        raise HTTPException(status_code=502, detail="Divine Office feed missing category for hour")

    # Prefer today's entry, otherwise the most recent one we can date, otherwise
    # the first one the feed gave us.
    chosen_entry = None
    chosen_date = None
    for d, e in matching:
        if d == target_date:
            chosen_date, chosen_entry = d, e
            break
    if chosen_entry is None:
        dated = [(d, e) for d, e in matching if d is not None]
        if dated:
            dated.sort(key=lambda x: x[0], reverse=True)
            chosen_date, chosen_entry = dated[0]
        else:
            chosen_date, chosen_entry = matching[0]

    # The prayer body lives in <content:encoded>; feedparser exposes it under
    # entry.content[0].value. Strip media/share widgets but KEEP inline styles
    # — divineoffice.org marks breviary rubrics with
    #   <span style="color: #ff0000;">...</span>
    content_html = ""
    if chosen_entry.get("content"):
        content_html = chosen_entry["content"][0].get("value", "") or ""
    if not content_html:
        content_html = chosen_entry.get("summary", "") or ""

    soup = BeautifulSoup(content_html, "lxml")
    # Remove player widgets, audio embeds, share badges, scripts.
    for sel in (
        "audio", "iframe", "script", "style", "form",
        ".powerpress_player", ".powerpress_links", ".podcast_links",
        ".sharedaddy", ".sd-block", ".jp-audio",
        "div[id^='powerpress_player']", "div[class*='powerpress']",
    ):
        for node in soup.select(sel):
            node.decompose()
    # Unwrap any leftover <a> that only wrap media.
    for a in soup.find_all("a"):
        if a.find(["audio", "iframe"]):
            a.decompose()

    # Return only the inner HTML of <body> so the frontend can inject it
    # directly via dangerouslySetInnerHTML without swallowed <html>/<body>.
    body = soup.body
    if body is not None:
        cleaned_html = body.decode_contents().strip()
    else:
        cleaned_html = str(soup).strip()
    text = soup.get_text("\n", strip=True)

    entry_iso = chosen_date.isoformat() if isinstance(chosen_date, date_cls) else None
    return {
        "hour": hour,
        "lang": "en",
        "title": chosen_entry.get("title", hour.replace("_", " ").title()),
        "content_html": cleaned_html,
        "content_text": text,
        "source_url": chosen_entry.get("link", ""),
        "source": "Divine Office",
        "entry_date": entry_iso,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------- Liturgia de las Horas (ES - primary) ----------

async def _fetch_ldlh(hour: str, target_date: date_cls) -> dict:
    fname = LDLH_CODES.get(hour)
    if not fname:
        raise HTTPException(status_code=400, detail="Unsupported hour")
    d = target_date
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

async def _fetch_ibreviary(hour: str, lang: str, target_date: date_cls) -> dict:
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
        "entry_date": target_date.isoformat(),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


async def _fetch_liturgy(hour: str, lang: str, target_date: date_cls) -> dict:
    """Try primary source, fall back to iBreviary if it fails."""
    if lang == "en":
        try:
            return await _fetch_divine_office(hour, target_date)
        except HTTPException:
            return await _fetch_ibreviary(hour, "en", target_date)
    if lang == "es":
        try:
            return await _fetch_ldlh(hour, target_date)
        except HTTPException:
            return await _fetch_ibreviary(hour, "es", target_date)
    # IT or other
    return await _fetch_ibreviary(hour, lang, target_date)


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
                      date_str: Optional[str] = Query(None, alias="date"),
                      refresh: bool = Query(False)):
    if hour not in IBREVIARY_CODES:
        raise HTTPException(status_code=400, detail="Invalid hour")
    if lang not in ("es", "en", "it"):
        lang = "es"

    db = request.app.state.db
    target_date = _resolve_date(date_str)
    today = target_date.isoformat()
    cache_key = f"{today}_{lang}_{hour}"

    if not refresh:
        cached = await db.liturgy_cache.find_one({"_id": cache_key})
        if cached:
            # Honour the 1h TTL: serve cache only if fresh, otherwise fall
            # through and re-fetch. Stale-while-error still covered below.
            fetched_at = cached.get("fetched_at")
            fresh = False
            if fetched_at:
                try:
                    fa = datetime.fromisoformat(str(fetched_at).replace("Z", "+00:00"))
                    if fa.tzinfo is None:
                        fa = fa.replace(tzinfo=timezone.utc)
                    fresh = (datetime.now(timezone.utc) - fa).total_seconds() < CACHE_TTL_SECONDS
                except ValueError:
                    fresh = False
            if fresh:
                cached.pop("_id", None)
                return cached

    try:
        data = await _fetch_liturgy(hour, lang, target_date)
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
