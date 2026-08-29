---
name: rag-config-change
description: >-
  Checklist a suivre AVANT et APRES toute modification du moteur de recuperation :
  strategie de chunking, modele d'embeddings, prompt systeme, template de requete,
  top-k, seuil de similarite. Impose d'annoncer le changement et de decrire son
  effet sur les trois corpus. A consulter des qu'une tache touche a l'un de ces
  elements.
user-invocable: false
---

# rag-config-change — modifier le moteur de recuperation

`CLAUDE.md` : « Toute modif du moteur de recuperation (chunking, embeddings, prompt
systeme) : l'annoncer, en decrire l'effet sur les trois corpus. » Ces parametres
sont versionnes dans le code, jamais ajustes a la volee.

## Avant de modifier

1. **Localiser** la config concernee (fichier unique, centralise — pas de valeur
   dispersee). Si la valeur est en dur a plusieurs endroits : le signaler comme
   dette avant de continuer.
2. **Comprendre l'existant** : valeur actuelle, d'ou elle vient (defaut
   create-llama ? deja ajustee ?).
3. **Annoncer** dans la reponse : quel parametre, ancienne -> nouvelle valeur,
   pourquoi.
4. **Effet sur les trois corpus** — raisonner explicitement :
   - NIS2 : peu de documents, textes juridiques denses, articles courts.
   - PLU Anglet : PDF longs, reglement + zonage, structure heterogene.
   - Syntec : texte unique bien structure, articles + avenants.
   Un chunk plus grand aide Syntec mais peut noyer une citation precise dans NIS2 ;
   un top-k plus haut ameliore le rappel mais dilue la citation de source. Poser le
   compromis, ne pas le masquer.

## Apres modification

1. `tsc` / lint OK.
2. **Re-indexer** : `npm run generate` est necessaire si chunking ou embeddings ont
   change (le hook `guard-expensive-cmd` demandera confirmation — c'est voulu).
   Prompt systeme / top-k / seuil : pas de reindexation.
3. **Evaluer** avec l'agent `rag-eval` sur le corpus courant, puis rappeler que les
   deux autres corpus doivent etre re-evalues avant tout partage de lien.
4. **Propager** : le changement est sur `main`. Utiliser `/corpus-sync` pour le
   diffuser aux branches de contenu.
5. Verifier que le prompt systeme impose toujours : citer la source, refuser quand
   le contexte ne contient pas la reponse.

## Cas limites a re-tester

corpus vide, document illisible, reponse LLM vide, question hors sujet, question a
cheval sur deux articles.
