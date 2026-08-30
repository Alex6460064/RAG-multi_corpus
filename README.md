# Assistant convention collective Syntec — branche `corpus/syntec`

Assistant RAG qui répond en langage naturel aux questions sur la **convention
collective Syntec** (IDCC 1486) — préavis, période d'essai, forfait jours,
grilles de classification ETAM et ingénieurs/cadres, indemnités. Chaque réponse
**cite l'article d'origine**.

> ⚠️ **Non-conseil** — Assistant à but démonstratif. Ne remplace pas un avis
> d'expert ou juridique. Une convention collective évolue par avenants :
> vérifier la version en vigueur avant toute décision RH.

Cette branche ne contient que le corpus (`data/`). Le moteur, l'architecture
multi-branches et la stack sont décrits dans le [README de `main`](https://github.com/Alex6460064/RAG-multi_corpus/blob/main/README.md).

---

## Corpus

**Corpus arrêté au 29 août 2026.** Ce n'est pas la date des textes : c'est la
date de dernière synchronisation de la source. Une convention collective vit par
avenants successifs — toujours revérifier sur Légifrance.

Seuls les **articles en vigueur** sont indexés (états `VIGUEUR`, `VIGUEUR_ETEN`,
`VIGUEUR_NON_ETEN`) ; les articles abrogés ou périmés sont exclus par la source.

| Document | Contenu | Source |
|---|---|---|
| `syntec-01-texte-de-base.md` | Texte de base, refondu par l'avenant n° 46 du 16/07/2021 | [Légifrance, KALICONT000005635173](https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000005679895/?idConteneur=KALICONT000005635173) |
| `syntec-02-textes-attaches.md` | Textes attachés : annexes classification (ETAM, ingénieurs et cadres, enquêteurs) et accords / avenants thématiques en vigueur | idem |
| `syntec-03-textes-salaires.md` | Textes salaires : **uniquement les textes signés en 2022 ou après** (avenant n° 47 du 31/03/2022 et suivants, accord du 26/06/2024) — les avenants antérieurs fixent des montants périmés | idem |
| `syntec-00-source.md` | Note de contexte datée : périmètre, méthode, points de vigilance | synthèse |

**Récupération** : Légifrance renvoie une erreur HTTP 403 aux requêtes
automatisées ; la source utilisée est le jeu de données ouvert
[`@socialgouv/kali-data`](https://github.com/SocialGouv/kali-data)
(`KALICONT000005635173.json`, base KALI de la DILA republiée structurée).
Conversion en Markdown par [`scripts/build-corpus-syntec.mjs`](./scripts/build-corpus-syntec.mjs)
(script d'ETL propre à cette branche, pas du code moteur) : filtrage des états,
retrait des textes salaires < 2022 et des tables de correspondance de
numérotation, insertion d'une ligne `> **Source :**` sous chaque article pour que
la citation survive au découpage en fragments. Voir `data/syntec-00-source.md`
pour la commande de régénération.

> **Volontairement hors corpus** : le code du travail, les accords d'entreprise
> et tout contrat de travail individuel. L'assistant raisonne uniquement sur le
> texte conventionnel de branche.

---

## Variables d'environnement (projet Vercel de cette branche)

| Variable | Valeur |
|---|---|
| `OPENAI_API_KEY` | *(clé du projet, plafond de dépense conseillé)* |
| `CORPUS_BRANCH` | `corpus/syntec` — pilote l'`ignoreCommand` de `vercel.json` (ce projet ne builde que cette branche) |
| `NEXT_PUBLIC_CORPUS_NAME` | `Convention collective Syntec (IDCC 1486)` |
| `NEXT_PUBLIC_CORPUS_CUTOFF` | `corpus arrêté au 29 août 2026 — texte de base (avenant n° 46 du 16/07/2021), annexes et avenants en vigueur ; une convention évolue par avenants, vérifier la version en vigueur` |
| `NEXT_PUBLIC_CORPUS_SOURCE_LABEL` | `Convention collective nationale Syntec (IDCC 1486, brochure JO 3018) — Légifrance / base KALI` |
| `NEXT_PUBLIC_STARTER_QUESTIONS` | `["Quelle est la durée de la période d'essai d'un ingénieur cadre ?", "Quel préavis en cas de démission ?", "Comment fonctionne le forfait jours chez Syntec ?", "Comment lire la grille de classification ETAM ?"]` |

Build : `npm run generate && npm run build` (l'index `storage/` est régénéré au
build, jamais committé).

---

## Démo

**https://rag-syntec.vercel.app** — déploiement Vercel (projet `rag-syntec`), build
`npm run generate && npm run build` : l'index est régénéré à chaque déploiement, jamais committé.
