import type { NextRequest } from "next/server";
import { Settings } from "llamaindex";
import { initSettings } from "@/lib/rag/settings";
import { retrieve } from "@/lib/rag/retrieve";
import { SYSTEM_PROMPT, buildUserMessage } from "@/lib/rag/prompt";
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

  try {
    initSettings();
  } catch (err) {
    return jsonError((err as Error).message, 500);
  }

  let sources;
  try {
    sources = await retrieve(question);
  } catch (err) {
    return jsonError(`Échec de la récupération : ${(err as Error).message}`, 500);
  }

  const history = messages.slice(0, lastUserIdx).map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const llmMessages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...history,
    { role: "user" as const, content: buildUserMessage(question, sources) },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      send({ type: "sources", sources });

      try {
        const chatStream = await Settings.llm.chat({
          messages: llmMessages,
          stream: true,
        });
        for await (const chunk of chatStream) {
          if (chunk.delta) send({ type: "delta", text: chunk.delta });
        }
        send({ type: "done" });
      } catch (err) {
        send({ type: "error", message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
