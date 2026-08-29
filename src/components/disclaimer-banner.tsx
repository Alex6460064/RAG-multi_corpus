import { DISCLAIMER } from "@/lib/ui-config";

/** Bandeau de non-conseil — présent sur chaque déploiement. */
export function DisclaimerBanner() {
  return (
    <div
      role="note"
      className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
    >
      ⚠️ {DISCLAIMER}
    </div>
  );
}
