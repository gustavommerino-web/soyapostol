/**
 * Infer the liturgical vestment colour for a given day from Evangelizo's
 * `liturgic_title` string. Colours follow the Ordinary Form of the Roman
 * Rite (GIRM §346):
 *
 *   white  → Christmas, Easter, feasts of the Lord and Our Lady, all saints
 *            not martyrs. Also Holy Thursday evening Mass, Trinity.
 *   red    → Palm Sunday, Good Friday, Pentecost, apostles, evangelists,
 *            martyrs.
 *   violet → Advent and Lent.
 *   rose   → Gaudete Sunday (3rd of Advent) and Laetare Sunday (4th of
 *            Lent) — optional rose vestments.
 *   green  → Ordinary Time.
 *
 * We fall back to green when the title doesn't match any marker, which is
 * the safe default for most feria days.
 *
 * Order of checks matters: red cases inside Holy Week / Pentecost must
 * match before the broader Easter/Lent tests.
 */

const PATTERNS = [
    // Red — Holy Week Friday, Palm Sunday, Pentecost, martyrs, apostles.
    {
        color: "red",
        re: /\b(pentecost[eé]s|pentecost|domingo de ramos|palm sunday|viernes santo|good friday|m[áa]rtir|martyr|ap[óo]stol(?!es)(es)?|apostle[s]?|evangelist[ae]?|santos inocentes|holy innocents|exaltaci[óo]n de la (santa )?cruz|exaltation of the (holy )?cross)\b/i,
    },

    // Rose — Gaudete (3rd Advent) and Laetare (4th Lent).
    {
        color: "rose",
        re: /\b(gaudete|laetare|iii domingo de adviento|3(rd|er|o)?\s*(sunday )?of advent|4(th|to|o)?\s*sunday of lent|iv domingo de cuaresma)\b/i,
    },

    // Violet — Advent and Lent (catch Ash Wednesday too).
    {
        color: "violet",
        re: /\b(adviento|advent|cuaresma|lent|ceniza|ash wednesday)\b/i,
    },

    // White — Easter season, Christmas, Epiphany, Marian feasts, Trinity,
    // Baptism of the Lord, Transfiguration, Assumption, All Saints.
    {
        color: "white",
        re: /\b(pascua|easter|tiempo pascual|navidad|christmas|epifan[íi]a|epiphany|transfiguraci[óo]n|transfiguration|asunci[óo]n|assumption|todos los santos|all saints|sant[íi]sima trinidad|holy trinity|bautismo del se[ñn]or|baptism of the lord|sagrada familia|holy family|anunciaci[óo]n|annunciation|inmaculada|immaculate|virgen|virgin|sagrado coraz[óo]n|sacred heart|cristo rey|christ the king)\b/i,
    },

    // Green — explicit Ordinary Time.
    {
        color: "green",
        re: /\b(tiempo ordinario|ordinary time)\b/i,
    },
];

// Tailwind tokens per colour. Kept in one spot so UI changes don't fan out.
// `dot` is used for the leading indicator circle; `border` sits on the
// left edge of the badge; `label` is the human-readable season name.
const STYLES = {
    white:  {
        dot:    "bg-amber-200",
        border: "border-l-amber-300",
        label:  { es: "Blanco", en: "White" },
    },
    red: {
        dot:    "bg-red-600",
        border: "border-l-red-600",
        label:  { es: "Rojo",   en: "Red"   },
    },
    violet: {
        dot:    "bg-purple-700",
        border: "border-l-purple-700",
        label:  { es: "Morado", en: "Violet" },
    },
    rose: {
        dot:    "bg-pink-400",
        border: "border-l-pink-400",
        label:  { es: "Rosa",   en: "Rose"  },
    },
    green: {
        dot:    "bg-emerald-600",
        border: "border-l-emerald-600",
        label:  { es: "Verde",  en: "Green" },
    },
};

export function liturgicalColor(title) {
    if (!title) return "green";
    for (const { color, re } of PATTERNS) {
        if (re.test(title)) return color;
    }
    return "green";
}

export function liturgicalColorStyle(color) {
    return STYLES[color] || STYLES.green;
}
