"""Catechism of the Catholic Church (CCC) - reader via vatican.va scraping + curated index.
The full CCC is organized in 4 parts, many chapters.
We use a static index of part URLs and fetch section content on demand with cache.
"""
from datetime import datetime, timezone, timedelta
import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Request, Query, HTTPException

router = APIRouter(prefix="/catechism", tags=["catechism"])

# Index of CCC: 4 parts, each with chapters and sections
# Paragraph numbers 1-2865. We expose a paragraph-range fetcher using scborromeo.org
# which hosts the full CCC in clean HTML in both English and Spanish.
BASE_EN = "https://www.scborromeo.org/ccc.htm"
BASE_ES = "https://www.vatican.va/archive/catechism_sp/index_sp.html"

# Structural index (concise navigation)
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


async def _fetch_paragraphs(start: int, end: int, lang: str) -> list[dict]:
    """Fetch CCC paragraphs from scborromeo.org (EN) or Vatican archive (ES).
    Returns list of {number, text}.
    """
    url = f"https://www.scborromeo.org/ccc/para/{start}.htm"  # per-paragraph pages exist
    # scborromeo also has a consolidated page. We'll fetch paragraph by paragraph for reliability.
    async with httpx.AsyncClient(timeout=15, follow_redirects=True,
                                 headers={"User-Agent": "Mozilla/5.0 (ApostolApp)"}) as client:
        paragraphs = []
        # Cap range to max 60 paragraphs per request
        max_n = min(end, start + 59)
        for n in range(start, max_n + 1):
            if lang == "en":
                u = f"https://www.scborromeo.org/ccc/para/{n}.htm"
            else:
                # Vatican.va ES catechism doesn't expose per-paragraph; fallback to English
                u = f"https://www.scborromeo.org/ccc/para/{n}.htm"
            try:
                r = await client.get(u)
                if r.status_code >= 400:
                    continue
                soup = BeautifulSoup(r.text, "lxml")
                body = soup.select_one("body")
                if not body:
                    continue
                # Extract the main paragraph block
                text = body.get_text("\n", strip=True)
                paragraphs.append({"number": n, "text": text})
            except Exception:
                continue
    return paragraphs


async def _fetch_section_vatican_es(start: int, end: int) -> list[dict]:
    """Fetch Spanish CCC paragraphs from vatican.va archive (a single long page per section).
    This is a simpler approach: fetch the full CCC index_sp.html paragraphs cache.
    """
    # Use the Vatican compact catechism pages. They're organized in chunks.
    # Simplified: fetch the section index and extract requested paragraph numbers.
    url = "https://www.vatican.va/archive/catechism_sp/index_sp.html"
    async with httpx.AsyncClient(timeout=20, follow_redirects=True,
                                 headers={"User-Agent": "Mozilla/5.0 (ApostolApp)"}) as client:
        r = await client.get(url)
    return [{"number": start, "text": "Para la versión completa en español, consulte vatican.va. (Contenido completo vendrá pronto.)"}]


@router.get("/paragraphs")
async def paragraphs(request: Request,
                      start: int = Query(...),
                      end: int = Query(...),
                      lang: str = Query("en")):
    if start < 1 or end < start or (end - start) > 120:
        raise HTTPException(status_code=400, detail="Invalid range (max 120 paragraphs)")
    db = request.app.state.db
    cache_key = f"ccc_{lang}_{start}_{end}"
    cached = await db.catechism_cache.find_one({"_id": cache_key})
    if cached:
        try:
            if datetime.now(timezone.utc) - datetime.fromisoformat(cached["fetched_at"]) < timedelta(days=30):
                return {"lang": lang, "start": start, "end": end, "paragraphs": cached["paragraphs"]}
        except Exception:
            pass
    paragraphs_data = await _fetch_paragraphs(start, end, lang)
    doc = {"_id": cache_key, "lang": lang, "start": start, "end": end,
           "paragraphs": paragraphs_data,
           "fetched_at": datetime.now(timezone.utc).isoformat()}
    await db.catechism_cache.replace_one({"_id": cache_key}, doc, upsert=True)
    return {"lang": lang, "start": start, "end": end, "paragraphs": paragraphs_data}
