/**
 * Évaluation de la qualité des réponses du moteur RAG sur un jeu de questions
 * types, corpus par corpus.
 *
 *   npm run eval                 # corpus déduit de la branche corpus/* courante
 *   npm run eval -- --corpus=nis2
 *   npm run eval -- --dry-run    # valide le jeu de questions, aucun appel LLM
 *
 * Prérequis : index présent (`npm run generate` sur la branche) et OPENAI_API_KEY.
 * Fait de VRAIS appels LLM (embeddings + génération) — à lancer délibérément.
 *
 * Le jeu de questions vit sur `main` (`eval/questions.<corpus>.json`) et se
 * propage aux branches comme le reste du moteur. Le rapport complet est écrit
 * dans `eval/<corpus>.results.json` (git-ignoré).
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Settings } from "llamaindex";
import { initSettings } from "@/lib/rag/settings";
import { retrieve } from "@/lib/rag/retrieve";
import { condenseQuestion } from "@/lib/rag/condense";
import { SYSTEM_PROMPT, buildUserMessage } from "@/lib/rag/prompt";
import type { ChatMessage } from "@/lib/chat-protocol";

type QuestionType = "nominal" | "refus" | "ambigu" | "suivi";

interface EvalQuestion {
  id: string;
  /** Question unique. Exclusif avec `turns`. */
  question?: string;
  /** Séquence de tours ; l'évaluation porte sur la réponse au dernier. */
  turns?: string[];
  type: QuestionType;
  /** Libellé lisible de la source attendue (rapport uniquement). */
  expectedSource?: string;
  /** Sous-chaînes qui doivent apparaître dans la réponse finale. */
  expectContains?: string[];
  /** La réponse doit être un refus explicite (question hors corpus). */
  expectRefusal?: boolean;
}

interface EvalFile {
  corpus: string;
  updated: string;
  questions: EvalQuestion[];
}

type Verdict = "OK" | "ECHEC" | "MANUEL";

interface QuestionResult {
  id: string;
  type: QuestionType;
  finalQuestion: string;
  answer: string;
  retrievedFiles: string[];
  citationPresent: boolean;
  refusalPresent: boolean;
  missingExpected: string[];
  verdict: Verdict;
  reason: string;
}

/**
 * Marqueurs de refus. Le prompt système impose « …ne contient pas cette
 * information » (règle 3) ; on tolère quelques variantes proches.
 */
const REFUSAL_MARKS = [
  "ne contient pas cette information",
  "ne contiennent pas cette information",
  "ne permet pas de répondre",
  "ne figure pas dans le corpus",
  "aucune information",
];

/**
 * Une réponse « cite une source » si elle référence un article/section numéroté
 * ou un type de document du corpus (prompt système, règle 2 : « numéro
 * d'article, de section, ou nom du document »).
 */
const CITATION_RE =
  /\bart(?:icle|\.)?\s*\d|\b(section|annexe|avenant|accord du|chapitre|considérant|titre|directive|règlement|convention|guide|PADD|OAP|PLU|EBIOS)\b/i;

function resolveCorpus(): string {
  const fromArg = process.argv
    .find((a) => a.startsWith("--corpus="))
    ?.slice("--corpus=".length)
    .trim();
  if (fromArg) return fromArg;

  const fromEnv = process.env.CORPUS_BRANCH?.replace(/^corpus\//, "").trim();
  if (fromEnv) return fromEnv;

  try {
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const m = branch.match(/^corpus\/(.+)$/);
    if (m) return m[1];
  } catch {
    // pas un dépôt git / git absent : on tombe sur l'erreur ci-dessous
  }

  throw new Error(
    "Corpus indéterminé. Préciser `--corpus=<nom>`, définir CORPUS_BRANCH, " +
      "ou se placer sur une branche `corpus/*`.",
  );
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function hasCitation(answer: string, retrievedFiles: string[]): boolean {
  if (CITATION_RE.test(answer)) return true;
  const a = normalise(answer);
  return retrievedFiles.some((f) => {
    const stem = normalise(path.parse(f).name);
    return stem.length > 4 && a.includes(stem);
  });
}

function validateQuestions(file: EvalFile): void {
  const ids = new Set<string>();
  for (const q of file.questions) {
    if (!q.id) throw new Error("Question sans `id`.");
    if (ids.has(q.id)) throw new Error(`id dupliqué : ${q.id}`);
    ids.add(q.id);
    const hasSingle = typeof q.question === "string" && q.question.length > 0;
    const hasTurns = Array.isArray(q.turns) && q.turns.length > 0;
    if (hasSingle === hasTurns) {
      throw new Error(`${q.id} : renseigner soit \`question\` soit \`turns\`.`);
    }
    if (q.type === "suivi" && (q.turns?.length ?? 0) < 2) {
      throw new Error(`${q.id} : type "suivi" exige \`turns\` avec au moins 2 tours.`);
    }
  }
}

/** Passe une question (mono ou multi-tours) dans le moteur complet. */
async function runQuestion(
  q: EvalQuestion,
): Promise<{ finalQuestion: string; answer: string; retrievedFiles: string[] }> {
  const turns = q.turns ?? [q.question as string];
  const history: ChatMessage[] = [];
  let lastAnswer = "";
  let lastFiles: string[] = [];

  for (let i = 0; i < turns.length; i++) {
    const question = turns[i].trim();
    const searchQuery =
      history.length > 0 ? await condenseQuestion(question, history) : question;
    const sources = await retrieve(searchQuery);
    const answer = await generate(question, history, sources);

    history.push({ role: "user", content: question });
    history.push({ role: "assistant", content: answer });
    lastAnswer = answer;
    lastFiles = sources
      .map((s) => s.fileName)
      .filter((f): f is string => typeof f === "string");
  }

  return {
    finalQuestion: turns[turns.length - 1].trim(),
    answer: lastAnswer,
    retrievedFiles: [...new Set(lastFiles)],
  };
}

async function generate(
  question: string,
  history: ChatMessage[],
  sources: Awaited<ReturnType<typeof retrieve>>,
): Promise<string> {
  const res = await Settings.llm.chat({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: buildUserMessage(question, sources) },
    ],
  });
  return typeof res.message.content === "string" ? res.message.content.trim() : "";
}

function judge(q: EvalQuestion, r: Omit<QuestionResult, "verdict" | "reason">): {
  verdict: Verdict;
  reason: string;
} {
  const wantsRefusal = q.type === "refus" || q.expectRefusal === true;

  if (wantsRefusal) {
    return r.refusalPresent
      ? { verdict: "OK", reason: "refus explicite" }
      : { verdict: "ECHEC", reason: "refus attendu, réponse substantielle rendue" };
  }

  if (r.missingExpected.length > 0) {
    return {
      verdict: "ECHEC",
      reason: `sous-chaînes attendues absentes : ${r.missingExpected.join(", ")}`,
    };
  }

  // Pour une question ambiguë, demander une précision est le comportement voulu :
  // ni « refus » ni « citation » ne sont des critères pertinents → relecture.
  if (q.type === "ambigu") {
    return { verdict: "MANUEL", reason: "question ambiguë — vérifier à la main" };
  }

  if (r.refusalPresent) {
    return {
      verdict: "ECHEC",
      reason: "refus rendu alors qu'une réponse était attendue",
    };
  }

  if (!r.citationPresent) {
    return { verdict: "ECHEC", reason: "aucune citation de source détectée" };
  }

  return { verdict: "OK", reason: "citation présente, pas de refus indu" };
}

function printTable(results: QuestionResult[]): void {
  const rows = results.map((r) => ({
    id: r.id,
    type: r.type,
    verdict: r.verdict,
    detail: r.reason,
  }));
  const w = (k: keyof (typeof rows)[number]) =>
    Math.max(k.length, ...rows.map((row) => row[k].length));
  const widths = {
    id: w("id"),
    type: w("type"),
    verdict: w("verdict"),
    detail: w("detail"),
  };
  const line = (r: (typeof rows)[number]) =>
    `${r.id.padEnd(widths.id)}  ${r.type.padEnd(widths.type)}  ` +
    `${r.verdict.padEnd(widths.verdict)}  ${r.detail}`;

  console.log(
    `\n${"id".padEnd(widths.id)}  ${"type".padEnd(widths.type)}  ` +
      `${"verdict".padEnd(widths.verdict)}  détail`,
  );
  console.log("-".repeat(widths.id + widths.type + widths.verdict + widths.detail + 6));
  for (const r of rows) console.log(line(r));
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const corpus = resolveCorpus();
  const questionsPath = path.join(
    process.cwd(),
    "eval",
    `questions.${corpus}.json`,
  );

  if (!existsSync(questionsPath)) {
    throw new Error(
      `Jeu de questions introuvable : ${questionsPath}. ` +
        `Le créer sur \`main\` puis propager.`,
    );
  }

  const file = JSON.parse(await readFile(questionsPath, "utf8")) as EvalFile;
  validateQuestions(file);
  console.log(
    `Corpus « ${corpus} » — ${file.questions.length} question(s), ` +
      `jeu daté du ${file.updated}.`,
  );

  if (dryRun) {
    for (const q of file.questions) {
      const turns = q.turns ?? [q.question as string];
      console.log(`  [${q.type}] ${q.id} — ${turns.length} tour(s)`);
    }
    console.log("\n--dry-run : jeu de questions valide, aucun appel LLM.");
    return;
  }

  initSettings();

  const results: QuestionResult[] = [];
  for (const q of file.questions) {
    process.stdout.write(`· ${q.id} … `);
    const run = await runQuestion(q);
    const normalisedAnswer = normalise(run.answer);
    const refusalPresent = REFUSAL_MARKS.some((m) =>
      normalisedAnswer.includes(normalise(m)),
    );
    const citationPresent = hasCitation(run.answer, run.retrievedFiles);
    const missingExpected = (q.expectContains ?? []).filter(
      (s) => !normalisedAnswer.includes(normalise(s)),
    );
    const base = {
      id: q.id,
      type: q.type,
      finalQuestion: run.finalQuestion,
      answer: run.answer,
      retrievedFiles: run.retrievedFiles,
      citationPresent,
      refusalPresent,
      missingExpected,
    };
    const { verdict, reason } = judge(q, base);
    results.push({ ...base, verdict, reason });
    console.log(verdict);
  }

  printTable(results);

  const counts = results.reduce<Record<Verdict, number>>(
    (acc, r) => ({ ...acc, [r.verdict]: acc[r.verdict] + 1 }),
    { OK: 0, ECHEC: 0, MANUEL: 0 },
  );
  console.log(
    `\n${counts.OK} OK · ${counts.ECHEC} ÉCHEC · ${counts.MANUEL} à vérifier.`,
  );

  const resultsPath = path.join(process.cwd(), "eval", `${corpus}.results.json`);
  await writeFile(
    resultsPath,
    JSON.stringify({ corpus, ranAt: new Date().toISOString(), results }, null, 2),
  );
  console.log(`Rapport détaillé : ${resultsPath}`);

  const globalVerdict = counts.ECHEC === 0 ? "PRÊT À PARTAGER" : "À CORRIGER";
  console.log(`\nVerdict : ${globalVerdict}`);
  if (counts.ECHEC > 0) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error("Échec de l'évaluation :", (err as Error).message);
  process.exit(1);
});
