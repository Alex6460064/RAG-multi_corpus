# Automatisations Claude Code

Outillage local pour tenir l'architecture multi-branches et les regles de `CLAUDE.md`.

## MCP servers — `.mcp.json`

| Server | Role |
|---|---|
| `context7` | Doc live de LlamaIndex.TS et Next.js (via `npx @upstash/context7-mcp`). |

> Vercel : deja fourni par le plugin `vercel` (MCP `plugin:vercel:vercel`, necessite auth). Pas de doublon ici.

## Hooks — `.claude/settings.json` + `.claude/hooks/`

| Hook | Evenement | Effet |
|---|---|---|
| `guard-corpus-branch.mjs` | PreToolUse `Edit\|Write\|MultiEdit\|NotebookEdit` | Sur une branche `corpus/*`, refuse toute edition hors `data/`, `.claude/`, `README.md`. Applique la frontiere multi-branches. |
| `guard-expensive-cmd.mjs` | PreToolUse `Bash` | Passe en `ask` sur `npm run generate`, `create-llama`, build complet, telechargement de corpus. |
| `typecheck-after-edit.mjs` | PostToolUse `Edit\|Write\|MultiEdit` | `tsc --noEmit` apres edition d'un `.ts/.tsx` ; bloque si l'erreur concerne le fichier edite. Inactif tant que le projet n'est pas scaffolde. |

Scripts en Node pur (`.mjs`), sans dependance, tolerants aux erreurs (jamais bloquants sur un environnement inattendu).

## Subagents — `.claude/agents/`

| Agent | Usage |
|---|---|
| `rag-eval` | Evalue les reponses du corpus courant (citations, refus, bandeau non-conseil, date d'arret) avant partage. |
| `merge-reviewer` | Revoit un `git merge` entre `main` et une branche `corpus/*` : frontiere respectee, pas de secret, pas de conflit. |

## Skills — `.claude/skills/`

| Skill | Invocation | Usage |
|---|---|---|
| `corpus-sync` | `/corpus-sync` (utilisateur seul) | Propage `main` vers les trois branches `corpus/*` par merge, dans l'ordre, avec rapport. |
| `rag-config-change` | automatique (Claude) | Checklist avant/apres modif du chunking, embeddings, prompt systeme, top-k. |
