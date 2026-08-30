import type { NextRequest } from "next/server";
import { Settings } from "llamaindex";
import { config } from "@/lib/config";
import { initSettings } from "@/lib/rag/settings";
import { retrieve } from "@/lib/rag/retrieve";
import {
  SYSTEM_PROMPT,
  buildUserMessage,
  buildCondensePrompt,
} from "@/lib/rag/prompt";
import type { ChatMessage, ChatStreamEvent } from "@/lib/chat-protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

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

/**
 * Reformule une question de suivi en question autonome pour la recherche.
 * Un échec (LLM indisponible, réponse vide) ne doit pas faire échouer la requête :
 * on retombe sur la question brute.
 */
async function condenseQuestion(
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

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Corps de requête JSON invalide.", 400);
  }

  const messages = parseMessages(body);

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
    return jsonError((err as Error).message, 500);
  }

  const history: ChatMessage[] = messages
    .slice(0, lastUserIdx)
    .slice(-config.maxHistoryMessages)
    .map((m) => ({ role: m.role, content: m.content }));

  let sources;
  try {
    // Question de suivi elliptique : la reformuler en question autonome avant la
    // recherche, sinon l'embedding du fragment récupère des extraits hors sujet.
    const searchQuery =
      history.length > 0
        ? await condenseQuestion(question, history)
        : question;
    sources = await retrieve(searchQuery);
  } catch (err) {
    return jsonError(`Échec de la récupération : ${(err as Error).message}`, 500);
  }
  const llmMessages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...history,
    { role: "user" as const, content: buildUserMessage(question, sources) },
  ];

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
        send({ type: "error", message: (err as Error).message });
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
