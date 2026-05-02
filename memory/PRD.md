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

## Implemented (2026-05-01) — Catechism ↔ Bible cross-references
- ✅ **Tappable Bible citations inside the CCC**. Inline tokens like `*Mt* 5:3`, `*Heb* 1:3`, `*Mt* 6:26-34`, or unstarred `1 Cor 9:22` are rendered as clickable italic underlined buttons via `renderRichText` in `Catechism.jsx`.
- ✅ Built `/lib/bibleAbbrev.js`: full ES/EN abbreviation table covering all 73 books (incl. deuterocanonicals), `findCitations(text)` regex tokenizer, and synchronous `lookupCitation(bible, lang, cite)` resolver against the in-memory Bible.
- ✅ Built `/components/BibleQuickView.jsx` modal/bottom-sheet (mobile drag-handle aesthetics, body-scroll lock, Esc to close, backdrop dismiss) that renders the verse(s) with red `<sup>` numbers and a "Ver en la Biblia / Open in Bible" CTA.
- ✅ Bible preloaded eagerly in Catechism via existing `loadBible(lang)` so quick-view opens instantly.
- ✅ "Ver en la Biblia" deep-links to `/bible?ref=Book|Chapter|Verse`; the Bible page strips the `?ref=` after scroll so reload doesn't re-jump.
- ✅ Added `quickview.open_bible` and `quickview.not_found` translation keys (ES + EN).
- ✅ Coexists cleanly with: CCC-to-CCC `(NNN)` clickable refs, long-press Save/Copy/Share context menu (button uses `pointerdown` stopPropagation), search/highlight, and Parts index.
- ✅ Tested by `testing_agent_v3_fork` iteration_3.json — **7/7 cases pass, no issues**. Verified: §263 (Jn 14:26 ES), §322 (Mt 6:26-34 verse range), §24 (1 Cor 9:22 ordinal), false-positive guard ("Section/Chapter/Part" not promoted to citations), language toggle ES↔EN swaps both label and verse text, all 4 dismiss paths work, deep-link strips `?ref=`.

## Implemented (2026-05-01 · part 2) — CCC multi-ref groups in liturgical purple
- ✅ **Bug report by user**: parenthetical lists like `(2500, 1730, 1776, 1703, 366)` at the end of §33 were rendered as plain text (regex only matched single `(NNN)`).
- ✅ **Fix**: extended `refRegex` in `Catechism.jsx` to `\(\s*(\d{1,4}(?:\s*[,;]\s*\d{1,4})*)\s*\)` so single + comma/semicolon-separated lists are parsed together. Each number renders as a small **liturgical-purple pill** (`text-purple-700` + `ring-purple-200`), visually distinct from the red Bible citations. The `(`, `,`, `)` characters stay grey for readability.
- ✅ **Latent bug also fixed**: `jumpToParagraph` was racing with the `[query]` effect that resets `visible=PAGE_SIZE`. Long-distance jumps (e.g., §33 → §1730) silently failed because the row was un-rendered. Replaced with a `pendingJumpRef` that the reset effect honours, plus a `setTimeout(0) → rAF` chain so the scroll runs **after** React commits.
- ✅ Index/counter sanity confirmed: `entries.length === 2865` and numeric search uses `entries.findIndex(e => e.id === n)` — the inline numbers never pollute search or counts.
- ✅ Verified by screenshot tool: §366 jump (close), §1730 jump (far across ~1700 paragraphs), single `(199)` pill, no regression on Bible modal.

## Implemented (2026-05-01 · part 3) — Catechism index/xref bugfix + ES placeholder
- 🐛→🟢 **Index navigation broken** (only "Introducción" worked): root cause was the new `pendingJumpRef` flow only consuming when the `[query]` effect fires — but `setQuery("")` is a no-op when the query is already empty (the normal case for tapping a Parts card). Rewrote `jumpToParagraph` to call `setVisible((v) => Math.max(v, target))` **directly** (not through the effect) and use the ref purely as a "skip the reset" guard. Verified all 5 part cards (§1, §26, §1066, §1691, §2559) jump correctly.
- 🐛→🟢 **Cross-ref clicks did nothing**: same root cause (query already empty). Same fix resolves both.
- 🎨 **Cross-ref visual cleanup**: removed the box (`bg-purple-100 hover:bg-purple-100 ring-1 ring-purple-200 px-1.5 py-0.5 rounded-md`) per user request — numbers now render as plain liturgical-purple text (`text-purple-700` + `hover:underline`) inside grey parentheses with comma separators, blending naturally into the prose while remaining tappable.
- 🇪🇸 **Spanish placeholder for the Catechism**: since the project only has the English `catechism.json`, the ES locale now shows a centred "Próximamente · Catecismo en español" card explaining that the official Spanish edition is being prepared and inviting the user to switch to EN. The full reader (search bar + Parts index + paragraph list + Bible quick-view) is gated behind `lang === "en"` via a new `CatechismEnglishView` sub-component. Translations added in `LangContext.jsx` (`catechism.coming_soon_eyebrow / _title / _body` for ES and EN).
- ✅ Verified by screenshot tool: ES placeholder, EN parts navigation (5/5), §33 → §1730 multi-xref jump, no Bible modal regression. Lint clean.

## Implemented (2026-05-01 · part 4) — Settings/Ajustes screen
- ✅ New **`/settings` route** with bilingual content. Header now carries a purple `Gear` icon (`data-testid="header-settings-link"`) next to the ES/EN toggle.
- ✅ **Sobre la App → Quiénes somos** block: exact copy provided by the user, rendered with `reading-serif` prose. `decorateParagraph` helper emphasises `Corazones A La Obra`, `Señor Jesucristo` / `Lord Jesus Christ`, `Virgen María` / `Virgin Mary`, `tiempo/talento/tesoro` (and EN equivalents), and `¡Soy Apóstol!` / `I Am an Apostle!` in **bold liturgical purple** (`text-purple-700 font-semibold`). Per user request, "Corazones A La Obra" stays in Spanish on both locales.
- ✅ **Clickable `soyapostol.org`** link (`target="_blank"`, `rel="noopener noreferrer"`, underlined purple).
- ✅ **Legal block**: single card-button that opens the Termly Privacy Policy in a new tab. URL left as `#` placeholder — button auto-disables and shows "Próximamente disponible / Coming soon" until the real URL is wired in.
- ✅ **Soporte block**: card-button that launches `mailto:gustavommerino@gmail.com` with pre-filled subject ("Soporte soyapostol" / "soyapostol support") and body template.
- ✅ **Footer**: small grey `Versión 1.0.0 · soyapostol.org · Houston, TX, US` (bilingual).
- ✅ Translations added in `LangContext.jsx` (ES + EN) under `settings.*` and `nav_more.settings`.
- ✅ Verified via screenshot tool: all 13 testids render, footer text exact, link href `https://soyapostol.org`, EN locale keeps "Corazones A La Obra" in Spanish. Lint clean.

## Implemented (2026-05-01 · part 5) — Spanish Catechism (full edition)
- ✅ **Scraped vatican.va** (`/archive/catechism_sp/`) end-to-end and parsed every paragraph. Final dataset: **2,865 / 2,865 paragraphs** at `/app/frontend/public/data/catechism-es.json` (1.5 MB, no missing IDs).
- ✅ Parser handles two formatting quirks of the Vatican site: most paragraphs use `<b>NNN</b>` markers, but some (e.g. §1917, §168, §626, §2190) use plain-text `NNN.` prefixes — the scraper rewrites the latter into synthetic `<b>` so the walker stays uniform. Found one sub-page (`p4s1c1a1_sp.html`) **missing from the master index** but reachable via direct URL — added explicitly so §2568-§2597 are captured.
- ✅ **Italics cleanup**: vatican.va wraps many full paragraphs in `<i>...</i>`; the merger strips outer wrappers and collapses adjacent `**` runs so the rendered text is clean. Real italics on Bible abbreviations (`*Jn* 14,26`) are preserved for the citation parser.
- ✅ **Cross-references ported**: 1,328 paragraphs received their CCC-internal cross-reference list (e.g. `(2500, 1730, 1776, 1703, 366)`) by mining the English JSON tail and appending it to the corresponding Spanish entry — so the existing purple-pill renderer keeps working in both languages.
- ✅ **Bible-citation parser bilingual**: `bibleAbbrev.js` got ~80 Spanish aliases (Gn, Ex, Lv, Mt, Mc, Lc, Jn, Hch, Rm, 1 Co, Hb, 1 P, Sal, Si, Ap, …) and the regex now accepts both `:` and `,` as the chapter/verse separator with optional whitespace. Spanish citations like `*Mt*6, 26-34` and `Jn 14,26` are detected, resolved against `bible-es.json`, and rendered with clean labels (asterisks stripped from the button face).
- ✅ **Per-language IDB cache**: `IDB_KEY = (lang) => 'catechism:ccc:' + lang`. Loader effect now depends on `[lang]` so toggling ES↔EN swaps the file and the cache instantly. `CATECHISM_DATA_VERSION` bumped to 2 to invalidate v1 caches.
- ✅ **UI in Spanish**: Parts index already had `es` labels (Prólogo · La Profesión de la Fe · La Celebración del Misterio Cristiano · La Vida en Cristo · La Oración Cristiana); the "Coming soon" placeholder has been removed and `CatechismEnglishView` is now reused for both languages.
- ✅ Tested by `testing_agent_v3_fork` iteration_4.json — **11/11 cases pass, no issues**. Verified: §33 with 5 purple cross-refs, §263 / §322 / §268 with comma-separator Bible refs, modal opens with `Juan 14:26` and Spanish verse text, bilingual toggle re-fetches correctly, false-positive guard intact.

## Implemented (2026-05-02) — Settings: Credits + Fair-Use blocks
- ✅ Two new articles inside the "Sobre la app" section of `/settings`: **Créditos / Credits** and **Uso Justo / Fair Use**, both bilingual (ES + EN), with the exact copy supplied by the user.
- ✅ New helper `linkifySources(text)` in `Settings.jsx` walks each paragraph and converts every known source domain into an external link (`target="_blank"`, `rel="noopener noreferrer"`) styled in purple. Whitelist: evangelizo.org, evangeli.net, divineoffice.org, ibreviary.com, vaticannews.va, aciprensa.com, ewtnnews.com.
- ✅ Translations added under `settings.credits.*` and `settings.fair_use.*` in `LangContext.jsx` (ES + EN).
- ✅ Verified by screenshot tool: 8/8 testids render, 7/7 source links have correct external URLs (`https://...`), bilingual headings ("Créditos / Credits", "Uso Justo / Fair Use") swap correctly, links remain clickable in EN. Lint clean.

## Backlog (P0/P1/P2)
### P1 (active)
- Custom-domain CORS rewrite on `soyapostol.org` (blocked — Cloudflare edge). Awaiting Emergent Support.

### P2
- Reading plans / Freemium model.
- Highlight-to-favorite on Bible/CCC paragraphs.
- Tighten `bibleAbbrev` regex to a whitelist built from `Object.keys(RAW)` (currently safe via `resolveBookName` filter — code-review note from iteration_3).

## Credentials
See `/app/memory/test_credentials.md`
