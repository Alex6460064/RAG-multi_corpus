"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SourceChunk } from "@/lib/rag/retrieve";
import { Sources } from "./sources";

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
  /** Réponse assistant encore en cours de streaming. */
  pending?: boolean;
}

export function Message({ turn }: { turn: ChatTurn }) {
  const isUser = turn.role === "user";

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "max-w-[85%] rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        }
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{turn.content}</p>
        ) : (
          <div className="markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {turn.content || (turn.pending ? "…" : "")}
            </ReactMarkdown>
          </div>
        )}

        {!isUser && turn.sources && turn.sources.length > 0 && (
          <Sources sources={turn.sources} />
        )}
      </div>
    </div>
  );
}
