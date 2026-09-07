import { existsSync } from "node:fs";
import path from "node:path";
import { VectorStoreIndex, storageContextFromDefaults } from "llamaindex";
import { initSettings } from "./settings";

let indexPromise: Promise<VectorStoreIndex> | null = null;

/**
 * Charge l'index vectoriel persisté (`storage/`). Mémoïsé : chargé une fois
 * par instance de fonction serverless, réutilisé pour les requêtes suivantes.
 */
export function loadIndex(): Promise<VectorStoreIndex> {
  if (!indexPromise) {
    indexPromise = buildIndex().catch((err: unknown) => {
      // Ne pas mettre en cache un échec : la requête suivante réessaie.
      indexPromise = null;
      throw err;
    });
  }
  return indexPromise;
}

async function buildIndex(): Promise<VectorStoreIndex> {
  initSettings();

  // Chemin littéral : permet à Next de limiter le tracing du build à ce dossier.
  const persistDir = path.join(process.cwd(), "storage");
  if (!existsSync(persistDir)) {
    throw new Error(
      `Index introuvable dans "${persistDir}". Lancer \`npm run generate\` ` +
        "avant de démarrer l'application.",
    );
  }

  const storageContext = await storageContextFromDefaults({ persistDir });
  return VectorStoreIndex.init({ storageContext });
}
