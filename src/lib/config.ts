/**
 * Configuration serveur du moteur RAG.
 *
 * NE PAS importer ce module depuis un composant client : il expose la clé API.
 * Seuls la route API (`src/app/api/chat/route.ts`) et les scripts (`scripts/`) l'utilisent.
 *
 * Toutes les valeurs ont un défaut raisonnable → le projet tourne en local
 * sans variable d'environnement, sauf OPENAI_API_KEY.
 */

function intFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
  /** Recouvrement entre chunks (tokens). */
  chunkOverlap: intFromEnv(process.env.RAG_CHUNK_OVERLAP, 200),
} as const;

/**
 * Emplacements sur disque — littéraux (pas de variable d'env) pour que Next
 * limite le tracing du build au bon sous-dossier.
 */
export const DATA_DIR = "data";
export const STORAGE_DIR = "storage";
