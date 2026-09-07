import { MetadataMode, type NodeWithScore } from "llamaindex";
import { config } from "@/lib/config";
import type { SourceChunk } from "@/lib/chat-protocol";
import { loadIndex } from "./vector-index";

/** Récupère les `topK` extraits les plus proches de la question. */
export async function retrieve(query: string): Promise<SourceChunk[]> {
  const index = await loadIndex();
  const retriever = index.asRetriever({ similarityTopK: config.topK });
  const nodes = await retriever.retrieve({ query });
  return nodes.map(toSourceChunk);
}

function toSourceChunk(node: NodeWithScore, position: number): SourceChunk {
  const metadata: Record<string, unknown> = node.node.metadata ?? {};
  const fileNameValue = metadata.file_name ?? metadata.fileName;
  const pageValue = metadata.page_label ?? metadata.page_number;
  return {
    id: `extrait-${position + 1}`,
    text: node.node.getContent(MetadataMode.NONE),
    score: typeof node.score === "number" ? node.score : null,
    fileName: typeof fileNameValue === "string" ? fileNameValue : null,
    page:
      typeof pageValue === "string" || typeof pageValue === "number"
        ? pageValue
        : null,
  };
}
