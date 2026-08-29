#!/usr/bin/env node
// PreToolUse (Bash).
// Intercepte les commandes lentes et couteuses que CLAUDE.md interdit de rejouer
// sans raison explicite : reindexation vectorielle, scaffold create-llama, build
// complet, telechargement d'un corpus source. Passe la decision en "ask" pour
// forcer une confirmation utilisateur — ne bloque jamais en dur.

function readStdin() {
  return new Promise((res) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => res(data));
    process.stdin.on("error", () => res(""));
  });
}

const raw = await readStdin();
let payload;
try {
  payload = JSON.parse(raw || "{}");
} catch {
  process.exit(0);
}

const cmd = String(payload.tool_input?.command ?? "");
if (!cmd) process.exit(0);

const rules = [
  {
    re: /\bnpm\s+run\s+generate\b/,
    why: "reindexation vectorielle (npm run generate) — lente, consomme des appels d'embeddings",
  },
  {
    re: /\bcreate-llama\b/,
    why: "scaffold create-llama — reecrit la base de code de l'application",
  },
  {
    re: /\b(npm|pnpm|yarn)\s+run\s+build\b|\bnext\s+build\b|\bvercel\s+build\b/,
    why: "build complet",
  },
  {
    re: /\b(curl|wget|Invoke-WebRequest|iwr)\b[\s\S]*(geoportail-urbanisme|eur-lex\.europa|legifrance\.gouv|cyber\.gouv|communaute-paysbasque|senat\.fr)/i,
    why: "telechargement d'un corpus source officiel",
  },
];

const hit = rules.find((r) => r.re.test(cmd));
if (!hit) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason:
        `Commande interceptee : ${hit.why}. CLAUDE.md impose de ne pas rejouer ces etapes ` +
        `sans raison explicite (economie de tokens / cache). Confirmer si c'est intentionnel.`,
    },
  }),
);
process.exit(0);
