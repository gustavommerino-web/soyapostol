"""Daily Mass Readings from USCCB (via Playwright, to bypass their WAF).
- ES  → https://bible.usccb.org/es/lectura-diaria-biblia
- EN  → https://bible.usccb.org/daily-bible-reading
The cache key uses the user's local date (passed by the browser as
`?date=YYYY-MM-DD`). This prevents early switching for users west of US
Eastern: their readings only roll over at their actual local midnight.
If no valid date is provided, we fall back to US Eastern as a safe default.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
import re
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


_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _resolve_date(date_str: Optional[str]) -> str:
    """Return a valid YYYY-MM-DD string. Honors the client-provided date when
    it parses; falls back to US Eastern otherwise."""
    if date_str and _DATE_RE.match(date_str):
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
            return date_str
        except ValueError:
            pass
    return _today_us_eastern()


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
    today = _resolve_date(date_str)
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


# ---------------------- Evangelio del Día (evangeliodeldia.org) ----------------------

EVANGELIO_DEL_DIA_URLS = {
    "es": "https://evangeliodeldia.org/SP/gospel",
    "en": "https://evangeliodeldia.org/am/gospel",
}


async def _scrape_evangelio_del_dia(lang: str) -> dict:
    """Render evangeliodeldia.org with a headless browser, click the
    'Comentario' / 'Commentary' tab and extract the cleaned commentary text.
    Returns ``{ html, text, author, title }``.
    """
    url = EVANGELIO_DEL_DIA_URLS.get(lang)
    if not url:
        raise HTTPException(status_code=400, detail=f"No commentary source for lang={lang}")
    browser = await get_browser()
    context = await browser.new_context(user_agent=UA, viewport={"width": 1280, "height": 1100})
    try:
        page = await context.new_page()
        resp = await page.goto(url, wait_until="networkidle", timeout=45000)
        if not resp or resp.status >= 400:
            raise HTTPException(status_code=502, detail=f"evangeliodeldia.org returned status {resp.status if resp else 'n/a'}")
        try:
            await page.wait_for_selector(".GospelCommentary", timeout=20000)
        except Exception:
            pass
        # Click the Comentario / Commentary tab if it exists.
        tab_label = "Commentary" if lang == "en" else "Comentario"
        try:
            await page.get_by_text(tab_label, exact=True).first.click(timeout=4000)
        except Exception:
            pass
        await page.wait_for_timeout(2000)

        debug = await page.evaluate(
            "() => ({n: document.querySelectorAll('.GospelCommentary').length,"
            "       len: (document.querySelector('.GospelCommentary')?.innerText || '').length})"
        )
        import logging as _log
        _log.getLogger(__name__).info("commentary scrape — %s", debug)

        data = await page.evaluate(r"""
            () => {
                const stripAttrs = (root) => {
                    if (!root) return null;
                    const clone = root.cloneNode(true);
                    clone.querySelectorAll(
                        'script, style, noscript, iframe, button, nav, ' +
                        'header, footer, img, svg, [aria-hidden="true"]'
                    ).forEach(n => n.remove());
                    clone.querySelectorAll('*').forEach(n => {
                        for (const a of [...n.attributes]) {
                            if (a.name === 'style' || a.name.startsWith('on') ||
                                a.name === 'class' || a.name === 'id' ||
                                a.name === 'lang' || a.name === 'dir') {
                                n.removeAttribute(a.name);
                            }
                        }
                    });
                    return clone;
                };

                const root = document.querySelector('.GospelCommentary');
                if (!root) return null;

                const grab = (sel) => {
                    const el = root.querySelector(sel);
                    return el ? el.innerText.trim() : '';
                };

                const author      = grab('.GospelCommentaryAuthor-name');
                const description = grab('.GospelCommentaryAuthor-description');
                const sourceLine  = grab('.GospelCommentaryAuthor-source');
                const title       = grab('.GospelCommentary-title');

                // Body paragraphs come from the description blocks.
                const paragraphs = [];
                root.querySelectorAll('.GospelCommentary-description, .commentary-description, .GospelReading-text').forEach((p) => {
                    const txt = p.innerText.trim();
                    if (!txt) return;
                    paragraphs.push(txt);
                });

                // De-dupe: never emit a paragraph that's identical to title /
                // author / description / source line.
                const skip = new Set(
                    [author, description, sourceLine, title]
                        .map(s => (s || '').toLowerCase().trim())
                        .filter(Boolean)
                );
                const cleanParagraphs = paragraphs.filter(p => !skip.has(p.toLowerCase().trim()));

                const cleanedHtml = (() => {
                    const div = document.createElement('div');
                    cleanParagraphs.forEach((t) => {
                        const p = document.createElement('p');
                        p.textContent = t;
                        div.appendChild(p);
                    });
                    return div.innerHTML;
                })();

                return {
                    author,
                    description,
                    source: sourceLine,
                    title,
                    paragraphs: cleanParagraphs,
                    text: cleanParagraphs.join('\n\n'),
                    html: cleanedHtml,
                };
            }
        """)
        if not data or not data.get("text") or len(data["text"]) < 200:
            raise HTTPException(status_code=502, detail="Commentary not found")
        return data
    finally:
        await context.close()


@router.get("/commentary")
async def get_commentary(request: Request,
                         lang: str = Query("es"),
                         date_str: Optional[str] = Query(None, alias="date"),
                         refresh: bool = Query(False)):
    """Daily commentary scraped from evangeliodeldia.org. Cached per
    (lang, date) — first hit of the day scrapes, the rest of the day is
    served from MongoDB."""
    if lang not in EVANGELIO_DEL_DIA_URLS:
        raise HTTPException(status_code=400, detail=f"Unsupported lang {lang}")
    db = request.app.state.db
    today = _resolve_date(date_str)
    cache_key = f"evangeliodeldia_{lang}_{today}"

    if not refresh:
        cached = await db.commentary_cache.find_one({"_id": cache_key})
        if cached:
            cached.pop("_id", None)
            return cached

    try:
        data = await _scrape_evangelio_del_dia(lang)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("commentary scrape failed: %s", e)
        # Last-resort: serve any prior cache for this lang so we never return a hard error.
        stale = await db.commentary_cache.find_one(
            {"lang": lang}, sort=[("fetched_at", -1)],
        )
        if stale:
            stale.pop("_id", None)
            stale["stale"] = True
            return stale
        raise HTTPException(status_code=503, detail="Commentary source temporarily unavailable.")

    doc = {
        "_id": cache_key,
        "date": today,
        "lang": lang,
        "source": "Evangelio del Día",
        "source_url": EVANGELIO_DEL_DIA_URLS[lang],
        "title": data.get("title", ""),
        "author": data.get("author", ""),
        "description": data.get("description", ""),
        "source_line": data.get("source", ""),
        "paragraphs": data.get("paragraphs", []),
        "html": data.get("html", ""),
        "text": data.get("text", ""),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.commentary_cache.replace_one({"_id": cache_key}, doc, upsert=True)
    doc.pop("_id", None)
    return doc
