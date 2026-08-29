/**
 * Configuration d'affichage — sûre côté client.
 *
 * Uniquement des variables `NEXT_PUBLIC_*` (inlinées dans le bundle par Next).
 * Chaque déploiement de corpus surcharge ces valeurs dans les variables
 * d'environnement de son projet Vercel.
 */

function parseStarterQuestions(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((q): q is string => typeof q === "string" && q.trim().length > 0);
    }
  } catch {
    // Repli : format "question 1 | question 2 | ...".
    return raw
      .split("|")
      .map((q) => q.trim())
      .filter(Boolean);
  }
  return [];
}

export const uiConfig = {
  /** Nom du corpus affiché dans l'en-tête et le titre de page. */
  corpusName: process.env.NEXT_PUBLIC_CORPUS_NAME ?? "Corpus de démonstration",
  /** Date d'arrêt du corpus (ex. "loi du 17/07/2026", "PLU déc. 2024"). */
  corpusCutoff: process.env.NEXT_PUBLIC_CORPUS_CUTOFF ?? "non précisée",
  /** Libellé de la source des documents (ex. "EUR-Lex, Légifrance, ANSSI"). */
  corpusSourceLabel:
    process.env.NEXT_PUBLIC_CORPUS_SOURCE_LABEL ?? "Documents sources publics",
  /** Questions d'exemple proposées au démarrage. JSON (`["q1","q2"]`) ou "q1 | q2". */
  starterQuestions: parseStarterQuestions(process.env.NEXT_PUBLIC_STARTER_QUESTIONS),
} as const;

/** Avertissement de non-conseil, identique sur tous les déploiements. */
export const DISCLAIMER =
  "Assistant à but démonstratif. Ne remplace pas un avis d'expert ou juridique. " +
  "Chaque corpus a une date d'arrêt : vérifier la version en vigueur avant toute décision.";
