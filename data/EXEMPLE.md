# Document d'exemple — branche `main`

Ce fichier est un **placeholder** présent uniquement sur `main` pour permettre
de lancer `npm run generate` et de tester le moteur de bout en bout.

Les branches de contenu (`corpus/nis2`, `corpus/plu-anglet`, `corpus/syntec`)
remplacent le contenu de `data/` par leurs documents sources réels.

## Article 1 — Objet

Le présent document sert de corpus minimal de démonstration. Il n'a aucune
valeur normative.

## Article 2 — Fonctionnement du moteur

Le moteur découpe les documents de `data/` en fragments, calcule leurs
embeddings, puis récupère les fragments les plus proches d'une question pour
construire la réponse. Chaque réponse cite les fragments utilisés.

## Article 3 — Date d'arrêt

La date d'arrêt du corpus est affichée dans l'en-tête de l'application et
définie par la variable d'environnement `NEXT_PUBLIC_CORPUS_CUTOFF`.
