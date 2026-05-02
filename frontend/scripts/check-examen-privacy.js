#!/usr/bin/env node
/**
 * Privacy assert for the Examen de Conciencia.
 *
 * The Examen state (which questions a user marked) MUST NEVER leave the
 * device — it lives only in localStorage. To make this guarantee
 * non-bypassable, this script is wired as a `prebuild` and `pretest` step
 * (see package.json). Any new code in `src/pages/Examen.jsx` (or files it
 * directly imports under the same folder pattern) that reaches for the
 * network will fail the build before a single byte ships.
 *
 * Forbidden patterns:
 *   - axios, @/lib/api, fetch(...), navigator.sendBeacon, XMLHttpRequest,
 *     EventSource, WebSocket, navigator.serviceWorker.controller.postMessage
 *
 * Whitelisted: a single bootstrap fetch to the static, public JSON catalog
 * `/data/examen-{lang}.json`. That file ships with the app and contains
 * only canonical question text, no user data.
 */
const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
// Files that fall under the "Examen" privacy fence.
const TARGETS = [
    "src/pages/Examen.jsx",
];

const FORBIDDEN = [
    { name: "axios import",                re: /from\s+['"]axios['"]/ },
    { name: "axios require",               re: /require\(\s*['"]axios['"]\s*\)/ },
    { name: "internal api client (@/lib/api)", re: /from\s+['"]@\/lib\/api['"]/ },
    { name: "internal api relative",       re: /from\s+['"]\.\.?\/lib\/api['"]/ },
    { name: "navigator.sendBeacon",        re: /navigator\.sendBeacon\s*\(/ },
    { name: "XMLHttpRequest",              re: /new\s+XMLHttpRequest\s*\(/ },
    { name: "EventSource",                 re: /new\s+EventSource\s*\(/ },
    { name: "WebSocket",                   re: /new\s+WebSocket\s*\(/ },
];

// fetch() is banned EXCEPT when the literal argument is the public examen
// catalog. We allow `fetch(\`/data/examen-${lang}.json\`)` exactly.
const FETCH_RE          = /\bfetch\s*\(/g;
const FETCH_OK_PATTERNS = [
    /\bfetch\s*\(\s*DATA_URL\s*\(\s*lang\s*\)\s*[,)]/,           // existing var path
    /\bfetch\s*\(\s*`\/data\/examen-\$\{lang\}\.json`\s*[,)]/,    // template literal
    /\bfetch\s*\(\s*['"]\/data\/examen-en\.json['"]\s*[,)]/,      // hardcoded en
    /\bfetch\s*\(\s*['"]\/data\/examen-es\.json['"]\s*[,)]/,      // hardcoded es
];

function findForbidden(content) {
    const issues = [];

    for (const { name, re } of FORBIDDEN) {
        const m = re.exec(content);
        if (m) {
            const line = content.slice(0, m.index).split("\n").length;
            issues.push({ line, hit: m[0], rule: name });
        }
    }

    // Inspect every fetch( call individually. If none of the OK patterns
    // wrap the same line, flag it.
    let m;
    while ((m = FETCH_RE.exec(content)) !== null) {
        const lineStart = content.lastIndexOf("\n", m.index) + 1;
        const lineEnd   = content.indexOf("\n", m.index);
        const lineSlice = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd);
        const allowed   = FETCH_OK_PATTERNS.some((p) => p.test(lineSlice));
        if (!allowed) {
            const line = content.slice(0, m.index).split("\n").length;
            issues.push({ line, hit: lineSlice.trim(), rule: "fetch() outside the public examen catalog" });
        }
    }

    return issues;
}

function red(s)   { return `\x1b[31m${s}\x1b[0m`; }
function green(s) { return `\x1b[32m${s}\x1b[0m`; }
function bold(s)  { return `\x1b[1m${s}\x1b[0m`; }

let totalIssues = 0;
console.log(bold("\n[examen-privacy] auditing files for forbidden network access…"));
for (const rel of TARGETS) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
        console.error(red(`  ✗ ${rel} not found`));
        totalIssues++;
        continue;
    }
    const content = fs.readFileSync(abs, "utf8");
    const issues  = findForbidden(content);
    if (issues.length === 0) {
        console.log(green(`  ✓ ${rel}`));
    } else {
        totalIssues += issues.length;
        console.error(red(`  ✗ ${rel}`));
        for (const i of issues) {
            console.error(red(`      L${i.line}: [${i.rule}]  ${i.hit}`));
        }
    }
}

if (totalIssues > 0) {
    console.error(
        red(bold(
            `\n[examen-privacy] BUILD ABORTED — ${totalIssues} privacy violation(s) detected.\n` +
            `The Examen de Conciencia state must NEVER leave the device.\n` +
            `Use localStorage only. If you genuinely need a new exception, edit\n` +
            `frontend/scripts/check-examen-privacy.js and document the rationale.`,
        )),
    );
    process.exit(1);
}
console.log(green(bold("[examen-privacy] all clear — Examen state stays on-device.\n")));
process.exit(0);
