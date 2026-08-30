# Moteur RAG multi-corpus

Un seul moteur d'application **RAG** (Retrieval-Augmented Generation), décliné sur **trois cas d'usage
métier réels** — un projet vitrine qui montre une logique d'architecture, pas trois démos isolées.

| Corpus | Sujet | Cible |
|---|---|---|
| **NIS2** | Conformité cyber : directive (UE) 2022/2555, loi française de transposition, guides ANSSI | Dirigeant / RSSI de PME nouvellement soumis à NIS2 |
| **PLU d'Anglet** | Plan Local d'Urbanisme : zonage et règles de construction | Particulier, artisan ou architecte du Pays Basque |
| **Convention Syntec** | Convention collective IDCC 1486 : préavis, forfait jours, classifications | Salarié ou RH d'ESN |

Chaque assistant répond en langage naturel **avec citation de l'article source**, et affiche un bandeau
rappelant sa nature démonstrative.

> ⚠️ **Non-conseil** — Ces assistants ont un but démonstratif. Ils ne remplacent pas un avis d'expert
> ou juridique. Chaque corpus a une date d'arrêt : vérifier la version en vigueur avant toute décision.

---

## Architecture

Un dépôt, un moteur partagé, trois branches de contenu, trois déploiements Vercel indépendants.

```
main                     → code de l'application (moteur RAG partagé)
├── corpus/nis2          → data/ : textes NIS2 + guides ANSSI
├── corpus/plu-anglet    → data/ : PLU d'Anglet
└── corpus/syntec        → data/ : convention Syntec (IDCC 1486)
```

- La branche **`main`** porte **tout le code** : interface de chat, logique de récupération, configuration.
- Chaque branche **`corpus/*`** ne contient que ses documents sources dans `data/`.
- Le moteur évolue sur `main`, puis se propage aux branches de contenu par `git merge main`.
  **La logique n'est jamais réécrite trois fois.**
- Chaque branche est connectée à son propre projet Vercel → une URL publique et une clé API par corpus.

---

## Stack

- [Next.js](https://nextjs.org/) 16 (App Router) + TypeScript strict + Tailwind CSS 4
- [LlamaIndex.TS](https://ts.llamaindex.ai/) — **indexation et récupération uniquement** (découpe, embeddings, index vectoriel, retriever)
- Génération + streaming : route API Next.js, flux NDJSON maison (aucune dépendance UI tierce)
- [`react-markdown`](https://github.com/remarkjs/react-markdown) pour le rendu des réponses
- Déploiement : [Vercel](https://vercel.com/) (un projet par branche)
- LLM : OpenAI (`gpt-4o-mini`) via clé API en variable d'environnement ; embeddings `text-embedding-3-small`

> **Décision technique.** Le projet a d'abord été scaffodé avec `create-llama`. Sa version courante
> impose un serveur `@llamaindex/server` non adapté à un déploiement Vercel par branche, et son mode
> `eject` produit du code cassé (dépendances désynchronisées de leurs propres plages de versions). Le
> moteur a donc été monté directement sur `create-next-app` + `LlamaIndex.TS`, à périmètre maîtrisé.
> `create-llama` reste la référence d'inspiration (licence MIT).

---

## Mise en route (développement)

```bash
# 1. Cloner et se placer sur la branche du corpus voulu
git clone https://github.com/Alex6460064/RAG-multi_corpus.git
cd RAG-multi_corpus
git checkout corpus/nis2

# 2. Installer
npm install

# 3. Configurer la clé API
cp .env.example .env.local   # puis renseigner OPENAI_API_KEY (plafond de dépense conseillé)

# 4. Générer l'index vectoriel à partir de data/
npm run generate

# 5. Lancer en local
npm run dev
```

Scripts : `dev`, `build`, `start`, `generate`, `lint`, `typecheck`.

### Déploiement Vercel

Un projet Vercel par branche, **tous connectés au même dépôt**. La configuration partagée est dans
[`vercel.json`](./vercel.json) (sur `main`, propagée par `merge`) :

- `buildCommand` : `npm run generate && npm run build` — l'index (`storage/`) est régénéré à chaque
  build, jamais commité. `next.config.ts` force son inclusion dans la fonction serverless
  (`outputFileTracingIncludes`).
- `ignoreCommand` : chaque projet ne builde que **sa** branche. Le projet lit la variable
  `CORPUS_BRANCH` (ex. `corpus/nis2`) et ignore tout commit sur une autre `ref` — sans cela, les trois
  projets déploieraient les trois branches.

Variables à définir **par projet** (réglages Vercel) :

| Variable | Rôle |
|---|---|
| `OPENAI_API_KEY` | clé du corpus (plafond de dépense conseillé) — utilisée au build (embeddings) et au runtime |
| `CORPUS_BRANCH` | branche de ce projet, ex. `corpus/nis2` — pilote l'`ignoreCommand` |
| `NEXT_PUBLIC_CORPUS_*` | affichage propre au corpus (nom, date d'arrêt, source, questions d'exemple) — voir le README de branche et `.env.example` |

Réglage Git du projet : **Production Branch** = la branche `corpus/*` correspondante.

---

## Sources des corpus

Tous les corpus sont constitués de **textes officiels et publics**. Détail des sources, dates d'arrêt
et points de vigilance par corpus : voir [`CONTEXTE.md`](./CONTEXTE.md) et le README propre à chaque
branche `corpus/*`.

- **NIS2** — EUR-Lex (directive 2022/2555), cyber.gouv.fr / ANSSI (guides). La loi française de transposition n'est pas promulguée à ce jour : elle sera ajoutée au corpus dès sa publication.
- **PLU Anglet** — Géoportail de l'Urbanisme, portail géomatique Communauté Pays Basque
- **Syntec** — Légifrance (IDCC 1486, brochure 3018) et avenants en vigueur

---

## Crédits

Moteur RAG construit avec [LlamaIndex.TS](https://ts.llamaindex.ai/) (MIT), sur une base
[create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app). Inspiré de
[create-llama](https://github.com/run-llama/create-llama) (LlamaIndex, MIT).
