import type { SourceChunk } from "@/lib/rag/retrieve";

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
