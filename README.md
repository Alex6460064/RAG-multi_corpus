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

- Base de code : [run-llama/create-llama](https://github.com/run-llama/create-llama) (MIT) — `npx create-llama@latest`
- [Next.js](https://nextjs.org/) (App Router) + TypeScript
- [LlamaIndex.TS](https://ts.llamaindex.ai/) — configuration RAG standard (pas d'agents multiples en V1)
- Déploiement : [Vercel](https://vercel.com/) (un projet par branche)
- LLM : fournisseur configuré via clé API en variable d'environnement

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
cp .env.example .env.local   # puis renseigner la clé du fournisseur LLM

# 4. Générer l'index vectoriel à partir de data/
npm run generate

# 5. Lancer en local
npm run dev
```

### Déploiement Vercel

Un projet Vercel par branche, avec la commande de build :

```
npm run generate && npm run build
```

L'index est régénéré à chaque build (il n'est pas commité).

---

## Sources des corpus

Tous les corpus sont constitués de **textes officiels et publics**. Détail des sources, dates d'arrêt
et points de vigilance par corpus : voir [`CONTEXTE.md`](./CONTEXTE.md) et le README propre à chaque
branche `corpus/*`.

- **NIS2** — EUR-Lex (directive 2022/2555), Légifrance / JORF (loi du 17/07/2026), cyber.gouv.fr (ANSSI)
- **PLU Anglet** — Géoportail de l'Urbanisme, portail géomatique Communauté Pays Basque
- **Syntec** — Légifrance (IDCC 1486, brochure 3018) et avenants en vigueur

---

## Crédits

Application dérivée de [create-llama](https://github.com/run-llama/create-llama) (LlamaIndex, licence MIT).
