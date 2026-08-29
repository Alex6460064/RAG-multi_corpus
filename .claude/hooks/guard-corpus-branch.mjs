#!/usr/bin/env node
// PreToolUse (Edit|Write|MultiEdit|NotebookEdit).
// Protege la regle multi-branches de CLAUDE.md : sur une branche corpus/*, seuls
// data/, .claude/ et README.md sont modifiables. Le code applicatif ne vit que sur
// main et se propage aux branches de contenu par `git merge main` — jamais reecrit
// dans une branche corpus/*.
//
// Sortie : rien (autorise) ou JSON permissionDecision=deny. Toute erreur interne
// est non bloquante (exit 0) : le hook ne doit jamais empecher un travail legitime
// a cause d'un environnement inattendu.

import { execFileSync } from "node:child_process";
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

const input = payload.tool_input ?? {};
const filePath = input.file_path ?? input.path ?? input.notebook_path;
if (!filePath) process.exit(0);

let branch = "";
try {
  branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch {
  process.exit(0);
}

if (!branch.startsWith("corpus/")) process.exit(0);

const root = process.cwd();
const rel = relative(root, resolve(root, filePath)).replace(/\\/g, "/");

// Hors du projet : laisser les autres garde-fous de Claude Code decider.
if (rel.startsWith("..")) process.exit(0);

const firstSegment = rel.split("/")[0];
const allowedDirs = new Set(["data", ".claude"]);
const allowedFiles = new Set(["README.md"]);

if (allowedDirs.has(firstSegment) || allowedFiles.has(rel)) process.exit(0);

const reason =
  `Branche ${branch} : seuls data/, .claude/ et README.md sont editables ici. ` +
  `"${rel}" est du code applicatif. Regle multi-branches (CLAUDE.md) : le moteur evolue ` +
  `sur main puis se propage par "git merge main". Si ce corpus a besoin d'un comportement ` +
  `specifique, le rendre configurable sur main (variable d'env / fichier de config), pas le ` +
  `coder en dur dans la branche.`;

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  }),
);
process.exit(0);
