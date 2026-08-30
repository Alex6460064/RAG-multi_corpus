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
2. Source chaque affirmation entre parenthèses, en combinant deux éléments :
   - toujours le repère de l'extrait utilisé, sous la forme « (Extrait N) » ;
   - dès qu'il figure dans l'extrait, l'identifiant précis de la source : numéro d'article, de section, d'avenant ou de considérant, intitulé de zone, d'annexe ou de titre, ou à défaut le nom du document.
   Exemples : « … (article 23, Extrait 2) », « … (règlement, zone UB, Extrait 1) », « … (guide d'hygiène informatique de l'ANSSI, Extrait 3) ». Aucune phrase porteuse d'information ne doit rester sans « (Extrait N) ».
3. Si le contexte ne permet pas de répondre, dis-le explicitement (« Le corpus fourni ne contient pas cette information ») et n'invente rien.
4. Si la question est ambiguë ou s'il manque un élément indispensable pour répondre précisément (zone d'urbanisme, catégorie professionnelle, type d'entité, période...), demande cette précision au lieu de deviner une interprétation, d'énumérer tous les cas, ou de refuser.
5. N'ajoute aucune connaissance générale extérieure au contexte.
6. Réponds en français, de manière concise et structurée.
7. En cas de sujet réglementaire ou juridique, rappelle brièvement que la réponse est indicative et ne remplace pas un avis d'expert.`;

/** Nom de fichier → libellé lisible pour la citation (« 01-reglement.md » → « reglement »). */
function readableSource(fileName: string | null): string | null {
  if (!fileName) return null;
  const label = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+[-_\s]+/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return label.length > 0 ? label : null;
}

function formatChunk(chunk: SourceChunk, position: number): string {
  const label = readableSource(chunk.fileName);
  const page = chunk.page !== null ? `, p. ${chunk.page}` : "";
  const source = label ? ` — source : ${label}${page}` : "";
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
const CONDENSE_PROMPT = `Tu prépares une requête de recherche documentaire. À partir de l'historique et de la question de suivi, produis une question autonome, compréhensible sans l'historique, dans la même langue.

Règles :
- Reprends le sujet, le cadre et les termes clés de la question précédente ; ne remplace que ce que la question de suivi fait varier. « Et pour X ? », « Et en Y ? », « Et si Z ? » posent la même question que la précédente, en changeant une seule valeur.
- N'y réponds pas. N'ajoute aucune information absente de l'échange.
- Ne renvoie la question de suivi telle quelle que si elle est déjà autonome : sujet et verbe explicites, aucune référence implicite à l'échange.
- Renvoie uniquement la question, sans préfixe ni commentaire.

Exemple :
Historique — Utilisateur : Sous quel délai une entité essentielle doit-elle notifier un incident ?
Question de suivi : Et pour une entité importante ?
Question autonome : Sous quel délai une entité importante doit-elle notifier un incident ?

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
