// Bible abbreviation table used to recognise inline citations inside the CCC
// text (e.g. "*Mt* 5:3", "*1 Cor* 13:1", "Heb 11:1") and to map them back to
// the canonical book names used by `bible-en.json` / `bible-es.json`.
//
// Keys are normalized to lowercase + collapsed whitespace + no trailing dot.

const RAW = {
    // Pentateuco
    "gen":         { en: "Genesis",        es: "Génesis" },
    "genesis":     { en: "Genesis",        es: "Génesis" },
    "ex":          { en: "Exodus",         es: "Exodo" },
    "exod":        { en: "Exodus",         es: "Exodo" },
    "exodus":      { en: "Exodus",         es: "Exodo" },
    "lev":         { en: "Leviticus",      es: "Levítico" },
    "leviticus":   { en: "Leviticus",      es: "Levítico" },
    "num":         { en: "Numbers",        es: "Números" },
    "numbers":     { en: "Numbers",        es: "Números" },
    "deut":        { en: "Deuteronomy",    es: "Deuteronomio" },
    "dt":          { en: "Deuteronomy",    es: "Deuteronomio" },
    "deuteronomy": { en: "Deuteronomy",    es: "Deuteronomio" },

    // Históricos
    "josh":        { en: "Joshua",         es: "Josué" },
    "joshua":      { en: "Joshua",         es: "Josué" },
    "judg":        { en: "Judges",         es: "Jueces" },
    "judges":      { en: "Judges",         es: "Jueces" },
    "ruth":        { en: "Ruth",           es: "Rut" },
    "1 sam":       { en: "I Samuel",       es: "I Samuel" },
    "1 samuel":    { en: "I Samuel",       es: "I Samuel" },
    "2 sam":       { en: "II Samuel",      es: "II Samuel" },
    "2 samuel":    { en: "II Samuel",      es: "II Samuel" },
    "1 kgs":       { en: "I Kings",        es: "I Reyes" },
    "1 kings":     { en: "I Kings",        es: "I Reyes" },
    "2 kgs":       { en: "II Kings",       es: "II Reyes" },
    "2 kings":     { en: "II Kings",       es: "II Reyes" },
    "1 chr":       { en: "I Chronicles",   es: "I Crónicas" },
    "1 chron":     { en: "I Chronicles",   es: "I Crónicas" },
    "2 chr":       { en: "II Chronicles",  es: "II Crónicas" },
    "2 chron":     { en: "II Chronicles",  es: "II Crónicas" },
    "ezra":        { en: "Ezra",           es: "Esdras" },
    "neh":         { en: "Nehemiah",       es: "Nehemías" },
    "nehemiah":    { en: "Nehemiah",       es: "Nehemías" },
    "tob":         { en: "Tobit",          es: "Tobías" },
    "tobit":       { en: "Tobit",          es: "Tobías" },
    "jdt":         { en: "Judith",         es: "Judit" },
    "judith":      { en: "Judith",         es: "Judit" },
    "esth":        { en: "Esther",         es: "Ester" },
    "esther":      { en: "Esther",         es: "Ester" },
    "1 macc":      { en: "I Maccabees",    es: "I Macabeos" },
    "2 macc":      { en: "II Maccabees",   es: "II Macabeos" },

    // Sapienciales / poéticos
    "job":         { en: "Job",            es: "Job" },
    "ps":          { en: "Psalms",         es: "Salmos" },
    "psalm":       { en: "Psalms",         es: "Salmos" },
    "psalms":      { en: "Psalms",         es: "Salmos" },
    "prov":        { en: "Proverbs",       es: "Proverbios" },
    "proverbs":    { en: "Proverbs",       es: "Proverbios" },
    "eccl":        { en: "Ecclesiastes",   es: "Eclesiastés" },
    "qoh":         { en: "Ecclesiastes",   es: "Eclesiastés" },
    "ecclesiastes":{ en: "Ecclesiastes",   es: "Eclesiastés" },
    "song":        { en: "Song of Solomon",es: "Cantar" },
    "sg":          { en: "Song of Solomon",es: "Cantar" },
    "wis":         { en: "Wisdom",         es: "Sabiduría" },
    "sir":         { en: "Sirach",         es: "Eclesiástico" },
    "ecclus":      { en: "Sirach",         es: "Eclesiástico" },

    // Profetas
    "isa":         { en: "Isaiah",         es: "Isaías" },
    "isaiah":      { en: "Isaiah",         es: "Isaías" },
    "jer":         { en: "Jeremiah",       es: "Jeremías" },
    "jeremiah":    { en: "Jeremiah",       es: "Jeremías" },
    "lam":         { en: "Lamentations",   es: "Lamentaciones" },
    "lamentations":{ en: "Lamentations",   es: "Lamentaciones" },
    "bar":         { en: "Baruch",         es: "Baruc" },
    "baruch":      { en: "Baruch",         es: "Baruc" },
    "ezek":        { en: "Ezekiel",        es: "Ezequiel" },
    "ezekiel":     { en: "Ezekiel",        es: "Ezequiel" },
    "dan":         { en: "Daniel",         es: "Daniel" },
    "daniel":      { en: "Daniel",         es: "Daniel" },
    "hos":         { en: "Hosea",          es: "Oseas" },
    "hosea":       { en: "Hosea",          es: "Oseas" },
    "joel":        { en: "Joel",           es: "Joel" },
    "amos":        { en: "Amos",           es: "Amós" },
    "obad":        { en: "Obadiah",        es: "Abdías" },
    "obadiah":     { en: "Obadiah",        es: "Abdías" },
    "jonah":       { en: "Jonah",          es: "Jonás" },
    "mic":         { en: "Micah",          es: "Miqueas" },
    "micah":       { en: "Micah",          es: "Miqueas" },
    "nah":         { en: "Nahum",          es: "Nahún" },
    "hab":         { en: "Habakkuk",       es: "Habacuc" },
    "habakkuk":    { en: "Habakkuk",       es: "Habacuc" },
    "zeph":        { en: "Zephaniah",      es: "Sofonías" },
    "hag":         { en: "Haggai",         es: "Ageo" },
    "zech":        { en: "Zechariah",      es: "Zacarías" },
    "mal":         { en: "Malachi",        es: "Malaquías" },

    // NT
    "mt":          { en: "Matthew",        es: "Mateo" },
    "matt":        { en: "Matthew",        es: "Mateo" },
    "matthew":     { en: "Matthew",        es: "Mateo" },
    "mk":          { en: "Mark",           es: "Marcos" },
    "mc":          { en: "Mark",           es: "Marcos" },
    "mark":        { en: "Mark",           es: "Marcos" },
    "lk":          { en: "Luke",           es: "Lucas" },
    "lc":          { en: "Luke",           es: "Lucas" },
    "luke":        { en: "Luke",           es: "Lucas" },
    "jn":          { en: "John",           es: "Juan" },
    "john":        { en: "John",           es: "Juan" },
    "acts":        { en: "Acts",           es: "Hechos" },
    "rom":         { en: "Romans",         es: "Romanos" },
    "romans":      { en: "Romans",         es: "Romanos" },
    "1 cor":       { en: "I Corinthians",  es: "I Corintios" },
    "1 corinthians":{en:"I Corinthians",   es: "I Corintios" },
    "2 cor":       { en: "II Corinthians", es: "II Corintios" },
    "2 corinthians":{en:"II Corinthians",  es: "II Corintios" },
    "gal":         { en: "Galatians",      es: "Gálatas" },
    "galatians":   { en: "Galatians",      es: "Gálatas" },
    "eph":         { en: "Ephesians",      es: "Efesios" },
    "ephesians":   { en: "Ephesians",      es: "Efesios" },
    "phil":        { en: "Philippians",    es: "Filipenses" },
    "philippians": { en: "Philippians",    es: "Filipenses" },
    "col":         { en: "Colossians",     es: "Colosenses" },
    "colossians":  { en: "Colossians",     es: "Colosenses" },
    "1 thess":     { en: "I Thessalonians",es: "I Tesalonicenses" },
    "1 thessalonians":{en:"I Thessalonians",es:"I Tesalonicenses" },
    "2 thess":     { en: "II Thessalonians",es:"II Tesalonicenses" },
    "1 tim":       { en: "I Timothy",      es: "I Timoteo" },
    "1 timothy":   { en: "I Timothy",      es: "I Timoteo" },
    "2 tim":       { en: "II Timothy",     es: "II Timoteo" },
    "2 timothy":   { en: "II Timothy",     es: "II Timoteo" },
    "titus":       { en: "Titus",          es: "Tito" },
    "philem":      { en: "Philemon",       es: "Filemon" },
    "heb":         { en: "Hebrews",        es: "Hebreos" },
    "hebrews":     { en: "Hebrews",        es: "Hebreos" },
    "jas":         { en: "James",          es: "Santiago" },
    "james":       { en: "James",          es: "Santiago" },
    "1 pet":       { en: "I Peter",        es: "I Pedro" },
    "1 peter":     { en: "I Peter",        es: "I Pedro" },
    "2 pet":       { en: "II Peter",       es: "II Pedro" },
    "2 peter":     { en: "II Peter",       es: "II Pedro" },
    "1 jn":        { en: "I John",         es: "I Juan" },
    "1 john":      { en: "I John",         es: "I Juan" },
    "2 jn":        { en: "II John",        es: "II Juan" },
    "2 john":      { en: "II John",        es: "II Juan" },
    "3 jn":        { en: "III John",       es: "III Juan" },
    "3 john":      { en: "III John",       es: "III Juan" },
    "jude":        { en: "Jude",           es: "Judas" },
    "rev":         { en: "Revelation of John", es: "Apocalipsis" },
    "revelation":  { en: "Revelation of John", es: "Apocalipsis" },
    "ap":          { en: "Revelation of John", es: "Apocalipsis" },
    "apoc":        { en: "Revelation of John", es: "Apocalipsis" },
};

function normaliseAbbrev(s) {
    return s
        .toLowerCase()
        .replace(/\.+$/, "")          // trailing dot
        .replace(/\s+/g, " ")         // collapse whitespace
        .trim();
}

// Public lookup: returns { en, es } or null.
export function resolveBookName(rawAbbrev) {
    const k = normaliseAbbrev(rawAbbrev);
    return RAW[k] || null;
}

// Citation regex covering both "*Book* 5:3", "*1 Cor* 13:4", and the
// occasional unstarred form "Mt 5:3" or "Rev 21:14". We capture:
//   1: book token (with optional starring)
//   2: chapter
//   3: starting verse
//   4: optional ending verse (for ranges)
// `g` flag is required so `String.matchAll`/`exec` can iterate.
export const CITATION_REGEX = new RegExp(
    "\\*([\\w\\s]{1,18}?)\\*\\s*(\\d{1,3}):(\\d{1,3})(?:-(\\d{1,3}))?" +
    "|" +
    "\\b((?:[123I]{1,3}\\s)?[A-Z][a-z]{1,11})\\.?\\s+(\\d{1,3}):(\\d{1,3})(?:-(\\d{1,3}))?",
    "g",
);

/**
 * Walk the body of `text` and yield citations in document order. Each yielded
 * record is { kind: 'cite', start, end, raw, book: {en, es}, chapter, verse, endVerse }.
 * Non-matching segments are NOT yielded — caller is expected to slice text
 * between citation start/end indices.
 */
export function findCitations(text) {
    if (!text) return [];
    const out = [];
    const re = new RegExp(CITATION_REGEX.source, "g");
    let m;
    while ((m = re.exec(text)) !== null) {
        const starredAbbrev = m[1];
        const plainAbbrev = m[5];
        const abbrev = starredAbbrev ?? plainAbbrev;
        if (!abbrev) continue;
        const book = resolveBookName(abbrev);
        if (!book) continue;
        const chapter = parseInt(starredAbbrev ? m[2] : m[6], 10);
        const verse = parseInt(starredAbbrev ? m[3] : m[7], 10);
        const endVerse = (starredAbbrev ? m[4] : m[8])
            ? parseInt(starredAbbrev ? m[4] : m[8], 10)
            : null;
        if (!Number.isFinite(chapter) || !Number.isFinite(verse)) continue;
        out.push({
            kind: "cite",
            start: m.index,
            end: m.index + m[0].length,
            raw: m[0],
            abbrev,
            book,
            chapter,
            verse,
            endVerse,
        });
    }
    return out;
}

/**
 * Resolve the verse(s) text from a parsed Bible document for a given citation.
 * Returns an array `[{verse, text}]` or null if the lookup fails. Operates on
 * the in-memory Bible already loaded by the host page (Catechism), so the
 * call is synchronous and effectively instantaneous.
 */
export function lookupCitation(bibleData, lang, cite) {
    if (!bibleData || !cite) return null;
    const bookName = lang === "es" ? cite.book.es : cite.book.en;
    const book = bibleData.books.find((b) => b.name === bookName);
    if (!book) return null;
    const chap = book.chapters.find((c) => c.chapter === cite.chapter);
    if (!chap) return null;
    const start = cite.verse;
    const end = cite.endVerse || start;
    const range = chap.verses
        .filter((v) => v.verse >= start && v.verse <= end)
        .map((v) => ({ verse: v.verse, text: v.text }));
    if (range.length === 0) return null;
    return {
        bookName,
        chapter: cite.chapter,
        verses: range,
    };
}
