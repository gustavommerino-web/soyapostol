"""Daily Mass readings via the official Evangelizo RSS feed.

Endpoint: GET /api/readings?lang={es|en}&date={YYYY-MM-DD}

Under the hood this aggregates 11 parallel calls to
`https://feed.evangelizo.org/v2/reader.php` (one per type/content combination):

    type=liturgic_t                          →  "5º domingo de Pascua"
    type=reading_lt & content=FR|PS|SR|GSP   →  book/chapter header
    type=reading    & content=FR|PS|SR|GSP   →  body text (HTML with <br/>)
    type=comment_t  |  comment_a  |  comment_s  |  comment

Results are cached in MongoDB (`readings_cache`, keyed by "{date}_{lang}",
TTL 7 days) so the 5-sunday liturgy doesn't need 11 upstream hits per user
per reload. Stale cache is served if the upstream is temporarily down —
this matches the behaviour of liturgy/news caches.

The response shape is consumed by `frontend/src/pages/Readings.jsx`:

    {
      "date": "2026-05-03",
      "lang": "es",
      "liturgic_title": "5º domingo de Pascua",
      "first_reading":  { "title": "...", "text_html": "..." },  # or null
      "psalm":          { "title": "...", "text_html": "..." },  # or null
      "second_reading": { "title": "...", "text_html": "..." },  # weekdays = null
      "gospel":         { "title": "...", "text_html": "..." },  # or null
      "commentary":     { "title": "...", "author": "...", "source": "...", "text_html": "..." }
    }

`text_html` is pre-sanitised HTML safe for `dangerouslySetInnerHTML` on the
frontend (still wrapped in DOMPurify there as a defence-in-depth).
"""
from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Query, Request

router = APIRouter(prefix="/readings", tags=["readings"])
logger = logging.getLogger(__name__)

FEED_URL = "https://feed.evangelizo.org/v2/reader.php"

# Evangelizo language codes. We expose only the two we ship UI for.
LANG_CODE = {"es": "SP", "en": "AM"}

CONTENT_KEYS = ("FR", "PS", "SR", "GSP")

# Cache: 7 days is enough for the "yesterday" / "today" navigation and lets
# us serve stale data if evangelizo is ever down.
CACHE_TTL_SECONDS = 7 * 24 * 3600

HTTP_TIMEOUT = 12.0  # seconds, per-request

# Strip the <font ...>...</font> wrappers Evangelizo uses for titles and
# commentary headers. We keep the inner text verbatim. <br/> tags are kept
# because they carry line breaks that the frontend renders as paragraph
# boundaries.
_FONT_OPEN_RE = re.compile(r"<font\b[^>]*>", re.IGNORECASE)
_FONT_CLOSE_RE = re.compile(r"</font>", re.IGNORECASE)
# Very defensive: drop any <script> / <style> blocks if they ever appear.
_FORBIDDEN_RE = re.compile(
    r"<(script|style|iframe|object|embed)\b[^>]*>.*?</\1>",
    re.IGNORECASE | re.DOTALL,
)

# Evangelizo appends an attribution + subscription footer to every reading
# body. It is preceded by 2-3 consecutive `<br />` and a Spanish or English
# attribution line. We strip it so the prose ends cleanly, and so that an
# otherwise-empty reading (e.g. SR on a weekday) collapses to "" → null.
_FOOTER_RE = re.compile(
    r"(<br\s*/?>\s*){1,}\s*"
    r"(Extraído de la Biblia|Copyright\s*©\s*Confraternity|"
    r"Para recibir cada mañana|To receive the Gospel every morning).*$",
    re.IGNORECASE | re.DOTALL,
)


def _clean(text: str) -> str:
    """Remove wrapper <font> tags, the Evangelizo footer, and any
    forbidden elements. `<br/>` is preserved as a soft line-break; the
    frontend converts runs of them into paragraph boundaries.
    """
    if not text:
        return ""
    t = _FORBIDDEN_RE.sub("", text)
    t = _FOOTER_RE.sub("", t)
    t = _FONT_OPEN_RE.sub("", t)
    t = _FONT_CLOSE_RE.sub("", t)
    return t.strip()


def _non_empty(s: str) -> Optional[str]:
    s = (s or "").strip()
    return s or None


async def _fetch_one(client: httpx.AsyncClient, params: dict) -> str:
    """GET one snippet from the Evangelizo feed. Returns the raw body or
    an empty string on HTTP errors so the aggregate endpoint degrades
    gracefully instead of failing the whole page for one missing reading.
    """
    try:
        r = await client.get(FEED_URL, params=params)
        if r.status_code != 200:
            return ""
        # Evangelizo sometimes returns an empty body (e.g. SR on weekdays).
        return r.text or ""
    except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.ConnectError,
            httpx.RemoteProtocolError, httpx.HTTPError):
        return ""


async def _fetch_day(date_compact: str, lang_code: str) -> dict:
    """Fan-out the 11 calls needed to build one day/lang payload."""
    base = {"date": date_compact, "lang": lang_code}

    # Build the tasks list so the order matches our result indices.
    async with httpx.AsyncClient(
        timeout=HTTP_TIMEOUT,
        headers={"User-Agent": "soyapostol/1.0 (+https://soyapostol.org)"},
        follow_redirects=True,
    ) as client:
        jobs = [
            _fetch_one(client, {**base, "type": "liturgic_t"}),
        ]
        # reading_lt + reading for each content key
        for key in CONTENT_KEYS:
            jobs.append(_fetch_one(client, {**base, "type": "reading_lt", "content": key}))
            jobs.append(_fetch_one(client, {**base, "type": "reading",    "content": key}))
        # Commentary pieces
        jobs.append(_fetch_one(client, {**base, "type": "comment_t"}))
        jobs.append(_fetch_one(client, {**base, "type": "comment_a"}))
        jobs.append(_fetch_one(client, {**base, "type": "comment_s"}))
        jobs.append(_fetch_one(client, {**base, "type": "comment"}))
        results = await asyncio.gather(*jobs)

    liturgic = _clean(results[0])

    sections: dict[str, Optional[dict]] = {}
    for i, key in enumerate(CONTENT_KEYS):
        title = _clean(results[1 + i * 2])
        body  = _clean(results[2 + i * 2])
        if not body and not title:
            sections[key] = None
        else:
            sections[key] = {"title": title or None, "text_html": body or ""}

    c_t = _clean(results[9])
    c_a = _clean(results[10])
    c_s = _clean(results[11])
    c_body = _clean(results[12])
    commentary = None
    if c_body or c_t:
        commentary = {
            "title":     _non_empty(c_t),
            "author":    _non_empty(c_a),
            "source":    _non_empty(c_s),
            "text_html": c_body or "",
        }

    return {
        "liturgic_title":   _non_empty(liturgic),
        "first_reading":    sections["FR"],
        "psalm":            sections["PS"],
        "second_reading":   sections["SR"],
        "gospel":           sections["GSP"],
        "commentary":       commentary,
    }


def _compact(date_iso: str) -> str:
    # Accept both "YYYY-MM-DD" and "YYYYMMDD".
    digits = re.sub(r"[^0-9]", "", date_iso)
    if len(digits) != 8:
        raise HTTPException(status_code=400, detail="Invalid date")
    # Sanity check.
    try:
        datetime.strptime(digits, "%Y%m%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date")
    return digits


@router.get("")
async def get_readings(
    request: Request,
    lang: str = Query("es"),
    date:  Optional[str] = Query(None, description="YYYY-MM-DD (defaults to UTC today)"),
    refresh: bool = Query(False, description="Bypass cache and refetch"),
):
    """Consolidated daily readings for the requested language/date.

    Caches results per (date, lang) for 7 days. Serves stale cache as a
    fallback when the upstream feed is unreachable.
    """
    if lang not in LANG_CODE:
        lang = "es"
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    compact = _compact(date)
    cache_key = f"{compact}_{lang}"

    db = request.app.state.db

    # Cache lookup (unless bypassed).
    if not refresh:
        cached = await db.readings_cache.find_one({"_id": cache_key})
        if cached:
            fetched_at = cached.get("fetched_at")
            fresh = False
            if fetched_at:
                try:
                    ts = datetime.fromisoformat(fetched_at)
                    if ts.tzinfo is None:
                        ts = ts.replace(tzinfo=timezone.utc)
                    fresh = (datetime.now(timezone.utc) - ts).total_seconds() < CACHE_TTL_SECONDS
                except ValueError:
                    fresh = False
            if fresh:
                cached.pop("_id", None)
                cached.pop("fetched_at", None)
                return cached

    # Fetch fresh.
    try:
        payload = await _fetch_day(compact, LANG_CODE[lang])
    except Exception as e:  # noqa: BLE001
        logger.error("readings fetch failed for %s: %s", cache_key, e)
        payload = None

    if not payload or not any(payload.get(k) for k in
                              ("liturgic_title", "first_reading", "psalm",
                               "gospel", "commentary")):
        # Upstream failed and payload is empty — try stale cache.
        stale = await db.readings_cache.find_one({"_id": cache_key})
        if stale:
            stale.pop("_id", None)
            stale.pop("fetched_at", None)
            return stale
        raise HTTPException(status_code=502, detail="Readings source unavailable")

    out = {
        "date": date,
        "lang": lang,
        **payload,
    }

    # Persist cache. `fetched_at` drives the TTL check above.
    await db.readings_cache.replace_one(
        {"_id": cache_key},
        {
            "_id": cache_key,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            **out,
        },
        upsert=True,
    )
    return out
