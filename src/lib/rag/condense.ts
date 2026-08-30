import { Settings } from "llamaindex";
import type { ChatMessage } from "@/lib/chat-protocol";
import { buildCondensePrompt } from "./prompt";

/**
 * Reformule une question de suivi en question autonome pour la recherche.
 * Un échec (LLM indisponible, réponse vide ou aberrante) ne doit pas faire
 * échouer la requête : on retombe sur la question brute.
 *
 * La sortie n'alimente QUE la recherche vectorielle — la génération de la
 * réponse utilise toujours la question d'origine.
 */
export async function condenseQuestion(
  question: string,
  history: ChatMessage[],
): Promise<string> {
  try {
    const res = await Settings.llm.chat({
      messages: [
        {
          role: "user",
          // Les 3 derniers échanges suffisent à lever une ellipse ; inutile de
          // renvoyer toute la conversation dans le prompt de reformulation.
          content: buildCondensePrompt(question, history.slice(-6)),
        },
      ],
    });
    const text =
      typeof res.message.content === "string" ? res.message.content.trim() : "";
    // Une reformulation autonome reste courte : à peine plus longue que la
    // question d'origine (on y réinjecte juste le sujet). Si le modèle déraille
    // et renvoie un pavé, on garde la question brute plutôt qu'une requête
    // d'embedding hors sujet (voire trop longue pour l'embedding).
    const maxCondensed = question.length + 400;
    return text.length > 0 && text.length <= maxCondensed ? text : question;
  } catch (err) {
    console.warn(
      `Reformulation de la question échouée, recherche sur la question brute : ${
        (err as Error).message
      }`,
    );
    return question;
  }
}
