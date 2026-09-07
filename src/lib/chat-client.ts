import { messageDe } from "@/lib/errors";
import type { ChatMessage, ChatStreamEvent } from "@/lib/chat-protocol";
import type { SourceChunk } from "@/lib/rag/retrieve";

export interface ChatStreamHandlers {
  onSources: (sources: SourceChunk[]) => void;
  onDelta: (text: string) => void;
  onError: (message: string) => void;
}

/** Le flux s'est arrêté sans événement de terminaison : réponse partielle. */
const MESSAGE_INTERROMPU =
  "Réponse interrompue avant la fin (connexion coupée ou délai dépassé). La réponse affichée est incomplète.";

/** Le flux s'est terminé normalement, mais sans le moindre texte. */
const MESSAGE_VIDE =
  "Le modèle n'a renvoyé aucune réponse. Reformulez la question ou réessayez.";

/**
 * Envoie l'historique à `POST /api/chat` et consomme le flux NDJSON.
 *
 * Ne résout proprement qu'après une terminaison explicite (`done` ou `error`).
 * Un corps coupé avant `done` (dépassement de `maxDuration`, réseau perdu) ou
 * une réponse sans aucun delta remontent par `onError` : sans ça une réponse
 * tronquée ou vide serait présentée comme aboutie, puis réinjectée en
 * historique au tour suivant.
 */
export async function streamChat(
  messages: ChatMessage[],
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!res.ok || !res.body) {
    let message = `Erreur serveur (${res.status}).`;
    try {
      const data: unknown = await res.json();
      if (data && typeof data === "object" && "error" in data) {
        message = String((data as { error: unknown }).error);
      }
    } catch {
      // corps non-JSON : on garde le message générique
    }
    handlers.onError(message);
    return;
  }

  let termine = false;
  let recu = false;
  let enErreur = false;
  const suivis: ChatStreamHandlers = {
    onSources: handlers.onSources,
    onDelta: (text) => {
      if (text !== "") recu = true;
      handlers.onDelta(text);
    },
    onError: (message) => {
      enErreur = true;
      handlers.onError(message);
    },
  };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!termine) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while (!termine && (newlineIdx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);
      if (line) termine = dispatch(line, suivis);
    }
  }
  if (!termine && buffer.trim()) termine = dispatch(buffer.trim(), suivis);

  // Une terminaison explicite fait sortir de la boucle sans vider le corps :
  // sans cette annulation, la connexion resterait ouverte. Sans effet quand le
  // flux a déjà été lu jusqu'au bout.
  try {
    await reader.cancel();
  } catch (err) {
    console.warn("Annulation du flux :", messageDe(err));
  }

  if (!termine) {
    handlers.onError(MESSAGE_INTERROMPU);
    return;
  }
  if (!enErreur && !recu) handlers.onError(MESSAGE_VIDE);
}

/** Traite une ligne NDJSON. Renvoie `true` si l'événement termine le flux. */
function dispatch(line: string, handlers: ChatStreamHandlers): boolean {
  let event: ChatStreamEvent;
  try {
    event = JSON.parse(line) as ChatStreamEvent;
  } catch {
    return false;
  }
  switch (event.type) {
    case "sources":
      handlers.onSources(event.sources);
      break;
    case "delta":
      handlers.onDelta(event.text);
      break;
    case "error":
      handlers.onError(event.message);
      return true;
    case "done":
      return true;
  }
  return false;
}
