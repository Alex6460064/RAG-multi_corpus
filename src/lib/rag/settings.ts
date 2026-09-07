import { Settings, SentenceSplitter } from "llamaindex";
import { OpenAI, OpenAIEmbedding } from "@llamaindex/openai";
import { config } from "@/lib/config";

let initialised = false;

/**
 * Configure LlamaIndex (LLM, embeddings, découpe). Idempotent.
 * Appelé par la route API et par le script d'indexation.
 */
export function initSettings(): void {
  if (initialised) return;

  if (!config.openaiApiKey) {
    throw new Error(
      "OPENAI_API_KEY manquante. En local : la renseigner dans .env.local. " +
        "Sur Vercel : l'ajouter aux variables d'environnement du projet.",
    );
  }

  Settings.llm = new OpenAI({
    apiKey: config.openaiApiKey,
    model: config.model,
    // Garde-fou coût et durée : les réponses attendues (concises, règle 6 du
    // prompt) tiennent largement dedans ; sans plafond, le défaut du modèle
    // (16 384 tokens) peut occuper l'instance jusqu'à maxDuration.
    maxTokens: 1024,
  });
  Settings.embedModel = new OpenAIEmbedding({
    apiKey: config.openaiApiKey,
    model: config.embeddingModel,
  });
  Settings.nodeParser = new SentenceSplitter({
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
  });

  initialised = true;
}
