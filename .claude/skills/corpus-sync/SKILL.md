---
name: corpus-sync
description: >-
  Propage l'etat de main vers les trois branches de contenu (corpus/nis2,
  corpus/plu-anglet, corpus/syntec) par git merge, dans l'ordre, avec un rapport
  par branche. Utiliser apres un commit du moteur sur main. N'appelle jamais
  create-llama, npm run generate ni un build.
disable-model-invocation: true
---

# corpus-sync — propager le moteur vers les branches de contenu

Encapsule le workflow multi-branches de `CLAUDE.md` : le moteur evolue sur `main`,
puis se propage aux branches `corpus/*` par `git merge main`. Jamais de logique
reecrite dans une branche.

## Pre-requis (verifier avant de commencer)

1. Branche courante = `main`. Sinon : s'arreter et le signaler.
2. Arbre de travail propre : `git status --porcelain` vide. Sinon : s'arreter,
   lister les fichiers en attente, demander quoi faire.
3. Le travail a propager est **deja commite** sur `main`. Ne rien committer ici.
4. Noter le SHA courant de `main` : `git rev-parse --short HEAD`.

## Procedure

Pour chaque branche, dans cet ordre — `corpus/nis2`, puis `corpus/plu-anglet`,
puis `corpus/syntec` :

1. `git checkout <branche>`
2. `git merge --no-ff main -m "merge: propage le moteur (main <sha>)"`
3. **Si conflit** :
   - Conflit dans `data/` uniquement : anormal (le merge de `main` ne devrait pas
     toucher `data/`). S'arreter, decrire, ne rien resoudre a l'aveugle.
   - Conflit dans du code applicatif : resoudre en gardant la version de `main`
     (`git checkout --theirs <fichier>` puis `git add`), sauf indication contraire.
     Une branche `corpus/*` ne doit pas avoir de version divergente du code.
   - Puis `git merge --continue`.
4. `git diff --stat main..<branche>` : verifier que la seule difference restante
   est le contenu de `data/` propre a ce corpus. Toute autre difference = signal a
   remonter.
5. Verifier qu'aucun marqueur de conflit ne subsiste : `git grep -n "^<<<<<<<\|^>>>>>>>"` .

Revenir sur `main` a la fin : `git checkout main`.

## Rapport (obligatoire)

Tableau : branche | resultat (fast-forward / merge / conflit resolu / bloque) |
fichiers hors data/ touches | action requise.

Ne pas `git push` sauf demande explicite de l'utilisateur. Rappeler que chaque
branche redeclenche son deploiement Vercel au push.
