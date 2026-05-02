"""Catechism of the Catholic Church (CCC) - official Vatican source.
- ES: https://www.vatican.va/archive/catechism_sp/*_sp.html   (iso-8859-1)
- EN: https://www.vatican.va/archive/ENG0015/__P*.HTM         (iso-8859-1)
Each language has a precomputed manifest mapping Vatican pages to paragraph
ranges (see /app/backend/data/ccc_*_manifest.json). Paragraph text is scraped
from the HTML on first request and cached in MongoDB per-page.
"""
from datetime import datetime, timezone
from pathlib import Path
import html
import json
import re
import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Request, Query, HTTPException

router = APIRouter(prefix="/catechism", tags=["catechism"])

DATA_DIR = Path(__file__).parent / "data"
VATICAN_BASE = {
    "es": "https://www.vatican.va/archive/catechism_sp/",
    "en": "https://www.vatican.va/archive/ENG0015/",
}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
}

_MANIFEST_CACHE: dict[str, list[dict]] = {}


def _manifest(lang: str) -> list[dict]:
    if lang not in _MANIFEST_CACHE:
        path = DATA_DIR / f"ccc_{lang}_manifest.json"
        _MANIFEST_CACHE[lang] = json.loads(path.read_text(encoding="utf-8"))
    return _MANIFEST_CACHE[lang]


# Structural navigation for the UI (same as before, now paragraph ranges cover the whole CCC)
STRUCTURE = [
    {"part": 1, "title_es": "La profesión de la fe", "title_en": "The Profession of Faith",
     "sections": [
         {"id": "1-1", "title_es": "El hombre es capaz de Dios", "title_en": "Man's Capacity for God", "start": 26, "end": 49},
         {"id": "1-2", "title_es": "Dios al encuentro del hombre", "title_en": "God Comes to Meet Man", "start": 50, "end": 141},
         {"id": "1-3", "title_es": "La respuesta del hombre a Dios", "title_en": "Man's Response to God", "start": 142, "end": 184},
         {"id": "1-4", "title_es": "Creo en Dios Padre", "title_en": "I Believe in God the Father", "start": 185, "end": 421},
         {"id": "1-5", "title_es": "Creo en Jesucristo, el Hijo único de Dios", "title_en": "I Believe in Jesus Christ", "start": 422, "end": 682},
         {"id": "1-6", "title_es": "Creo en el Espíritu Santo", "title_en": "I Believe in the Holy Spirit", "start": 683, "end": 1065},
     ]},
    {"part": 2, "title_es": "La celebración del misterio cristiano", "title_en": "The Celebration of the Christian Mystery",
     "sections": [
         {"id": "2-1", "title_es": "La economía sacramental", "title_en": "The Sacramental Economy", "start": 1066, "end": 1209},
         {"id": "2-2", "title_es": "Los siete sacramentos de la Iglesia", "title_en": "The Seven Sacraments of the Church", "start": 1210, "end": 1690},
     ]},
    {"part": 3, "title_es": "La vida en Cristo", "title_en": "Life in Christ",
     "sections": [
         {"id": "3-1", "title_es": "La vocación del hombre: la vida en el Espíritu", "title_en": "Man's Vocation: Life in the Spirit", "start": 1691, "end": 2051},
         {"id": "3-2", "title_es": "Los diez mandamientos", "title_en": "The Ten Commandments", "start": 2052, "end": 2557},
     ]},
    {"part": 4, "title_es": "La oración cristiana", "title_en": "Christian Prayer",
     "sections": [
         {"id": "4-1", "title_es": "La oración en la vida cristiana", "title_en": "Prayer in the Christian Life", "start": 2558, "end": 2758},
         {"id": "4-2", "title_es": "La oración del Señor: el Padrenuestro", "title_en": "The Lord's Prayer: 'Our Father'", "start": 2759, "end": 2865},
     ]},
]


@router.get("/structure")
async def structure(lang: str = Query("es")):
    result = []
    for part in STRUCTURE:
        sections = []
        for s in part["sections"]:
            sections.append({
                "id": s["id"],
                "title": s["title_es"] if lang == "es" else s["title_en"],
                "start": s["start"],
                "end": s["end"],
            })
        result.append({
            "part": part["part"],
            "title": part["title_es"] if lang == "es" else part["title_en"],
            "sections": sections,
        })
    return result


_NUMBERED_PARA_RE = re.compile(r"^\s*(\d{1,4})\s+(.+)$", re.DOTALL)


async def _fetch_page_paragraphs(lang: str, page: str, db) -> list[dict]:
    """Fetch a single Vatican CCC HTML page, extract its paragraphs, and cache."""
    cache_key = f"ccc_page_{lang}_{page}"
    cached = await db.catechism_cache.find_one({"_id": cache_key})
    if cached:
        return cached["paragraphs"]

    url = VATICAN_BASE[lang] + page
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=HEADERS) as client:
        r = await client.get(url)
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Vatican CCC returned {r.status_code}")
    r.encoding = "iso-8859-1"
    soup = BeautifulSoup(r.text, "lxml")
    for s in soup.select("script, style, table[border='0'][align='right']"):
        s.decompose()

    paragraphs = []
    for p in soup.select("p"):
        text = p.get_text(" ", strip=True)
        if not text:
            continue
        text = html.unescape(text)
        m = _NUMBERED_PARA_RE.match(text)
        if not m:
            continue
        n = int(m.group(1))
        if not (1 <= n <= 2865):
            continue
        body = re.sub(r"\s+", " ", m.group(2)).strip()
        if body:
            paragraphs.append({"number": n, "text": body})
    await db.catechism_cache.replace_one(
        {"_id": cache_key},
        {"_id": cache_key, "lang": lang, "page": page,
         "paragraphs": paragraphs,
         "fetched_at": datetime.now(timezone.utc).isoformat()},
        upsert=True,
    )
    return paragraphs


@router.get("/paragraphs")
async def paragraphs(request: Request,
                      start: int = Query(...),
                      end: int = Query(...),
                      lang: str = Query("es")):
    if lang not in ("es", "en"):
        lang = "es"
    if start < 1 or end < start or (end - start) > 120:
        raise HTTPException(status_code=400, detail="Invalid range (max 120 paragraphs)")

    manifest = _manifest(lang)
    # Find pages whose range overlaps [start, end]
    relevant = [m for m in manifest if m["end"] >= start and m["start"] <= end]
    if not relevant:
        return {"lang": lang, "start": start, "end": end, "paragraphs": []}

    db = request.app.state.db
    out: list[dict] = []
    fetched_any = False
    for entry in relevant:
        try:
            paras = await _fetch_page_paragraphs(lang, entry["page"], db)
            fetched_any = True
            for p in paras:
                if start <= p["number"] <= end:
                    out.append(p)
        except Exception:
            continue
    out.sort(key=lambda p: p["number"])

    if not out and not fetched_any:
        raise HTTPException(status_code=503, detail="Catechism source temporarily unavailable")

    return {"lang": lang, "start": start, "end": end, "paragraphs": out}
