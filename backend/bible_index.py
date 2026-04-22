"""Catholic Bible master index with 73 books.
- ES: URLs from vatican.va/archive/ESL0506 (El Libro del Pueblo de Dios / Biblia de la Iglesia en América)
- EN: USCCB Bible slugs (NABRE)
Built from /app/backend/data/vatican_es_books.json + curated USCCB slugs.
"""

# USCCB NABRE slugs in canonical Catholic Bible order (73 books)
_NABRE_BOOKS = [
    # Pentateuch
    {"en_name": "Genesis",            "usccb_slug": "genesis"},
    {"en_name": "Exodus",             "usccb_slug": "exodus"},
    {"en_name": "Leviticus",          "usccb_slug": "leviticus"},
    {"en_name": "Numbers",            "usccb_slug": "numbers"},
    {"en_name": "Deuteronomy",        "usccb_slug": "deuteronomy"},
    # Historical Books
    {"en_name": "Joshua",             "usccb_slug": "joshua"},
    {"en_name": "Judges",             "usccb_slug": "judges"},
    {"en_name": "Ruth",               "usccb_slug": "ruth"},
    {"en_name": "1 Samuel",           "usccb_slug": "1samuel"},
    {"en_name": "2 Samuel",           "usccb_slug": "2samuel"},
    {"en_name": "1 Kings",            "usccb_slug": "1kings"},
    {"en_name": "2 Kings",            "usccb_slug": "2kings"},
    {"en_name": "1 Chronicles",       "usccb_slug": "1chronicles"},
    {"en_name": "2 Chronicles",       "usccb_slug": "2chronicles"},
    {"en_name": "Ezra",               "usccb_slug": "ezra"},
    {"en_name": "Nehemiah",           "usccb_slug": "nehemiah"},
    {"en_name": "Tobit",              "usccb_slug": "tobit"},
    {"en_name": "Judith",             "usccb_slug": "judith"},
    {"en_name": "Esther",             "usccb_slug": "esther"},
    {"en_name": "1 Maccabees",        "usccb_slug": "1maccabees"},
    {"en_name": "2 Maccabees",        "usccb_slug": "2maccabees"},
    # Wisdom
    {"en_name": "Job",                "usccb_slug": "job"},
    {"en_name": "Psalms",             "usccb_slug": "psalms"},
    {"en_name": "Proverbs",           "usccb_slug": "proverbs"},
    {"en_name": "Ecclesiastes",       "usccb_slug": "ecclesiastes"},
    {"en_name": "Song of Songs",      "usccb_slug": "songofsongs"},
    {"en_name": "Wisdom",             "usccb_slug": "wisdom"},
    {"en_name": "Sirach",             "usccb_slug": "sirach"},
    # Prophets
    {"en_name": "Isaiah",             "usccb_slug": "isaiah"},
    {"en_name": "Jeremiah",           "usccb_slug": "jeremiah"},
    {"en_name": "Lamentations",       "usccb_slug": "lamentations"},
    {"en_name": "Baruch",             "usccb_slug": "baruch"},
    {"en_name": "Ezekiel",            "usccb_slug": "ezekiel"},
    {"en_name": "Daniel",             "usccb_slug": "daniel"},
    {"en_name": "Hosea",              "usccb_slug": "hosea"},
    {"en_name": "Joel",               "usccb_slug": "joel"},
    {"en_name": "Amos",               "usccb_slug": "amos"},
    {"en_name": "Obadiah",            "usccb_slug": "obadiah"},
    {"en_name": "Jonah",              "usccb_slug": "jonah"},
    {"en_name": "Micah",              "usccb_slug": "micah"},
    {"en_name": "Nahum",              "usccb_slug": "nahum"},
    {"en_name": "Habakkuk",           "usccb_slug": "habakkuk"},
    {"en_name": "Zephaniah",          "usccb_slug": "zephaniah"},
    {"en_name": "Haggai",             "usccb_slug": "haggai"},
    {"en_name": "Zechariah",          "usccb_slug": "zechariah"},
    {"en_name": "Malachi",            "usccb_slug": "malachi"},
    # New Testament
    {"en_name": "Matthew",            "usccb_slug": "matthew"},
    {"en_name": "Mark",               "usccb_slug": "mark"},
    {"en_name": "Luke",               "usccb_slug": "luke"},
    {"en_name": "John",               "usccb_slug": "john"},
    {"en_name": "Acts of the Apostles", "usccb_slug": "acts"},
    {"en_name": "Romans",             "usccb_slug": "romans"},
    {"en_name": "1 Corinthians",      "usccb_slug": "1corinthians"},
    {"en_name": "2 Corinthians",      "usccb_slug": "2corinthians"},
    {"en_name": "Galatians",          "usccb_slug": "galatians"},
    {"en_name": "Ephesians",          "usccb_slug": "ephesians"},
    {"en_name": "Philippians",        "usccb_slug": "philippians"},
    {"en_name": "Colossians",         "usccb_slug": "colossians"},
    {"en_name": "1 Thessalonians",    "usccb_slug": "1thessalonians"},
    {"en_name": "2 Thessalonians",    "usccb_slug": "2thessalonians"},
    {"en_name": "1 Timothy",          "usccb_slug": "1timothy"},
    {"en_name": "2 Timothy",          "usccb_slug": "2timothy"},
    {"en_name": "Titus",              "usccb_slug": "titus"},
    {"en_name": "Philemon",           "usccb_slug": "philemon"},
    {"en_name": "Hebrews",            "usccb_slug": "hebrews"},
    {"en_name": "James",              "usccb_slug": "james"},
    {"en_name": "1 Peter",            "usccb_slug": "1peter"},
    {"en_name": "2 Peter",            "usccb_slug": "2peter"},
    {"en_name": "1 John",             "usccb_slug": "1john"},
    {"en_name": "2 John",             "usccb_slug": "2john"},
    {"en_name": "3 John",             "usccb_slug": "3john"},
    {"en_name": "Jude",               "usccb_slug": "jude"},
    {"en_name": "Revelation",         "usccb_slug": "revelation"},
]

# Map each NABRE bookid → vatican Spanish book name (for joining with the scraped JSON)
_ES_NAME_BY_BOOKID = {
    1: "GENESIS",       2: "EXODO",        3: "LEVITICO",   4: "NUMEROS",
    5: "DEUTERONOMIO",  6: "JOSUE",        7: "JUECES",     8: "RUT",
    9: "PRIMER LIBRO DE SAMUEL", 10: "SEGUNDO LIBRO DE SAMUEL",
    11: "PRIMER LIBRO DE LOS REYES", 12: "SEGUNDO LIBRO DE LOS REYES",
    13: "PRIMER LIBRO DE LAS CRONICAS", 14: "SEGUNDO LIBRO DE LAS CRONICAS",
    15: "ESDRAS",       16: "NEHEMIAS",    17: "TOBIAS",    18: "JUDIT",
    19: "ESTER",        20: "PRIMER LIBRO DE LOS MACABEOS", 21: "SEGUNDO LIBRO DE LOS MACABEOS",
    22: "JOB",          23: "SALMOS",      24: "PROVERBIOS",25: "ECLESIASTES",
    26: "CANTAR DE LOS CANTARES", 27: "SABIDURIA", 28: "ECLESIASTICO",
    29: "ISAIAS",       30: "JEREMIAS",    31: "LAMENTACIONES", 32: "BARUC",
    33: "EZEQUIEL",     34: "DANIEL",      35: "OSEAS",     36: "JOEL",
    37: "AMOS",         38: "ABDIAS",      39: "JONAS",     40: "MIQUEAS",
    41: "NAHUM",        42: "HABACUC",     43: "SOFONIAS",  44: "AGEO",
    45: "ZACARIAS",     46: "MALAQUIAS",
    47: "EVANGELIO SEGUN SAN MATEO", 48: "EVANGELIO SEGUN SAN MARCOS",
    49: "EVANGELIO SEGUN SAN LUCAS", 50: "EVANGELIO SEGUN SAN JUAN",
    51: "HECHOS DE LOS APOSTOLES",   52: "CARTA A LOS ROMANOS",
    53: "PRIMERA CARTA A LOS CORINTIOS", 54: "SEGUNDA CARTA A LOS CORINTIOS",
    55: "CARTA A LOS GALATAS", 56: "CARTA A LOS EFESIOS",
    57: "CARTA A LOS FILIPENSES", 58: "CARTA A LOS COLOSENSES",
    59: "PRIMERA CARTA A LOS TESALONICENSES", 60: "SEGUNDA CARTA A LOS TESALONICENSES",
    61: "PRIMERA CARTA A TIMOTEO", 62: "SEGUNDA CARTA A TIMOTEO",
    63: "CARTA A TITO", 64: "CARTA A FILEMON", 65: "CARTA A LOS HEBREOS",
    66: "CARTA DE SANTIAGO", 67: "PRIMERA CARTA DE SAN PEDRO",
    68: "SEGUNDA CARTA DE SAN PEDRO", 69: "PRIMERA CARTA DE SAN JUAN",
    70: "SEGUNDA CARTA DE SAN JUAN", 71: "TERCERA CARTA DE SAN JUAN",
    72: "CARTA DE SAN JUDAS", 73: "APOCALIPSIS",
}


def build_book_index(vatican_books: list[dict]) -> list[dict]:
    """Combine NABRE and Vatican Spanish into the unified book list."""
    by_es_name = {b["name_es"].upper(): b for b in vatican_books}
    out = []
    for bookid in range(1, 74):
        en = _NABRE_BOOKS[bookid - 1]
        es_name = _ES_NAME_BY_BOOKID[bookid]
        es_entry = by_es_name.get(es_name.upper(), {})
        chapter_urls = es_entry.get("chapter_urls", [])
        out.append({
            "bookid": bookid,
            "name_en": en["en_name"],
            "name_es": es_name.title(),
            "chapters": len(chapter_urls) if chapter_urls else None,
            "usccb_slug": en["usccb_slug"],
            "vatican_urls": chapter_urls,
        })
    return out
