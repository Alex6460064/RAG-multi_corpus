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
 * Fenêtre d'historique réellement envoyée au modèle : les messages les plus
 * récents, bornés en nombre puis en taille cumulée.
 *
 * Les deux bornes tronquent, elles ne rejettent pas. Rejeter sur la taille
 * bloquerait définitivement une conversation longue : le client renvoie le même
 * historique à chaque tour, et le tour en échec ne s'y ajoute pas — la fenêtre
 * ne redescendrait donc jamais sous le plafond, seul un rechargement de page en
 * sortirait. Tronquer borne le coût aussi sûrement, sans cul-de-sac.
 */
export function borneHistorique(history: ChatMessage[]): ChatMessage[] {
  const recents = history.slice(-config.maxHistoryMessages);
  const gardes: ChatMessage[] = [];
  let total = 0;
  for (let i = recents.length - 1; i >= 0; i--) {
    total += recents[i].content.length;
    if (total > config.maxTotalChars) break;
    gardes.unshift(recents[i]);
  }
  return gardes;
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
