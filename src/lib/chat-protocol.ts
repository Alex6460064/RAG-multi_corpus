/**
 * Un extrait de document récupéré, transmis au client pour citation.
 *
 * Ne contient que ce que l'UI affiche : ni `metadata` brut ni `id` interne du
 * nœud — tous deux portent le chemin absolu du fichier sur la machine de build.
 *
 * Défini ici, avec le reste du contrat client/serveur, et non dans le module de
 * récupération : trois fichiers client l'importent, et `retrieve.ts` tire
 * `node:fs` et `llamaindex`. L'inversion évite qu'un futur import de valeur à
 * côté de ce type fasse partir le serveur dans le bundle client.
 */
export interface SourceChunk {
  /** Identifiant d'affichage (clé de liste côté client). Pas un chemin. */
  id: string;
  text: string;
  score: number | null;
  /** Nom du fichier source (basename), si connu. */
  fileName: string | null;
  /** Numéro ou libellé de page, si le document en a. */
  page: string | number | null;
}

/** Message échangé entre le client et la route API. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Événements du flux NDJSON renvoyé par `POST /api/chat`.
 * Une ligne = un objet JSON. Ordre : `sources`, puis N × `delta`, puis `done`
 * (ou `error` à tout moment).
 */
export type ChatStreamEvent =
  | { type: "sources"; sources: SourceChunk[] }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };
