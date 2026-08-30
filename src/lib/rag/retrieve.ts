import { MetadataMode, type NodeWithScore } from "llamaindex";
import { config } from "@/lib/config";
import { loadIndex } from "./index";

/**
 * Un extrait de document récupéré, transmis au client pour citation.
 *
 * Ne contient que ce que l'UI affiche : ni `metadata` brut ni `id` interne du
 * nœud — tous deux portent le chemin absolu du fichier sur la machine de build.
 */
export interface SourceChunk {
  /** Identifiant d'affichage (clé de liste côté client). Pas un chemin. */
  id: string;
  text: string;
  score: number | null;
  /** Nom du fichier source (basename), si connu. */
  fileName: string | null;
  /** Numéro ou libellé de page, si le document en a. */
  page: string | number | null;
}

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
