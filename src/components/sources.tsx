"use client";

import { useState } from "react";
import type { SourceChunk } from "@/lib/rag/retrieve";

function chunkTitle(chunk: SourceChunk, position: number): string {
  const parts: string[] = [`Extrait ${position}`];
  if (chunk.fileName) parts.push(chunk.fileName);
  const page = chunk.metadata.page_label ?? chunk.metadata.page_number;
  if (typeof page === "string" || typeof page === "number") parts.push(`p. ${page}`);
  return parts.join(" · ");
}

/** Liste repliable des extraits ayant servi à la réponse. */
export function Sources({ sources }: { sources: SourceChunk[] }) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-2 text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        {open ? "Masquer" : "Afficher"} les {sources.length} source
        {sources.length > 1 ? "s" : ""}
      </button>

      {open && (
        <ol className="mt-2 space-y-2">
          {sources.map((chunk, i) => (
            <li
              key={chunk.id}
              className="rounded border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="font-medium text-zinc-700 dark:text-zinc-300">
                {chunkTitle(chunk, i + 1)}
                {chunk.score !== null && (
                  <span className="ml-2 font-normal text-zinc-400">
                    score {chunk.score.toFixed(3)}
                  </span>
                )}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                {chunk.text.length > 500
                  ? chunk.text.slice(0, 500) + "…"
                  : chunk.text}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
