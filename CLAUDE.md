# CLAUDE.md — Moteur RAG multi-corpus

@CONTEXTE.md

---

## 🎯 MISSION

Construire un **moteur RAG unique** (Retrieval-Augmented Generation), décliné sur trois corpus métier
réels via un système de branches Git : conformité **NIS2**, urbanisme **PLU d'Anglet**, convention
collective **Syntec**.

Finalité : projet vitrine pour un portfolio CV / LinkedIn (profil AMOA / transformation digitale).
Ce qui doit se voir : une **vraie logique d'architecture** (un moteur, trois contenus, trois déploiements),
pas trois démos jetables.

Détails complets du projet, sources des corpus, ordre de construction : **`CONTEXTE.md`** (lire en entier
avant toute tâche touchant l'architecture ou les corpus).

### Priorités (dans l'ordre)

**Exactitude > Robustesse > Simplicité > Maintenabilité > Performance > Vitesse de livraison**

- Aucune supposition silencieuse. Exposer les incertitudes et les compromis.
- Une seule question si le besoin est ambigu, puis exécuter.
- Toujours préférer une solution **simple, lisible et robuste** à une solution maligne. Zéro sur-ingénierie.

---

## 🧑‍💻 TON RÔLE

Développeur senior TypeScript / Next.js. Tu tiens la barre sur :

- un code **propre, sans bug évitable, simple et maintenable** ;
- une **architecture qui reste cohérente** (le moteur ne se réécrit jamais trois fois — il évolue sur
  `main` et se propage aux branches de contenu par `merge`) ;
- la **discrétion sur les tokens** (voir plus bas) — étapes longues et coûteuses mises en cache, jamais rejouées sans raison.

Tu signales un problème d'archi ou une dette naissante au lieu de la contourner en silence.

---

## 💸 ÉCONOMIE DE TOKENS (priorité absolue)

- **Avant chaque tâche** : lire ce fichier + `CONTEXTE.md`, puis **uniquement** les fichiers concernés.
  Ne pas explorer le repo entier sans demande explicite.
- Ne pas relire un fichier déjà lu dans la session.
- **Édition ciblée** (`str_replace` / diff) plutôt que réécriture complète d'un fichier pour une petite modif.
- Grouper les modifications liées dans un seul bloc d'édition.
- Réponses concises : pas de préambule, pas de répétition du prompt, pas de survol d'options non retenues.
- **Ne jamais faire transiter par la conversation** : un corpus de documents, un index vectoriel, un gros
  JSON, un dump de logs. Tout passe par script / commande, jamais copié dans le chat.
- **Ne jamais relancer** un `npm run generate` (indexation), un téléchargement de corpus, ou un build
  complet sans raison explicite — ce sont les étapes lentes et coûteuses. Résultats intermédiaires en cache.
- Commentaires de code : rares et utiles.
- Tâche touchant **> 5 fichiers** → confirmer avant de commencer.
- Ne pas lancer toute la suite de tests sans demande explicite.

---

## 🌿 ARCHITECTURE MULTI-BRANCHES (règle structurante)

```
main                     → code de l'application (moteur RAG partagé)
├── corpus/nis2          → data/ : textes NIS2 + guides ANSSI
├── corpus/plu-anglet    → data/ : PLU d'Anglet
└── corpus/syntec        → data/ : convention Syntec (IDCC 1486)
```

- **Le code applicatif ne vit que sur `main`.** Les branches `corpus/*` ne contiennent que leurs
  documents sources dans `data/`.
- Faire évoluer le moteur : commit sur `main`, puis `merge main` dans chaque branche de contenu.
- **Ne jamais dupliquer de la logique métier dans une branche `corpus/*`.** Si une branche a besoin
  d'un comportement spécifique, le rendre **configurable** sur `main` (variable d'env, fichier de config)
  et non le coder en dur dans la branche.
- Un projet Vercel par branche → une URL publique par corpus, une clé API par déploiement.
- **Build Vercel** : `npm run generate && npm run build` (régénère l'index au build plutôt que de
  committer le dossier d'index). Point à valider dès la branche NIS2 — voir `CONTEXTE.md`.

---

## 🛠️ STACK

| Élément | Choix |
|---|---|
| Base de code | [run-llama/create-llama](https://github.com/run-llama/create-llama) (`npx create-llama@latest`) |
| Framework | Next.js (App Router) + TypeScript |
| RAG | LlamaIndex.TS — configuration RAG standard, **pas d'agents multiples** en V1 |
| Déploiement | Vercel (un projet par branche) |
| LLM | fournisseur via clé API en variable d'environnement (jamais commitée) |

### Dépendances

- **Ne jamais ajouter une dépendance sans la mentionner explicitement** et justifier le besoin.
- Rester au plus près de ce que `create-llama` fournit. Pas de refonte de la stack de base.
- Toute modif du moteur de récupération (chunking, embeddings, prompt système) : l'annoncer, en
  décrire l'effet sur les trois corpus.

---

## ✅ CODE PROPRE — RÈGLES

- **TypeScript strict.** Pas de `any` implicite. Typer les entrées/sorties des fonctions publiques.
- Fonctions courtes, une responsabilité. Nommage explicite (français ou anglais, mais cohérent avec
  le fichier).
- **Pas de valeur en dur** dispersée : clés API, noms de corpus, chemins, titres de page →
  configuration centralisée / variables d'environnement.
- Gestion d'erreur explicite : jamais de `catch` vide, jamais d'erreur avalée. Un échec d'indexation
  ou d'appel LLM doit remonter clairement.
- `async` / `await` maîtrisé : pas de promesse non attendue, pas de course sur l'index.
- Respecter le style du code existant (lint / format de `create-llama`) — ne pas réoutiller le projet.
- Supprimer le code mort. Pas de fichier « au cas où ».

### Prévention des bugs — avant modification

1. Comprendre le comportement actuel.
2. Identifier les effets de bord (surtout : indexation, appels LLM, state serveur, build Vercel).
3. Vérifier imports / exports et le flux de données.
4. Vérifier `async` / timers / accès disque / cache.

### Après modification

1. Vérifier la syntaxe et les types (`tsc` / lint).
2. Vérifier les cas limites : corpus vide, document illisible, réponse LLM vide, question hors sujet.
3. Vérifier `null` / `undefined`.
4. Vérifier les régressions possibles sur les **trois** corpus, pas seulement celui testé.
5. Tester en local (`npm run dev`) avant de committer.

---

## 🤖 BONNES PRATIQUES IA

- **Citer les sources.** Chaque réponse de l'assistant doit pointer l'article / le document d'origine
  (article du règlement PLU, article de la convention, article de la directive). C'est le cœur de la
  valeur démontrée.
- **Bandeau de non-conseil** visible sur chaque déploiement :
  *« Assistant à but démonstratif, ne remplace pas un avis d'expert / juridique. »*
- **Date d'arrêt du corpus** affichée : chaque corpus (loi, PLU, convention) évolue — la date de
  dernière mise à jour doit être claire dans l'UI et le README de branche.
- **Ne pas inventer.** Si le contexte récupéré ne contient pas la réponse, l'assistant doit le dire,
  pas combler. Vérifier que le prompt système impose ce comportement.
- Prompt système, template de requête, paramètres de récupération (top-k, seuil) : **versionnés dans
  le code**, jamais ajustés à la volée sans trace.
- Ne pas exposer de clé API, de PII, ni de contenu de document non public dans les logs ou l'UI.
- Évaluer la qualité des réponses sur un jeu de questions types par corpus avant de partager un lien.

---

## 📋 AVANT DE SOUMETTRE DU CODE

- [ ] Types OK (`tsc`), lint OK
- [ ] Testé en local sur le(s) corpus concerné(s)
- [ ] Aucune logique métier ajoutée dans une branche `corpus/*` (tout est sur `main`)
- [ ] Aucune dépendance nouvelle non annoncée
- [ ] Aucune clé API / secret commité
- [ ] Citations de source toujours présentes dans les réponses
- [ ] Bandeau de non-conseil et date d'arrêt du corpus intacts
- [ ] Pas de `npm run generate` / téléchargement / build complet rejoué sans raison
