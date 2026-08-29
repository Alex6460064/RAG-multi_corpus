import { MetadataMode, type NodeWithScore } from "llamaindex";
import { config } from "@/lib/config";
import { loadIndex } from "./index";

/** Un extrait de document récupéré, transmis au client pour citation. */
export interface SourceChunk {
  id: string;
  text: string;
  score: number | null;
  /** Nom du fichier source, si connu. */
  fileName: string | null;
  /** Métadonnées brutes du nœud (page, en-tête de section, etc.). */
  metadata: Record<string, unknown>;
}

/** Récupère les `topK` extraits les plus proches de la question. */
export async function retrieve(query: string): Promise<SourceChunk[]> {
  const index = await loadIndex();
  const retriever = index.asRetriever({ similarityTopK: config.topK });
  const nodes = await retriever.retrieve({ query });
  return nodes.map(toSourceChunk);
}

function toSourceChunk(node: NodeWithScore): SourceChunk {
  const metadata: Record<string, unknown> = node.node.metadata ?? {};
  const fileNameValue = metadata.file_name ?? metadata.fileName ?? null;
  return {
    id: node.node.id_,
    text: node.node.getContent(MetadataMode.NONE),
    score: typeof node.score === "number" ? node.score : null,
    fileName: typeof fileNameValue === "string" ? fileNameValue : null,
    metadata,
  };
}
