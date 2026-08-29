# Assistant urbanisme Anglet — branche `corpus/plu-anglet`

Assistant RAG qui répond en langage naturel aux questions sur le **Plan Local
d'Urbanisme d'Anglet** — ce qu'on a le droit de construire sur une parcelle :
zones (UA à A), reculs, hauteurs, emprise au sol, stationnement, espaces verts,
définitions du règlement, orientations d'aménagement. Chaque réponse **cite la
zone et l'article d'origine**.

> ⚠️ **Non-conseil** — Assistant à but démonstratif. Ne remplace pas un avis
> d'expert ou juridique. Un PLU évolue par modifications successives : vérifier
> la version en vigueur et consulter le service urbanisme d'Anglet avant toute
> décision. Pour le zonage précis d'une parcelle, se reporter au règlement
> graphique sur le [Géoportail de l'Urbanisme](https://www.geoportail-urbanisme.gouv.fr).

Cette branche ne contient que le corpus (`data/`) et son script d'ETL. Le moteur,
l'architecture multi-branches et la stack sont décrits dans le
[README de `main`](https://github.com/Alex6460064/RAG-multi_corpus/blob/main/README.md).

---

## Corpus

**Corpus arrêté au 20 décembre 2024** (date de publication du dossier au
Géoportail de l'Urbanisme). Version indexée : **PLU d'Anglet, modification n° 7
approuvée le 7 décembre 2024** (révision générale approuvée le 14 juin 2013, sept
modifications et quatre modifications simplifiées successives). Un PLU se modifie
régulièrement — toujours revérifier la version en vigueur.

Seules les **pièces écrites à valeur normative ou d'orientation** sont indexées :

| Document | Contenu | Pièce du dossier |
|---|---|---|
| `plu-anglet-01-reglement.md` | Règlement écrit : définitions et dispositions communes, puis règles des 14 zones (UA, UB, UC, UE, UI, UT, UV, IAU, IIAU, N, Ncu, Ner, Nk, A) article par article | 3.1 — Règlement d'urbanisme |
| `plu-anglet-02-padd.md` | Projet d'aménagement et de développement durable — orientations générales (non directement opposable) | 2A — PADD |
| `plu-anglet-03-oap.md` | Orientations d'aménagement et de programmation — 5 secteurs : Le Refuge, Melville Lynch, Sutar, Labordotte, Quatre Cantons (opposables dans un rapport de compatibilité) | 2B — OAP |

**Source** : dossier complet du PLU téléchargé sur le
[Géoportail de l'Urbanisme](https://www.geoportail-urbanisme.gouv.fr/map/) —
commune d'Anglet, « télécharger le document complet »
(`64024_PLU_20241207.zip`, publication du 20/12/2024).

**Conversion** : les PDF officiels (nativement texte, non scannés) sont convertis
en Markdown par [`scripts/build-corpus-plu-anglet.mjs`](./scripts/build-corpus-plu-anglet.mjs)
(script d'ETL propre à cette branche, pas du code moteur) : `pdftotext -layout`,
retrait des en-têtes / pieds de page et légendes de schémas répétés, des renvois
de traçabilité « (Modification n° X) » et des pages de garde, reconstruction des
paragraphes, et insertion d'une ligne `> **Source :**` sous chaque zone, article,
définition et secteur pour que la citation survive au découpage en fragments.
Commande de régénération en tête du script.

> **Volontairement hors corpus** : les documents **graphiques** (règlement
> graphique, plans de zonage, plans de masse — non exploitables en RAG texte),
> le **rapport de présentation** (descriptif, non opposable, très volumineux) et
> les **annexes** (servitudes d'utilité publique, réseaux, périmètres). Pour le
> zonage d'une parcelle, l'assistant renvoie vers le Géoportail de l'Urbanisme.

---

## Variables d'environnement (projet Vercel de cette branche)

| Variable | Valeur |
|---|---|
| `OPENAI_API_KEY` | *(clé du projet, plafond de dépense conseillé)* |
| `NEXT_PUBLIC_CORPUS_NAME` | `PLU d'Anglet` |
| `NEXT_PUBLIC_CORPUS_CUTOFF` | `corpus arrêté au 20/12/2024 — PLU d'Anglet, modification n° 7 approuvée le 7 décembre 2024 ; un PLU évolue par modifications, vérifier la version en vigueur` |
| `NEXT_PUBLIC_CORPUS_SOURCE_LABEL` | `Plan Local d'Urbanisme d'Anglet (règlement écrit, PADD, OAP) — Géoportail de l'Urbanisme, dossier 64024_PLU_20241207` |
| `NEXT_PUBLIC_STARTER_QUESTIONS` | `["Quelle hauteur maximale puis-je construire en zone UB ?", "Comment se calcule l'emprise au sol ?", "Combien de places de stationnement dois-je prévoir pour un logement ?", "Que prévoit l'OAP du secteur du Refuge ?"]` |

Build : `npm run generate && npm run build` (l'index `storage/` est régénéré au
build, jamais committé).

---

## Démo

*(lien Vercel à ajouter)*
