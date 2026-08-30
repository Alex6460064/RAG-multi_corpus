import { uiConfig } from "@/lib/ui-config";
import type { ChatMessage } from "@/lib/chat-protocol";
import type { SourceChunk } from "./retrieve";

/**
 * Prompt système — versionné dans le code, jamais ajusté à la volée.
 * Impose : réponse fondée uniquement sur le contexte, citation des sources,
 * refus explicite si l'information manque.
 */
export const SYSTEM_PROMPT = `Tu es un assistant documentaire spécialisé sur le corpus : « ${uiConfig.corpusName} ».

Règles impératives :
1. Réponds UNIQUEMENT à partir des extraits de contexte fournis dans le message de l'utilisateur.
2. Cite la source de chaque affirmation : numéro d'article, de section, ou nom du document, tel qu'il apparaît dans le contexte.
3. Si le contexte ne permet pas de répondre, dis-le explicitement (« Le corpus fourni ne contient pas cette information ») et n'invente rien.
4. N'ajoute aucune connaissance générale extérieure au contexte.
5. Réponds en français, de manière concise et structurée.
6. En cas de sujet réglementaire ou juridique, rappelle brièvement que la réponse est indicative et ne remplace pas un avis d'expert.`;

function formatChunk(chunk: SourceChunk, position: number): string {
  const source = chunk.fileName ? ` — source : ${chunk.fileName}` : "";
  return `[Extrait ${position}${source}]\n${chunk.text.trim()}`;
}

/** Assemble le message utilisateur : contexte récupéré + question. */
export function buildUserMessage(question: string, chunks: SourceChunk[]): string {
  const context =
    chunks.length > 0
      ? chunks.map((chunk, i) => formatChunk(chunk, i + 1)).join("\n\n---\n\n")
      : "Aucun extrait pertinent n'a été trouvé dans le corpus.";

  return `Contexte :\n\n${context}\n\n===\n\nQuestion : ${question}`;
}

/**
 * Prompt de reformulation — versionné dans le code, jamais ajusté à la volée.
 * Transforme une question de suivi elliptique (« et pour les cadres ? ») en
 * question autonome, pour que la recherche vectorielle porte sur le bon sujet.
 * N'est utilisé que lorsqu'il y a un historique de conversation.
 */
const CONDENSE_PROMPT = `À partir de l'historique de conversation et de la question de suivi, reformule la question de suivi en une question autonome, compréhensible sans l'historique, rédigée dans la même langue.
N'y réponds pas. N'ajoute aucune information absente de l'échange. Si la question est déjà autonome, renvoie-la telle quelle, sans autre texte.

Historique :
{history}

Question de suivi : {question}

Question autonome :`;

/** Assemble le prompt de reformulation à partir de l'historique et de la question. */
export function buildCondensePrompt(
  question: string,
  history: ChatMessage[],
): string {
  const transcript = history
    .map((m) => `${m.role === "user" ? "Utilisateur" : "Assistant"} : ${m.content}`)
    .join("\n");
  // Substitution en une seule passe : sinon un « {question} » présent dans le
  // contenu utilisateur (transcript inséré en premier) capterait le second
  // remplacement et viderait le vrai emplacement du template.
  return CONDENSE_PROMPT.replace(/\{history\}|\{question\}/g, (token) =>
    token === "{history}" ? transcript : question,
  );
}
