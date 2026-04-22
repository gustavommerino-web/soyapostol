"""Daily Mass Readings.
Sources:
  ES → https://www.aciprensa.com/calendario  (structured HTML, today's readings)
  EN → https://universalis.com/mass.htm       (structured HTML, today's readings)
Caches result per YYYY-MM-DD + lang in MongoDB.
Date selection: the sources only serve today's readings; 'date' param is accepted
but returns today's content (future enhancement: archive scraping).
"""
from datetime import datetime, timezone, date
from typing import Optional
import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Request, HTTPException, Query

router = APIRouter(prefix="/readings", tags=["readings"])

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
}


async def _fetch_es() -> dict:
    url = "https://www.aciprensa.com/calendario"
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=HEADERS) as client:
        r = await client.get(url)
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Readings source error: {r.status_code}")
    soup = BeautifulSoup(r.text, "lxml")

    # Liturgical day title
    h2 = soup.select_one("h2, h3")
    page_title = h2.get_text(" ", strip=True) if h2 else "Lecturas del día"
    # Try to find the proper liturgical day heading (first large heading containing letters)
    for h in soup.select("h1, h2, h3"):
        txt = h.get_text(" ", strip=True)
        if txt and 10 < len(txt) < 120 and "Calendario" not in txt:
            page_title = txt
            break

    sections = []
    # Each reading block is inside <li> under <div class="tab-content">
    # Heading is a <b> tag, citation is in <i>, verses are in span.readings__text
    for li in soup.select("div.tab-content li"):
        label_el = li.select_one("b")
        if not label_el:
            continue
        label = label_el.get_text(" ", strip=True)
        cite_el = li.select_one("i")
        citation = cite_el.get_text(" ", strip=True) if cite_el else ""
        # Combine verse spans
        verses = []
        for vc in li.select(".readings__verse-container"):
            num_el = vc.select_one(".readings__verse")
            txt_el = vc.select_one(".readings__text")
            if txt_el:
                num = num_el.get_text(strip=True) if num_el else ""
                text = txt_el.get_text(" ", strip=True)
                verses.append(f"{num} {text}".strip())
        if not verses:
            # Fallback: plain text under the li (comentario / aclamación)
            text = li.get_text("\n", strip=True)
            # strip the label from front
            if text.startswith(label):
                text = text[len(label):].strip()
            if citation and text.startswith(citation):
                text = text[len(citation):].strip()
            content = text
        else:
            content = "\n".join(verses)
        if not content:
            continue
        title = f"{label} — {citation}" if citation else label
        sections.append({"title": title, "label": label, "citation": citation, "content": content})

    return {
        "lang": "es",
        "source_url": url,
        "title": page_title,
        "sections": sections,
    }


async def _fetch_en() -> dict:
    url = "https://universalis.com/mass.htm"
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=HEADERS) as client:
        r = await client.get(url)
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Readings source error: {r.status_code}")
    soup = BeautifulSoup(r.text, "lxml")

    title_el = soup.select_one("h1#univPageName, h1")
    page_title = title_el.get_text(" ", strip=True) if title_el else "Readings at Mass"
    # Find liturgical rubric near top
    rubric = soup.select_one("p.rubric")
    if rubric:
        page_title = f"{page_title} · {rubric.get_text(' ', strip=True)}"

    sections = []
    # Each reading starts with <table class="each"> with th label + th citation
    for table in soup.select("table.each"):
        ths = table.select("th")
        if len(ths) < 1:
            continue
        label = ths[0].get_text(" ", strip=True)
        citation = ths[1].get_text(" ", strip=True) if len(ths) >= 2 else ""
        # Content is everything between this table and the next
        parts = []
        node = table.next_sibling
        while node is not None:
            name = getattr(node, "name", None)
            # Stop when we reach the next "each" table or <hr>
            if name == "table" and "each" in (node.get("class") or []):
                break
            if name == "hr":
                break
            if name in ("h4",):
                t = node.get_text(" ", strip=True)
                if t: parts.append(f"**{t}**")
            elif name in ("div",):
                cls = node.get("class") or []
                if "p" in cls or "pi" in cls or "v" in cls:
                    t = node.get_text(" ", strip=True)
                    if t: parts.append(t)
                else:
                    t = node.get_text(" ", strip=True)
                    if t: parts.append(t)
            elif name in ("p",):
                t = node.get_text(" ", strip=True)
                if t: parts.append(t)
            node = node.next_sibling
        content = "\n\n".join(parts).strip()
        if content:
            title = f"{label} — {citation}" if citation else label
            sections.append({"title": title, "label": label, "citation": citation, "content": content})

    return {
        "lang": "en",
        "source_url": url,
        "title": page_title,
        "sections": sections,
    }


@router.get("")
async def get_readings(request: Request,
                        date_str: Optional[str] = Query(None, alias="date"),
                        lang: str = Query("es")):
    if lang not in ("es", "en"):
        lang = "es"
    d = datetime.now(timezone.utc).date()
    if date_str:
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format (YYYY-MM-DD)")

    db = request.app.state.db
    today = datetime.now(timezone.utc).date().isoformat()
    cache_key = f"{today}_{lang}"  # cache today's readings only
    cached = await db.readings_cache.find_one({"_id": cache_key})
    if cached:
        cached.pop("_id", None)
        return cached

    data = await (_fetch_es() if lang == "es" else _fetch_en())
    data["date"] = today
    data["fetched_at"] = datetime.now(timezone.utc).isoformat()
    doc = {"_id": cache_key, **data}
    await db.readings_cache.replace_one({"_id": cache_key}, doc, upsert=True)
    doc.pop("_id", None)
    return doc
