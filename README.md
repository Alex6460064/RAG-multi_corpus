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
| `01-texte-de-base.md` | Texte de base, refondu par l'avenant n° 46 du 16/07/2021 | [Légifrance, KALICONT000005635173](https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000005679895/?idConteneur=KALICONT000005635173) |
| `02-textes-attaches.md` | Textes attachés : annexes classification (ETAM, ingénieurs et cadres, enquêteurs) et avenants thématiques en vigueur | idem |
| `03-textes-salaires.md` | Textes salaires : valeur du point, grilles d'appointements minimaux | idem |
| `00-source-corpus-syntec.md` | Note de contexte datée : périmètre, source, points de vigilance | synthèse |

**Récupération** : le texte officiel Légifrance (conteneur KALI
`KALICONT000005635173`) est republié sous forme structurée par le jeu de données
ouvert [`@socialgouv/kali-data`](https://github.com/SocialGouv/kali-data)
(fichier `KALICONT000005635173.json`, base KALI de la DILA). Converti en Markdown
en conservant les numéros d'article pour la citation de source.

> **Volontairement hors corpus** : le code du travail, les accords d'entreprise
> et tout contrat de travail individuel. L'assistant raisonne uniquement sur le
> texte conventionnel de branche.

---

## Variables d'environnement (projet Vercel de cette branche)

| Variable | Valeur |
|---|---|
| `OPENAI_API_KEY` | *(clé du projet, plafond de dépense conseillé)* |
| `NEXT_PUBLIC_CORPUS_NAME` | `Convention collective Syntec (IDCC 1486)` |
| `NEXT_PUBLIC_CORPUS_CUTOFF` | `corpus arrêté au 29 août 2026 — texte de base (avenant n° 46 du 16/07/2021), annexes et avenants en vigueur ; une convention évolue par avenants, vérifier la version en vigueur` |
| `NEXT_PUBLIC_CORPUS_SOURCE_LABEL` | `Convention collective nationale Syntec (IDCC 1486, brochure JO 3018) — Légifrance / base KALI` |
| `NEXT_PUBLIC_STARTER_QUESTIONS` | `["Quelle est la durée de la période d'essai d'un ingénieur cadre ?", "Quel préavis en cas de démission ?", "Comment fonctionne le forfait jours chez Syntec ?", "Comment lire la grille de classification ETAM ?"]` |

Build : `npm run generate && npm run build` (l'index `storage/` est régénéré au
build, jamais committé).

---

## Démo

*(lien Vercel à ajouter)*
