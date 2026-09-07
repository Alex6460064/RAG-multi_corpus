/**
 * Configuration serveur du moteur RAG.
 *
 * NE PAS importer ce module depuis un composant client : il expose la clé API.
 * Seuls la route API (`src/app/api/chat/route.ts`) et les scripts (`scripts/`) l'utilisent.
 *
 * Toutes les valeurs ont un défaut raisonnable → le projet tourne en local
 * sans variable d'environnement, sauf OPENAI_API_KEY.
 */

/**
 * Lit un entier depuis l'environnement. Une valeur absente OU malformée (non
 * entière, hors bornes) retombe sur le défaut avec un avertissement — un
 * `RAG_*` mal saisi ne doit pas faire échouer le build Vercel ni la route.
 * Le rejet des non-entiers évite qu'un « 1024.5 » passe en flottant dans le
 * splitter / le retriever.
 */
function intFromEnv(
  value: string | undefined,
  fallback: number,
  min = 1,
): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    console.warn(
      `Variable d'environnement ignorée : « ${value} » (entier ≥ ${min} attendu) — défaut ${fallback} utilisé.`,
    );
    return fallback;
  }
  return parsed;
}

export const config = {
  /** Clé API OpenAI. Jamais commitée : .env.local en local, variable d'env sur Vercel. */
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  /** Modèle de génération. */
  model: process.env.MODEL ?? "gpt-4o-mini",
  /** Modèle d'embeddings (indexation + requête). */
  embeddingModel: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
  /** Nombre d'extraits récupérés par question. */
  topK: intFromEnv(process.env.RAG_TOP_K, 5),
  /** Taille des chunks à l'indexation (tokens). */
  chunkSize: intFromEnv(process.env.RAG_CHUNK_SIZE, 1024),
  /** Recouvrement entre chunks (tokens). 0 = pas de recouvrement, valide. */
  chunkOverlap: intFromEnv(process.env.RAG_CHUNK_OVERLAP, 200, 0),
  /** Garde-fou coût : nombre de messages d'historique (2 par tour) réinjectés dans l'appel LLM. */
  maxHistoryMessages: intFromEnv(process.env.RAG_MAX_HISTORY_MESSAGES, 20),
  /** Garde-fou coût : longueur max (caractères) de la question entrante. */
  maxQuestionChars: intFromEnv(process.env.RAG_MAX_QUESTION_CHARS, 4000),
  /**
   * Garde-fou coût : nombre de messages au-delà duquel la requête est rejetée
   * sans être examinée. Très au-dessus de `maxHistoryMessages`, qui tronque.
   */
  maxMessages: intFromEnv(process.env.RAG_MAX_MESSAGES, 60),
  /**
   * Garde-fou coût : longueur cumulée max (caractères) de l'historique envoyé au
   * modèle — `maxHistoryMessages` borne un nombre de messages, jamais leur
   * taille. C'est un budget de troncature, pas un seuil de rejet : au-delà, les
   * messages les plus anciens de la fenêtre sont écartés (voir borneHistorique).
   * Avec `maxQuestionChars` et les extraits récupérés, borne l'entrée d'un appel
   * à ~16 k tokens, quel que soit le corps envoyé.
   */
  maxTotalChars: intFromEnv(process.env.RAG_MAX_TOTAL_CHARS, 40000),
  /** Reformulation : nombre de tours d'historique repris (2 messages par tour). */
  condenseHistoryTurns: intFromEnv(process.env.RAG_CONDENSE_HISTORY_TURNS, 3),
  /** Reformulation : marge (caractères) tolérée au-delà de la question d'origine. */
  condenseMaxExtraChars: intFromEnv(process.env.RAG_CONDENSE_MAX_EXTRA_CHARS, 400),
} as const;

/**
 * Emplacements sur disque — littéraux (pas de variable d'env) pour que Next
 * limite le tracing du build au bon sous-dossier.
 */
export const DATA_DIR = "data";
export const STORAGE_DIR = "storage";
