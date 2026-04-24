"""Catholic Bible.
Sources (per user request):
  - English (NABRE): https://bible.usccb.org/bible/{slug}/{chapter}
  - Spanish (Biblia de la Iglesia en América): https://www.vatican.va/archive/ESL0506/__P*.HTM

Every chapter is cached in MongoDB; stale cache is served if the source fails.
Playwright is used for USCCB (WAF blocks plain HTTP), httpx for Vatican.
"""
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import html
import json
import re
import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Request, Query, HTTPException

from bible_index import build_book_index
from browser_pool import get_browser

router = APIRouter(prefix="/bible", tags=["bible"])

_BOOK_INDEX: list[dict] | None = None


def _load_index() -> list[dict]:
    global _BOOK_INDEX
    if _BOOK_INDEX is None:
        data_path = Path(__file__).parent / "data" / "vatican_es_books.json"
        vatican = json.loads(data_path.read_text(encoding="utf-8"))
        _BOOK_INDEX = build_book_index(vatican)
    return _BOOK_INDEX


# ---------- English: USCCB NABRE via Playwright (shared with readings.py) ----------

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")


# JS extractor for USCCB NABRE chapter pages.
# Verses live in <div class="verse"> with <span class="bcv">N</span><span class="txt">text</span>
# Footnote/cross-ref markers are <a class="fnref"> and <a class="enref">.
_USCCB_EXTRACT_JS = """
() => {
  const area = document.querySelector('.contentarea') || document.querySelector('article') || document.body;
  const clone = area.cloneNode(true);
  // Drop footnote/cross-ref markers
  clone.querySelectorAll('a.fnref, a.enref, sup.footnote, .footnotes, .cross-references').forEach(n => n.remove());

  const out = [];
  clone.querySelectorAll('div.verse').forEach(div => {
    const bcv = div.querySelector('.bcv');
    const txt = div.querySelector('.txt');
    if (!bcv || !txt) return;
    const n = parseInt(bcv.innerText.trim(), 10);
    if (Number.isNaN(n)) return;
    const text = txt.innerText.replace(/\\s+/g, ' ').trim();
    if (text) out.push({verse: n, text});
  });
  return {chapterTitle: (document.querySelector('h1')?.innerText || '').trim(), verses: out};
}
"""


async def _fetch_nabre(slug: str, chapter: int) -> list[dict]:
    browser = await get_browser()
    ctx = await browser.new_context(user_agent=UA, locale="en-US")
    page = await ctx.new_page()
    try:
        url = f"https://bible.usccb.org/bible/{slug}/{chapter}"
        resp = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        if not resp or resp.status >= 400:
            raise HTTPException(status_code=502, detail=f"USCCB returned {resp.status if resp else 'n/a'}")
        await page.wait_for_timeout(800)
        data = await page.evaluate(_USCCB_EXTRACT_JS)
    finally:
        await ctx.close()
    verses = data.get("verses", []) or []
    # Filter empty verses, clean
    out = []
    for v in verses:
        txt = (v.get("text") or "").strip()
        if not txt:
            continue
        # Drop pagination / footnote residue
        if re.fullmatch(r"[\s\*abcdefghijklmnopqrstuvwxyz]+", txt):
            continue
        out.append({"verse": int(v["verse"]), "text": txt})
    return out


# ---------- Spanish: vatican.va static HTML ----------

async def _fetch_vatican_es(chapter_url: str) -> list[dict]:
    full = f"https://www.vatican.va/archive/ESL0506/{chapter_url}"
    async with httpx.AsyncClient(timeout=15, follow_redirects=True,
                                 headers={"User-Agent": UA}) as client:
        r = await client.get(full)
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Vatican returned {r.status_code}")
    r.encoding = "iso-8859-1"
    soup = BeautifulSoup(r.text, "lxml")
    # Verses are in <p class="MsoNormal"> starting with "N text"
    paragraphs = soup.select("p.MsoNormal, p[class^='Msonormal']")
    if not paragraphs:
        paragraphs = soup.select("p")

    verses = []
    for p in paragraphs:
        text = p.get_text(" ", strip=True)
        text = html.unescape(text)
        if not text:
            continue
        m = re.match(r"^\s*(\d+)\s+(.+)$", text, re.DOTALL)
        if not m:
            continue
        num = int(m.group(1))
        body = m.group(2).strip()
        # Collapse whitespace
        body = re.sub(r"\s+", " ", body).strip()
        if body:
            verses.append({"verse": num, "text": body})
    return verses


# ---------- API ----------

@router.get("/translations")
async def translations():
    return {
        "en": [{"code": "NABRE", "name": "New American Bible Revised Edition (USCCB)"}],
        "es": [{"code": "BIA", "name": "Biblia de la Iglesia en América (Vatican)"}],
    }


@router.get("/books")
async def books(lang: str = Query("es")):
    if lang not in ("es", "en"):
        lang = "es"
    idx = _load_index()
    out = []
    for b in idx:
        if b["chapters"] is None:
            continue
        out.append({
            "bookid": b["bookid"],
            "name": b["name_es"] if lang == "es" else b["name_en"],
            "chapters": b["chapters"],
        })
    return {"translation": "BIA" if lang == "es" else "NABRE", "books": out}


@router.get("/chapter")
async def chapter(request: Request,
                  book: int = Query(...),
                  chapter: int = Query(...),
                  lang: str = Query("es")):
    if lang not in ("es", "en"):
        lang = "es"
    idx = _load_index()
    if book < 1 or book > len(idx):
        raise HTTPException(status_code=400, detail="Invalid book id")
    entry = idx[book - 1]
    if entry["chapters"] is None:
        raise HTTPException(status_code=404, detail="Book has no chapters mapped")
    if chapter < 1 or chapter > entry["chapters"]:
        raise HTTPException(status_code=400, detail="Invalid chapter")

    code = "NABRE" if lang == "en" else "BIA"
    db = request.app.state.db
    cache_key = f"bible2_{code}_{book}_{chapter}"
    cached = await db.bible_cache.find_one({"_id": cache_key})
    if cached:
        return {"translation": code, "book": book, "chapter": chapter,
                "book_name": entry["name_es"] if lang == "es" else entry["name_en"],
                "verses": cached["verses"]}

    try:
        if lang == "en":
            verses = await _fetch_nabre(entry["usccb_slug"], chapter)
        else:
            verses = await _fetch_vatican_es(entry["vatican_urls"][chapter - 1])
        if not verses:
            raise HTTPException(status_code=502, detail="No verses extracted")
    except Exception as e:
        # Fallback: serve stale cache for this exact book/chapter/translation if it ever succeeded before
        stale = await db.bible_cache.find_one(
            {"translation": code, "book": book, "chapter": chapter}
        )
        if stale:
            return {"translation": code, "book": book, "chapter": chapter,
                    "book_name": entry["name_es"] if lang == "es" else entry["name_en"],
                    "verses": stale["verses"], "stale": True}
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=503, detail="Bible source temporarily unavailable")

    doc = {"_id": cache_key, "translation": code, "book": book, "chapter": chapter,
           "verses": verses, "fetched_at": datetime.now(timezone.utc).isoformat()}
    await db.bible_cache.replace_one({"_id": cache_key}, doc, upsert=True)
    return {"translation": code, "book": book, "chapter": chapter,
            "book_name": entry["name_es"] if lang == "es" else entry["name_en"],
            "verses": verses}
