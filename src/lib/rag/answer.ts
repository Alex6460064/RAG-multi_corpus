import { config } from "@/lib/config";
import type { ChatMessage, SourceChunk } from "@/lib/chat-protocol";
import { condenseQuestion } from "./condense";
import { retrieve } from "./retrieve";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt";

/** Message tel qu'il part au LLM — inclut le tour `system`, absent du protocole client. */
export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PreparedAnswer {
  /** Extraits récupérés, transmis au client pour citation. */
  sources: SourceChunk[];
  /** Requête réellement envoyée à la recherche : la question, reformulée si suivi. */
  searchQuery: string;
  /** Messages prêts pour l'appel LLM. */
  llmMessages: LlmMessage[];
}

/**
 * Prépare tout ce qui précède la génération : bornage de l'historique,
 * reformulation d'une question de suivi, récupération, assemblage des messages.
 *
 * Cette fonction est le moteur : la route la streame, l'évaluation l'appelle
 * sans streaming. Écrire l'orchestration deux fois faisait diverger les deux —
 * un seuil de similarité ou un reranker ajouté dans la route ne serait pas
 * testé, et l'évaluation rendrait son verdict sur un moteur qui n'est pas
 * celui déployé.
 */
/**
 * Fenêtre d'historique réellement envoyée au modèle. On tronque plutôt que de
 * rejeter, pour ne pas bloquer une conversation longue. Exportée pour que la
 * route mesure son garde-fou de taille sur cette fenêtre-là, et pas sur des
 * messages qu'elle allait de toute façon écarter.
 */
export function borneHistorique(history: ChatMessage[]): ChatMessage[] {
  return history.slice(-config.maxHistoryMessages);
}

export async function prepareAnswer(
  question: string,
  history: ChatMessage[],
): Promise<PreparedAnswer> {
  const borne = borneHistorique(history);

  // Question de suivi elliptique : la reformuler en question autonome avant la
  // recherche, sinon l'embedding du fragment récupère des extraits hors sujet.
  const searchQuery =
    borne.length > 0 ? await condenseQuestion(question, borne) : question;
  const sources = await retrieve(searchQuery);

  return {
    sources,
    searchQuery,
    llmMessages: [
      { role: "system", content: SYSTEM_PROMPT },
      // Aucun tour `assistant` contrôlé par le client n'est passé au modèle :
      // l'historique est rapporté en transcription citée dans ce message.
      { role: "user", content: buildUserMessage(question, sources, borne) },
    ],
  };
}
