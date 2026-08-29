# Note de contexte — corpus convention collective Syntec (IDCC 1486)

*Corpus arrêté au 29 août 2026.*

## Contenu

Le texte de la **convention collective nationale des bureaux d'études techniques,
des cabinets d'ingénieurs-conseils et des sociétés de conseils** (« Syntec »,
IDCC 1486, brochure JO 3018), tel que consolidé sur Légifrance :

| Fichier | Contenu |
|---|---|
| `syntec-01-texte-de-base.md` | Texte de base, refondu par l'avenant n° 46 du 16 juillet 2021 (articles 1 à 13.6) |
| `syntec-02-textes-attaches.md` | Textes attachés : annexes de classification (ETAM, ingénieurs et cadres, enquêteurs) et accords / avenants thématiques en vigueur (durée du travail, prévoyance, formation, télétravail…) |
| `syntec-03-textes-salaires.md` | Textes salaires : **seuls les textes signés en 2022 ou après** (avenant n° 47 du 31/03/2022 et ses avenants, accord du 26/06/2024) |

## Source et méthode

- Texte officiel : Légifrance, conteneur `KALICONT000005635173`
  (<https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000005679895/?idConteneur=KALICONT000005635173>).
- Légifrance renvoie une erreur HTTP 403 aux requêtes automatisées. La source
  utilisée est le jeu de données ouvert **`@socialgouv/kali-data`**
  (`KALICONT000005635173.json`), qui republie la base KALI de la DILA sous forme
  structurée (sections, articles, état de vigueur).
- Conversion en Markdown par **`scripts/build-corpus-syntec.mjs`** (versionné sur
  cette branche). Le script :
  - ne garde que les articles en vigueur (la source filtre déjà les états
    `VIGUEUR`, `VIGUEUR_ETEN`, `VIGUEUR_NON_ETEN`) ;
  - écarte les textes « salaires » antérieurs à 2022 (montants périmés, parfois
    libellés en francs) ;
  - retire les tables de correspondance ancienne / nouvelle numérotation (bruit
    de récupération) ;
  - insère sous chaque article une ligne `> **Source :**` reprenant le numéro
    d'article et le texte d'origine, pour que la citation survive au découpage en
    fragments.

Régénérer le corpus :

```bash
curl -L -o k.json \
  https://raw.githubusercontent.com/SocialGouv/kali-data/master/data/KALICONT000005635173.json
node scripts/build-corpus-syntec.mjs k.json data
```

## Points de vigilance

- **Une convention collective vit par avenants successifs.** La date d'arrêt
  (29/08/2026) est celle de la dernière synchronisation de la source, pas celle
  des textes. Plusieurs textes de dates différentes peuvent coexister dans le
  corpus (durée du travail notamment) : pour toute valeur chiffrée, se référer
  au texte le plus récent et vérifier la version en vigueur sur Légifrance.
- Les numéros d'article restent parfois ambigus entre avenants (« Article 4.2 » ) ;
  la ligne `> **Source :**` précise le texte d'origine pour lever le doute.
- Le corpus ne contient **que le texte conventionnel de branche** : ni le code
  du travail, ni les accords d'entreprise, ni un contrat de travail individuel.
- Aucune donnée personnelle : texte normatif public.
