"""Daily Mass Readings from USCCB (via Playwright, to bypass their WAF).
- ES  → https://bible.usccb.org/es/lectura-diaria-biblia
- EN  → https://bible.usccb.org/daily-bible-reading
USCCB publishes readings on US Eastern time, so the cache key uses that timezone
(not UTC) to avoid serving yesterday's content during late-night UTC hours.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Request, HTTPException, Query

from browser_pool import get_browser

router = APIRouter(prefix="/readings", tags=["readings"])

USCCB_ES = "https://bible.usccb.org/es/lectura-diaria-biblia"
USCCB_EN = "https://bible.usccb.org/daily-bible-reading"

# US Eastern time (EST/EDT, no DST handling needed for our caching purposes – worst case
# is a 1-hour delay around DST transitions, which is acceptable for a daily-cached page).
US_EASTERN_OFFSET = timedelta(hours=-4)  # EDT (April–November)


def _today_us_eastern() -> str:
    return (datetime.now(timezone.utc) + US_EASTERN_OFFSET).date().isoformat()

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")


# Extraction script used on the USCCB daily readings page.
# Returns: { pageTitle, day, dateText, sections:[{label,citation,content}] }
_EXTRACT_JS = """
() => {
  const h1 = document.querySelector('h1.page-title') || document.querySelector('h1');
  const pageTitle = h1 ? h1.innerText.trim() : document.title;

  // Try to extract a printed date from the page title or any obvious date field.
  // USCCB titles look like "Lecturas de Hoy - April 22, 2026 | USCCB".
  let dateText = '';
  const docTitleMatch = (document.title || '').match(/[-–]\\s*([A-Z][a-záéíóú]+\\s+\\d{1,2},\\s*\\d{4})/i);
  if (docTitleMatch) dateText = docTitleMatch[1];
  if (!dateText) {
      const titleMatch = pageTitle.match(/[-–]\\s*([A-Z][a-záéíóú]+\\s+\\d{1,2},\\s*\\d{4})/i);
      if (titleMatch) dateText = titleMatch[1];
  }

  // Liturgical day heading – pick h2 inside the main content area, excluding nav/aside.
  let day = '';
  const headings = Array.from(document.querySelectorAll('h2'))
      .filter(h => {
        const txt = (h.innerText || '').trim();
        if (!txt || txt.length > 160) return false;
        const low = txt.toLowerCase();
        if (low.startsWith('menu') || low.includes('navigation') || low.includes('newsletter')
            || low.includes('lista de correo') || low.includes('suscr') || low.includes('dive into')
            || low.includes('sign up') || low.includes('footer')) return false;
        return true;
      });
  if (headings.length) day = headings[0].innerText.trim();

  const sections = Array.from(document.querySelectorAll('.b-verse')).map(b => {
    const h = b.querySelector('h3.name') || b.querySelector('h3') || b.querySelector('h2.name') || b.querySelector('h2');
    const label = h ? h.innerText.trim() : '';
    const citeEl = b.querySelector('.address') || b.querySelector('.citation') || b.querySelector('[class*=citation]');
    const citation = citeEl ? citeEl.innerText.trim() : '';
    const bodyEl = b.querySelector('.content-body');
    const content = (bodyEl ? bodyEl.innerText : b.innerText).trim();
    return { label, citation, content };
  }).filter(s => s.content && s.label);

  return { pageTitle, day, dateText, sections };
}
"""


async def _scrape(url: str, lang: str) -> dict:
    browser = await get_browser()
    context = await browser.new_context(user_agent=UA, locale="es-ES" if lang == "es" else "en-US")
    page = await context.new_page()
    try:
        resp = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        if not resp or resp.status >= 400:
            raise HTTPException(status_code=502, detail=f"USCCB returned status {resp.status if resp else 'n/a'}")
        await page.wait_for_timeout(1200)
        data = await page.evaluate(_EXTRACT_JS)
    finally:
        await context.close()

    sections = []
    for s in data.get("sections", []):
        label = s["label"]
        citation = s.get("citation", "")
        title = f"{label} — {citation}" if citation else label
        sections.append({
            "title": title,
            "label": label,
            "citation": citation,
            "content": s["content"],
        })

    page_title = data.get("day") or data.get("pageTitle") or ""
    return {
        "lang": lang,
        "source_url": url,
        "title": page_title,
        "date_text": data.get("dateText", ""),
        "sections": sections,
    }


@router.get("")
async def get_readings(request: Request,
                        date_str: Optional[str] = Query(None, alias="date"),
                        lang: str = Query("es"),
                        refresh: bool = Query(False)):
    if lang not in ("es", "en"):
        lang = "es"

    db = request.app.state.db
    today = _today_us_eastern()
    cache_key = f"{today}_{lang}"

    if not refresh:
        cached = await db.readings_cache.find_one({"_id": cache_key})
        if cached:
            cached.pop("_id", None)
            return cached

    url = USCCB_ES if lang == "es" else USCCB_EN
    try:
        data = await _scrape(url, lang)
        if not data["sections"]:
            raise HTTPException(status_code=502, detail="No readings extracted")
    except Exception as e:
        import logging, traceback
        logging.getLogger(__name__).error("readings scrape failed: %s\n%s", e, traceback.format_exc())
        # Fallback: serve any stale cache for this language
        stale = await db.readings_cache.find_one({"lang": lang}, sort=[("fetched_at", -1)])
        if stale:
            stale.pop("_id", None)
            stale["stale"] = True
            return stale
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=503, detail="Readings source temporarily unavailable.")

    data["date"] = today
    data["fetched_at"] = datetime.now(timezone.utc).isoformat()
    doc = {"_id": cache_key, **data}
    await db.readings_cache.replace_one({"_id": cache_key}, doc, upsert=True)
    doc.pop("_id", None)
    return doc
