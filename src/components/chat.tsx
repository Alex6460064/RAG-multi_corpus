"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uiConfig } from "@/lib/ui-config";
import { streamChat } from "@/lib/chat-client";
import { messageDe } from "@/lib/errors";
import type { ChatMessage } from "@/lib/chat-protocol";
import { Message, type ChatTurn } from "./message";

let turnCounter = 0;
const nextId = () => `turn-${++turnCounter}`;

/**
 * Délai maximal d'une requête, en millisecondes : `maxDuration` de la route
 * (60 s) plus une marge. `fetch` n'impose aucun timeout sur un corps en
 * streaming — sans cette borne, un réseau qui se dégrade sans se couper fige
 * l'interface (champ et bouton désactivés) jusqu'au rechargement de la page.
 */
const DELAI_REQUETE_MS = 75_000;

/**
 * Nombre de messages d'historique envoyés au serveur. Reflète le défaut de
 * `RAG_MAX_HISTORY_MESSAGES` : au-delà, le serveur tronque de toute façon.
 * Sans cette borne, une conversation longue enfle indéfiniment et finit par
 * dépasser le plafond de taille de la route — définitivement, puisque le même
 * historique repart à chaque tour. La config serveur n'est pas importable ici :
 * elle porte la clé API.
 */
const MAX_MESSAGES_HISTORIQUE = 20;

/**
 * Historique envoyé au serveur : uniquement les paires (question, réponse)
 * abouties, bornées aux plus récentes. Une réponse vide ou en échec — et la
 * question qu'elle laisse sans réponse — sont exclues, sinon on présenterait un
 * tour raté comme complet au modèle.
 */
function buildHistory(turns: ChatTurn[]): ChatMessage[] {
  const history: ChatMessage[] = [];
  for (let i = 0; i < turns.length - 1; i++) {
    const q = turns[i];
    const a = turns[i + 1];
    if (
      q.role === "user" &&
      a.role === "assistant" &&
      !a.error &&
      a.content !== ""
    ) {
      history.push({ role: "user", content: q.content });
      history.push({ role: "assistant", content: a.content });
      i++;
    }
  }
  return history.slice(-MAX_MESSAGES_HISTORIQUE);
}

export function Chat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = turns[turns.length - 1];
    // Défilement forcé au moment de l'envoi (tour assistant vide en attente).
    // Pendant le streaming on ne suit que si l'utilisateur est déjà en bas —
    // sinon il peut remonter lire les messages précédents sans être ramené.
    const justSent =
      last?.role === "assistant" && last.content === "" && last.pending === true;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (justSent || nearBottom) el.scrollTo({ top: el.scrollHeight });
  }, [turns]);

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || busy) return;

      setError(null);
      setBusy(true);
      setInput("");

      const userTurn: ChatTurn = { id: nextId(), role: "user", content: trimmed };
      const assistantId = nextId();
      const assistantTurn: ChatTurn = {
        id: assistantId,
        role: "assistant",
        content: "",
        pending: true,
      };

      // Historique calculé avant d'ajouter le tour courant à l'état.
      const history = buildHistory(turns);

      setTurns((prev) => [...prev, userTurn, assistantTurn]);

      const patch = (fn: (t: ChatTurn) => ChatTurn) =>
        setTurns((prev) => prev.map((t) => (t.id === assistantId ? fn(t) : t)));

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DELAI_REQUETE_MS);

      try {
        await streamChat(
          [...history, { role: "user", content: trimmed }],
          {
            onSources: (sources) => patch((t) => ({ ...t, sources })),
            onDelta: (text) =>
              patch((t) => ({ ...t, content: t.content + text, pending: true })),
            onError: (message) => {
              setError(message);
              patch((t) => ({ ...t, error: true }));
            },
          },
          controller.signal,
        );
      } catch (err) {
        const aborted = err instanceof Error && err.name === "AbortError";
        setError(
          aborted
            ? "Délai dépassé : le serveur n'a pas répondu à temps. Réessayez."
            : messageDe(err),
        );
        patch((t) => ({ ...t, error: true }));
      } finally {
        clearTimeout(timer);
        patch((t) => ({ ...t, pending: false }));
        setBusy(false);
      }
    },
    [busy, turns],
  );

  const showStarters = turns.length === 0 && uiConfig.starterQuestions.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {turns.length === 0 && (
          <p className="text-center text-sm text-zinc-500">
            Posez une question sur « {uiConfig.corpusName} ».
          </p>
        )}
        {turns
          .filter((turn) => !(turn.error && turn.content === ""))
          .map((turn) => (
            <Message key={turn.id} turn={turn} />
          ))}

        {showStarters && (
          <ul className="mx-auto max-w-md space-y-2">
            {uiConfig.starterQuestions.map((q) => (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => void send(q)}
                  className="w-full rounded border border-zinc-200 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="px-4 pb-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="border-t border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Votre question…"
            disabled={busy}
            className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {busy ? "…" : "Envoyer"}
          </button>
        </div>
      </form>
    </div>
  );
}
