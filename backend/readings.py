"""Daily Mass Readings from USCCB (via Playwright, to bypass their WAF).
- ES  → https://bible.usccb.org/es/lectura-diaria-biblia
- EN  → https://bible.usccb.org/daily-bible-reading
Caches today's readings per lang in MongoDB and serves stale cache if the source
is unavailable. A single headless Chromium instance is shared across requests.
"""
from datetime import datetime, timezone
from typing import Optional
import asyncio
from fastapi import APIRouter, Request, HTTPException, Query
from playwright.async_api import async_playwright, Browser

router = APIRouter(prefix="/readings", tags=["readings"])

USCCB_ES = "https://bible.usccb.org/es/lectura-diaria-biblia"
USCCB_EN = "https://bible.usccb.org/daily-bible-reading"

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")

_browser: Optional[Browser] = None
_playwright = None
_browser_lock = asyncio.Lock()


async def _get_browser() -> Browser:
    global _browser, _playwright
    async with _browser_lock:
        if _browser is None or not _browser.is_connected():
            _playwright = await async_playwright().start()
            _browser = await _playwright.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
            )
        return _browser


# Extraction script used on the USCCB daily readings page.
# Returns: { title, day, source_url, sections:[{label,citation,content}] }
_EXTRACT_JS = """
() => {
  const h1 = document.querySelector('h1.page-title') || document.querySelector('h1');
  const pageTitle = h1 ? h1.innerText.trim() : document.title;

  // Liturgical day heading – pick h2 inside the main content area, excluding nav/aside.
  let day = '';
  const headings = Array.from(document.querySelectorAll('h2'))
      .filter(h => {
        const txt = (h.innerText || '').trim();
        if (!txt || txt.length > 160) return false;
        const low = txt.toLowerCase();
        // Exclude common navigation / sidebar / menu headings
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

  return { pageTitle, day, sections };
}
"""


async def _scrape(url: str, lang: str) -> dict:
    browser = await _get_browser()
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
    today = datetime.now(timezone.utc).date().isoformat()
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
