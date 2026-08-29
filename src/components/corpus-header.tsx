import { uiConfig } from "@/lib/ui-config";

/** En-tête : nom du corpus, date d'arrêt, source des documents. */
export function CorpusHeader() {
  return (
    <header className="border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Assistant documentaire — {uiConfig.corpusName}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Réponses fondées sur le corpus, avec citation des sources.
        </p>
        <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500 dark:text-zinc-500">
          <div className="flex gap-1">
            <dt className="font-medium">Date d&apos;arrêt du corpus :</dt>
            <dd>{uiConfig.corpusCutoff}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="font-medium">Sources :</dt>
            <dd>{uiConfig.corpusSourceLabel}</dd>
          </div>
        </dl>
      </div>
    </header>
  );
}
