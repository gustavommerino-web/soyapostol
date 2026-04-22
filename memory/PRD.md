# Apostol — Catholic Web App

## Original Problem Statement
Build a Catholic web called "Apostol" with bilingual (ES/EN) support and 8 sections: Daily Readings (USCCB ES), Liturgy of the Hours (iBreviary), Prayers (ACI Prensa), Examen of Conscience (admin-uploaded docs), Catholic News (EWTN + ACI Prensa + Vatican News), full Catholic Bible, Catechism of the Catholic Church, and a Favorites section that allows saving any passage from the other 7 sections.

## User Choices (2026-04-22)
- Auth: JWT email/password
- Bible/CCC: public APIs
- Examen: admin upload interface
- Content sourcing: RSS feeds where available + scraping with daily cache
- Language: toggle ES/EN (default ES)
- Readings fallback (after USCCB 403): ACI Prensa /calendario (ES) + Universalis (EN)
- News fallback: Vatican News + ACI Prensa (ES); Vatican News + CNA + National Catholic Register (EN)

## Architecture
- **Backend**: FastAPI (Python) with modular routers (`auth`, `readings`, `liturgy`, `prayers`, `examen`, `news`, `bible`, `catechism`, `favorites`) mounted under `/api`. MongoDB caches all scraped content. Bcrypt + PyJWT httpOnly cookies.
- **Frontend**: React 19 + React Router 7 + Tailwind 3 + Phosphor Icons. Bilingual `LangContext` + `AuthContext`. Shadcn UI primitives for toast (sonner).
- **Design**: "Organic & Earthy" light theme (warm sand, wine red #8B2635, gold #D4AF37). Fonts: Cormorant Garamond (headings), Lora (reading body), Outfit (UI).

## Core Requirements (Static)
1. Daily Mass Readings (1st, Psalm, 2nd, Gospel, commentary if available)
2. Liturgy of the Hours (all 7 hours)
3. Prayers library (categorized)
4. Examen of Conscience (file upload/reader)
5. Catholic News aggregator
6. Full Catholic Bible reader
7. Catechism of the Catholic Church reader
8. Favorites (save/browse/delete per user)
9. Bilingual ES/EN toggle
10. User authentication

## Implemented (2026-04-22)
- ✅ JWT auth (register/login/me/logout/refresh) with pre-seeded admin
- ✅ Bilingual UI with toggle (default ES)
- ✅ Dashboard with bento grid and 8 section tiles
- ✅ Daily Readings (ACI Prensa ES + Universalis EN) with MongoDB cache
- ✅ Liturgy of the Hours (iBreviary breviario.php) with hour picker
- ✅ Prayers library (ACI Prensa) grouped by category with individual prayer fetch
- ✅ Examen of Conscience (admin-only upload, PDF/DOCX/TXT, base64 in MongoDB)
- ✅ News (Vatican + ACI ES; Vatican + CNA + NCRegister EN) with source filter
- ✅ Bible reader via bolls.life (DRA for EN Catholic, NVI for ES)
- ✅ Catechism structure (4 parts, 12 sections) with paragraph chunk reader
- ✅ Favorites CRUD (user-scoped, section filter)
- ✅ 26/26 backend tests passing

## Backlog (P0/P1/P2)
### P1
- Date selection for Readings (scrape archived pages or switch to an API with date support)
- English prayer catalog (CNA resources index)
- Spanish CCC text (integrate vatican.va catechism_sp/index_sp.html per-paragraph)
- Highlight-to-favorite on Bible/CCC paragraphs (select text → save)
### P2
- Forgot password flow (backend handler exists; frontend form pending)
- Offline reading / PWA manifest
- Reading plans (year A/B/C tracker, chapter-a-day)
- Audio liturgy & daily gospel TTS
- Deploy CORS_ORIGINS to specific domain & `secure=True` cookies for production

## Credentials
See `/app/memory/test_credentials.md`
