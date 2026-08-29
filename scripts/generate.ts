/**
 * Indexation : lit les documents de `data/`, les découpe, calcule les
 * embeddings et persiste l'index vectoriel dans `storage/`.
 *
 *   npm run generate
 *
 * Exécuté aussi au build Vercel (`npm run generate && npm run build`).
 * Nécessite OPENAI_API_KEY (via .env.local en local, variables d'env sur Vercel).
 */
import { existsSync } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { VectorStoreIndex, storageContextFromDefaults } from "llamaindex";
import { SimpleDirectoryReader } from "@llamaindex/readers/directory";
import { config, DATA_DIR, STORAGE_DIR } from "@/lib/config";
import { initSettings } from "@/lib/rag/settings";

async function main(): Promise<void> {
  initSettings();

  const dataDir = path.join(process.cwd(), DATA_DIR);
  const persistDir = path.join(process.cwd(), STORAGE_DIR);

  if (!existsSync(dataDir)) {
    throw new Error(`Dossier de données introuvable : ${dataDir}`);
  }
  const entries = (await readdir(dataDir)).filter((f) => !f.startsWith("."));
  if (entries.length === 0) {
    throw new Error(
      `Aucun document dans ${dataDir}. Déposer les fichiers du corpus avant l'indexation.`,
    );
  }

  console.log(`Lecture de ${dataDir} (${entries.length} entrée(s))…`);
  const documents = await new SimpleDirectoryReader().loadData({
    directoryPath: dataDir,
  });
  console.log(`${documents.length} document(s) chargé(s).`);

  if (existsSync(persistDir)) {
    console.log(`Suppression de l'index existant : ${persistDir}`);
    await rm(persistDir, { recursive: true, force: true });
  }

  const storageContext = await storageContextFromDefaults({ persistDir });
  await VectorStoreIndex.fromDocuments(documents, { storageContext });

  console.log(
    `Index écrit dans ${persistDir} ` +
      `(chunk ${config.chunkSize}/${config.chunkOverlap}, embeddings ${config.embeddingModel}).`,
  );
}

main().catch((err: unknown) => {
  console.error("Échec de l'indexation :", (err as Error).message);
  process.exit(1);
});
