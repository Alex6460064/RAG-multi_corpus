/**
 * Extraction du message d'une valeur levée.
 *
 * Un `catch` reçoit `unknown` : rien ne garantit une `Error`. Un
 * `(err as Error).message` sur une chaîne, un objet nu ou `undefined` rend
 * `undefined`, ce qui fait disparaître le bandeau d'erreur côté client
 * (`{error && …}`) — l'utilisateur ne voit alors *rien*, pas même le mot
 * « undefined ». Ce helper garantit une chaîne non vide.
 *
 * Module pur (aucun import Node) : utilisable côté serveur comme côté client.
 */
export function messageDe(err: unknown, fallback = "Erreur inattendue."): string {
  if (err instanceof Error && err.message !== "") return err.message;
  if (typeof err === "string" && err !== "") return err;
  return fallback;
}
