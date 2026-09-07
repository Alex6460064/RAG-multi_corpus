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
import { messageDe } from "@/lib/errors";
import { initSettings } from "@/lib/rag/settings";

async function main(): Promise<void> {
  initSettings();

  const dataDir = path.join(process.cwd(), DATA_DIR);
  const persistDir = path.join(process.cwd(), STORAGE_DIR);

  if (!existsSync(dataDir)) {
    throw new Error(`Dossier de données introuvable : ${dataDir}`);
  }
  // Fichiers seulement : ce sont eux que l'on retrouve ensuite dans
  // `metadata.file_name` (un basename), seule base de comparaison fiable.
  const entries = (await readdir(dataDir, { withFileTypes: true }))
    .filter((e) => e.isFile() && !e.name.startsWith("."))
    .map((e) => e.name);
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

  // SimpleDirectoryReader avale les erreurs fichier par fichier (il logue puis
  // renvoie un tableau vide pour ce fichier). Sans ce contrôle, un PDF illisible
  // sur le builder Vercel donnerait un index amputé — voire vide, qui fait
  // échouer chaque requête au runtime — derrière un build vert.
  const lus = new Set(documents.map((d) => String(d.metadata.file_name ?? "")));
  const manquants = entries.filter((name) => !lus.has(name));

  if (documents.length === 0) {
    throw new Error(
      `Aucun document lisible dans ${dataDir}, alors que ${entries.length} fichier(s) y sont présents ` +
        `(${entries.join(", ")}). Voir les erreurs de lecture ci-dessus.`,
    );
  }
  if (manquants.length > 0) {
    throw new Error(
      `Corpus incomplet : ${manquants.length} fichier(s) sur ${entries.length} n'ont produit aucun document — ` +
        `${manquants.join(", ")}. Indexation interrompue : un corpus amputé est pire qu'un build en échec.`,
    );
  }

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
  console.error("Échec de l'indexation :", messageDe(err));
  process.exit(1);
});
