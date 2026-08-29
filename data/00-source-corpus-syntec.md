# Note de contexte — corpus convention collective Syntec (IDCC 1486)

*Arrêté au 29 août 2026.*

## Ce que contient le corpus

Le texte de la **convention collective nationale des bureaux d'études techniques,
des cabinets d'ingénieurs-conseils et des sociétés de conseils** (« Syntec »,
IDCC 1486, brochure JO 3018), tel que consolidé sur Légifrance :

| Fichier | Contenu |
|---|---|
| `01-texte-de-base.md` | Texte de base (refondu par l'avenant n° 46 du 16 juillet 2021) |
| `02-textes-attaches.md` | Textes attachés : annexes (classification ETAM, ingénieurs et cadres, enquêteurs) et avenants thématiques en vigueur |
| `03-textes-salaires.md` | Textes salaires : avenants de valeur du point et de grilles d'appointements minimaux |

Seuls les **articles en vigueur** sont inclus (états `VIGUEUR`, `VIGUEUR_ETEN`,
`VIGUEUR_NON_ETEN`). Les articles abrogés ou périmés sont exclus par la source.

## Source

- Texte officiel : Légifrance, conteneur `KALICONT000005635173`
  (<https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000005679895/?idConteneur=KALICONT000005635173>).
- Récupéré via le jeu de données ouvert **`@socialgouv/kali-data`**
  (fichier `KALICONT000005635173.json`), qui republie la base KALI de la DILA
  sous forme structurée (sections + articles + état de vigueur). Converti en
  Markdown par `scripts/` de génération de corpus — numéros d'article conservés
  pour la citation de source.

## Points de vigilance

- **Une convention collective vit par avenants successifs.** La date d'arrêt du
  corpus (29/08/2026) est celle de la dernière synchronisation de la source ;
  elle n'est pas la date des textes. Vérifier la version en vigueur sur
  Légifrance avant toute décision RH.
- Le corpus ne contient **que le texte conventionnel de branche** : ni le code
  du travail, ni les accords d'entreprise, ni un contrat de travail individuel.
- Aucune donnée personnelle : le corpus est un texte normatif public.
