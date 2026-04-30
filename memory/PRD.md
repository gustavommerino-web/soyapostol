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
- ✅ Bible reader (full 73-book Catholic canon: Vatican BIA for ES, USCCB NABRE for EN via Playwright)
- ✅ Catechism structure (4 parts, 12 sections) with paragraph chunk reader (Vatican manifests ES + EN)
- ✅ Favorites CRUD (user-scoped, section filter)
- ✅ 26/26 backend tests passing

## Implemented (2026-04-27)
- ✅ Responsive web-app shell: sticky translucent header (logo + lang toggle + auth), sticky icon sidebar on desktop (≥lg), fixed mobile bottom nav (5 tabs incl. "Más" sheet), iOS safe-area padding, content constrained to 720px reading width across all routes
- ✅ Dashboard bento grid simplified to 1/2 cols inside the 720px container
- ✅ Toaster moved to top-center to avoid colliding with bottom nav

## Implemented (2026-04-24)
- ✅ Shared Playwright Chromium pool (`backend/browser_pool.py`) launched on FastAPI startup — removes per-module browser singletons in `readings.py` / `bible.py`, eliminates cold-start timeouts, auto-installs Chromium if missing (runs in worker thread to keep loop responsive)
- ✅ Examen admin UI verified end-to-end (upload/list/view/delete, Spanish empty state, 403 for non-admin, 401 for anonymous delete)
- ✅ 29/29 backend tests + frontend Examen flow passing (`iteration_2.json`)

## Implemented (2026-04-30 · part 6) — Liturgia EN migrada al RSS de Divine Office

Siguiendo la especificación técnica del usuario:

- ✅ **Parser de XML**: `feedparser` itera cada `<item>` del feed `https://divineoffice.org/feed/`.
- ✅ **Filtrado por `<category>`**: nuevo mapa `DIVINE_OFFICE_CATEGORY_CODES` que asocia cada hora canónica (ej. "MorningPrayer") con su hora interna. Se añadió también `DIVINE_OFFICE_CATEGORY_BASES` para la etiqueta humana ("Morning Prayer (Lauds)") como referencia. Se eligió la canónica porque la prosa se comparte entre Invitatory / About / Morning Prayer del mismo día.
- ✅ **Extracción de texto**: cuerpo tomado de `<content:encoded>`; `BeautifulSoup` limpia `audio, iframe, script, style, form, .powerpress_*, .podcast_links, .sharedaddy, .sd-block, .jp-audio` y **preserva** los `<span style="color: #ff0000;">` que marcan las rúbricas rojas. Salida: `body.decode_contents()` para evitar envolver `<html><body>` en el HTML devuelto.
- ✅ **Fecha litúrgica correcta**: se usa `?date=YYYYMMDD` del URL (día litúrgico) en vez de `published_parsed` (día de publicación, que va 24-48h adelantado).
- ✅ **Caché cada 1 h**: constante `CACHE_TTL_SECONDS = 3600`. Las lecturas en caché se sirven solo si `fetched_at < 1h`; si no, se re-busca desde el feed. Mantiene la política `stale-while-error` para cortes de red.
- ✅ Verificado con curl: Divine Office devuelve todas las horas (lauds/vespers/compline/office_of_readings/midmorning/midday/midafternoon) con `red_rubric=True`. TTL probado envejeciendo `fetched_at` a 2h → re-fetch inmediato.
- ✅ Frontend `/liturgy` renderiza 39 spans rojos en una sesión EN.

## Implemented (2026-04-30 · part 5) — Examen cumulativo (cambio arquitectónico)

Cambio mayor al flujo del Examen de Conciencia solicitado por el usuario:

- ✅ **Estado cumulativo**: `checks` ahora se indexa por `examId` → `{ [examId]: { [sectionId]: { [qIdx]: true } } }`. Cambiar de examen NO borra las marcas anteriores.
- ✅ **Summary fusionado**: el resumen agrupa TODAS las selecciones de TODOS los exámenes en cards unificadas, mostrando el examen de origen como eyebrow + la sección como título.
- ✅ **Dos únicos puntos de borrado total**: botón **"Empezar de nuevo"** (vuelve a la cobertura) y **"Borrar y salir"** (pantalla de paz). Ambos con confirmación inline. Se eliminaron las confirmaciones antiguas de "cambiar estado" y "borrar todo".
- ✅ **Migración automática** del formato legacy de `localStorage` al abrir.
- ✅ **Indicadores visuales en la cobertura**: cada tarjeta de examen con marcas muestra un badge "N marcadas" (con pluralización ES correcta — "1 marcada" / "N marcadas"), borde e icono resaltados en rojo `sangre`. Banner superior "TU EXAMEN ACUMULADO · N marcadas" con botón "Ver resumen" cuando hay al menos una marca.
- ✅ El contador del pie en la vista de preguntas ahora muestra SOLO las marcas del examen actual ("Marcadas en este examen"). El summary cuenta el total global.
- ✅ Se retira el closing personalizado por examen (scripture/prayer) en el summary fusionado; se usa siempre el Acto de Contrición (que aplica de forma universal).
- ✅ Traducciones ES/EN nuevas: `marked_count`, `marked_count_one`, `cumulative_title`, `summary_eyebrow`. Relabel: "Cambiar estado" → "Cambiar examen"; "Terminar confesión" → "Borrar y salir".
- ✅ Verificado con screenshot tool: badges por tarjeta, banner acumulado, 3 exámenes simultáneos → summary con las 3 cards merged, `startOver` y `finishAndExit` borran todo completamente.

## Implemented (2026-04-30 · part 4) — Examen de Vida Digital añadido
- ✅ **Vida digital** (Caridad en la Red · Pureza y Tiempo). Icono `DeviceMobile`. Total 16 perfiles.

## Implemented (2026-04-30 · part 3) — 5 exámenes más añadidos

- ✅ **Himno de la Caridad** (1 Co 13) · cierre con Escritura (1 Co 13:13).
- ✅ **Dones del Espíritu Santo** (Sabiduría, Consejo, Piedad).
- ✅ **Jóvenes** (casa/escuela, amistades/presión social).
- ✅ **Trabajo profesional** (integridad, excelencia, liderazgo, equilibrio).
- ✅ **Matrimonio y familia** (como esposo, como padre, administración del hogar).
- ✅ Traducciones ES/EN completas + 5 iconos únicos nuevos (Scroll, Wind, GraduationCap, Briefcase, House).
- ✅ Total **15 perfiles** en la cobertura del Examen. Smoke test verificó cobertura, scripture closing y fallback a Acto de Contrición.

## Implemented (2026-04-30 · part 2) — 5 exámenes alternativos añadidos

- ✅ **Triple amor** (Gran Mandamiento: Dios / prójimo / uno mismo).
- ✅ **Siete pecados capitales** (Soberbia, Avaricia, Lujuria, Envidia, Gula, Ira, Pereza).
- ✅ **Virtudes teologales y cardinales** (Fe, Esperanza, Caridad + Prudencia, Justicia, Fortaleza, Templanza).
- ✅ **Obras de misericordia** (Corporales + Espirituales) · cierre con Mt 25:40.
- ✅ **Examen diario ignaciano** (5 pasos: Acción de gracias, Petición de luz, Revisión, Perdón, Enmienda) · cierre con Padre Nuestro.
- ✅ Cada examen alternativo con **closing propio** (scripture/prayer) — `SummaryView` ahora elige: `scripture` → blockquote "Palabra de Dios"; `prayer` → card "Oración para cerrar"; fallback → Acto de Contrición.
- ✅ Traducciones ES/EN completas para cada examen, sus categorías, preguntas y focus (citas bíblicas / descripciones).
- ✅ Iconos únicos por perfil (HeartStraight, Flame, Leaf, HandsPraying, Clock).
- ✅ Verificado con screenshot tool: 10 perfiles visibles, mercy_works renderiza scripture closing, ignatian renderiza prayer closing, triple_love usa fallback Acto de Contrición.

## Implemented (2026-04-30) — Examen Privacy & Beatitudes

- ✅ **Beatitudes examen** added as a 5th profile on `Examen.jsx` (ES + EN). Sourced from user-provided JSON; renders each Beatitude as its own accordion section with the biblical quote as italic blockquote + 3 introspection questions.
- ✅ **Privacy fixes (state management)** in `Examen.jsx`:
  - "Cambiar estado / Change state" now wipes every mark via inline confirm → `resetAll()` before returning to the profile cover.
  - New **"Empezar de nuevo / Start over"** button (keeps profile, clears marks) surfaces only when at least one mark exists.
  - New **"Terminar confesión / Finish confession"** button in summary → confirm → full wipe (localStorage + state) → transitions to a "Paz sea contigo / Peace be with you" peace screen that gracefully returns to cover.
- ✅ New translations added to `LangContext.jsx`: `change_profile_confirm`, `start_over`, `start_over_confirm`, `finish_confession`, `finish_confession_confirm`, `finish_done_title`, `finish_done_subtitle`, `return_home`, `beatitude_n`, and `profile.beatitudes` / `profile_desc.beatitudes`.
- ✅ Tested end-to-end with screenshot tool: cover (5 profiles), Beatitudes accordion with focus quote, start-over visibility, summary, finish-confession flow, peace screen, and cross-profile wipe.

## Backlog (P0/P1/P2)
### P1 (active)
- Custom-domain CORS rewrite on `soyapostol.org` (blocked — Cloudflare edge). Awaiting Emergent Support.

### P2
- Reading plans / Freemium model.
- Highlight-to-favorite on Bible/CCC paragraphs.

## Credentials
See `/app/memory/test_credentials.md`
