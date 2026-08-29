import type { ChatMessage, ChatStreamEvent } from "@/lib/chat-protocol";
import type { SourceChunk } from "@/lib/rag/retrieve";

export interface ChatStreamHandlers {
  onSources: (sources: SourceChunk[]) => void;
  onDelta: (text: string) => void;
  onError: (message: string) => void;
}

/**
 * Envoie l'historique à `POST /api/chat` et consomme le flux NDJSON.
 * Résout quand le flux est terminé (`done`) ou interrompu (`signal`).
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

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);
      if (line) dispatch(line, handlers);
    }
  }
  if (buffer.trim()) dispatch(buffer.trim(), handlers);
}

function dispatch(line: string, handlers: ChatStreamHandlers): void {
  let event: ChatStreamEvent;
  try {
    event = JSON.parse(line) as ChatStreamEvent;
  } catch {
    return;
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
      break;
    case "done":
      break;
  }
}
