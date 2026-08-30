# Évaluation qualité du moteur RAG

Avant de partager un lien de démo (CLAUDE.md), on vérifie les réponses du moteur
sur un jeu de questions types, **corpus par corpus**.

## Lancer

```bash
git checkout corpus/nis2
npm run generate                 # l'index doit refléter data/ de cette branche
npm run eval                     # corpus déduit de la branche corpus/*
npm run eval -- --corpus=nis2    # ou explicitement
npm run eval -- --dry-run        # valide le jeu de questions, aucun appel LLM
```

`npm run eval` fait de **vrais appels LLM** (embeddings + génération). Prérequis :
index présent (`npm run generate`) et `OPENAI_API_KEY`.

## Jeu de questions

`eval/questions.<corpus>.json` — versionné sur `main`, propagé aux branches par
`merge` comme le reste du moteur.

| Champ | Rôle |
|---|---|
| `id` | identifiant unique dans le fichier |
| `question` *ou* `turns` | question unique, ou séquence de tours (l'éval porte sur la réponse au dernier — teste la reformulation d'un suivi) |
| `type` | `nominal` \| `refus` \| `ambigu` \| `suivi` |
| `expectedSource` | libellé lisible de la source attendue (rapport seulement) |
| `expectContains` | sous-chaînes qui doivent apparaître dans la réponse |
| `expectRefusal` | la réponse doit être un refus explicite |

## Ce qui est vérifié automatiquement

Contrôles **conservateurs** (précision élevée, pas d'exhaustivité) :

- **citation présente** : la réponse mentionne un article / une section / un nom de
  document du corpus ;
- **refus présent** sur les questions `refus` / `expectRefusal` : la réponse
  contient la formule imposée par le prompt système
  (« …ne contient pas cette information ») ;
- **sous-chaînes attendues** (`expectContains`).

Verdicts : `OK`, `ECHEC` (bloquant, code de sortie ≠ 0), `MANUEL` (questions
`ambigu` — à relire). Le détail complet de chaque réponse et les extraits récupérés
sont écrits dans `eval/<corpus>.results.json` (git-ignoré) — **à relire**, les
contrôles automatiques ne remplacent pas la lecture.

## Après un changement du moteur

Tout changement du moteur de récupération (chunking, embeddings, prompt système,
top-k, seuil) doit être ré-évalué sur les **trois** corpus, pas seulement celui
testé.
