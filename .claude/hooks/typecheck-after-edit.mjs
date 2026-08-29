#!/usr/bin/env node
// PostToolUse (Edit|Write|MultiEdit).
// Apres edition d'un fichier TypeScript : `tsc --noEmit`. Si des erreurs de type
// concernent le fichier qui vient d'etre edite, renvoie decision=block avec le
// detail pour que Claude corrige tout de suite (CLAUDE.md : types OK avant
// soumission). Erreurs ailleurs dans le projet : ignorees (pas cette edition).
// Ne fait rien tant que le projet n'est pas scaffolde (pas de tsconfig / de tsc).

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";

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

const fp = String(
  payload.tool_input?.file_path ?? payload.tool_input?.path ?? "",
);
if (!/\.(ts|tsx|mts|cts)$/.test(fp)) process.exit(0);

if (!existsSync("tsconfig.json") || !existsSync("node_modules/typescript")) {
  process.exit(0);
}

let errText = "";
try {
  execSync("npx --no-install tsc --noEmit --pretty false", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  process.exit(0); // aucune erreur de type
} catch (e) {
  errText = `${e.stdout ?? ""}${e.stderr ?? ""}`;
}

const rel = relative(process.cwd(), resolve(process.cwd(), fp)).replace(
  /\\/g,
  "/",
);
const lines = errText
  .split(/\r?\n/)
  .filter((l) => l.replace(/\\/g, "/").includes(rel));

if (lines.length === 0) process.exit(0);

process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason:
      `tsc --noEmit signale des erreurs de type dans ${rel} :\n` +
      `${lines.slice(0, 20).join("\n")}\n\n` +
      `Corriger avant de continuer (CLAUDE.md : Types OK avant soumission).`,
  }),
);
process.exit(0);
