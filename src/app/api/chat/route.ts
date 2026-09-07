import type { NextRequest } from "next/server";
import { Settings } from "llamaindex";
import { config } from "@/lib/config";
import { initSettings } from "@/lib/rag/settings";
import { prepareAnswer } from "@/lib/rag/answer";
import { messageDe } from "@/lib/errors";
import type { PreparedAnswer } from "@/lib/rag/answer";
import type { ChatMessage, ChatStreamEvent } from "@/lib/chat-protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/**
 * Trace complète côté serveur (logs Vercel), message stable côté client.
 * L'endpoint est public : un message amont peut porter un chemin absolu du
 * serveur ou un fragment de clé API, qui n'ont rien à faire dans le navigateur.
 */
function logServeur(contexte: string, err: unknown): void {
  console.error(`[chat] ${contexte} : ${messageDe(err)}`);
}

const MESSAGE_ERREUR_SERVEUR =
  "Le service est momentanément indisponible. Réessayez dans un instant.";

function parseMessages(body: unknown): ChatMessage[] {
  if (!body || typeof body !== "object" || !("messages" in body)) return [];
  const raw = (body as { messages: unknown }).messages;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is ChatMessage =>
      !!m &&
      typeof m === "object" &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string",
  );
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Corps de requête JSON invalide.", 400);
  }

  const messages = parseMessages(body);

  // Garde-fou coût (endpoint public porteur de clé) : rejet immédiat d'un
  // tableau démesuré, avant toute somme, pour ne pas le parcourir.
  if (messages.length > config.maxMessages) {
    return jsonError("Historique trop long.", 413);
  }

  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user" && messages[i].content.trim()) {
      lastUserIdx = i;
      break;
    }
  }
  if (lastUserIdx === -1) {
    return jsonError("Aucune question fournie.", 400);
  }
  const question = messages[lastUserIdx].content.trim();

  // Garde-fou coût (endpoint public porteur de clé) : seule la question entrante
  // est rejetée si démesurée. L'historique est borné en nombre de tours plus bas
  // (le tronquer plutôt que rejeter évite de bloquer une conversation longue).
  if (question.length > config.maxQuestionChars) {
    return jsonError("Question trop longue.", 413);
  }

  try {
    initSettings();
  } catch (err) {
    // Message rédigé à la main dans settings.ts (rien de sensible) : on le garde.
    logServeur("Initialisation", err);
    return jsonError(messageDe(err, MESSAGE_ERREUR_SERVEUR), 500);
  }

  const history: ChatMessage[] = messages
    .slice(0, lastUserIdx)
    .map((m) => ({ role: m.role, content: m.content }));

  // Bornage de l'historique, reformulation, récupération et assemblage des
  // messages : même chemin que l'évaluation (src/lib/rag/answer.ts).
  let prepared: PreparedAnswer;
  try {
    prepared = await prepareAnswer(question, history);
  } catch (err) {
    logServeur("Récupération", err);
    return jsonError(MESSAGE_ERREUR_SERVEUR, 500);
  }
  const { sources, llmMessages } = prepared;

  const encoder = new TextEncoder();
  // Passe à true quand la connexion est coupée côté client (onglet fermé,
  // navigation) : le lecteur du flux est alors annulé. Sert à sortir de la
  // boucle de génération — donc à cesser de payer l'appel OpenAI — et à ne
  // plus écrire dans un contrôleur déjà fermé.
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) => {
        if (cancelled) return;
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      send({ type: "sources", sources });

      try {
        const chatStream = await Settings.llm.chat({
          messages: llmMessages,
          stream: true,
        });
        for await (const chunk of chatStream) {
          if (cancelled) break;
          if (chunk.delta) send({ type: "delta", text: chunk.delta });
        }
        send({ type: "done" });
      } catch (err) {
        logServeur("Génération", err);
        send({ type: "error", message: MESSAGE_ERREUR_SERVEUR });
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
