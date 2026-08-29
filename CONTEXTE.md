# Moteur RAG multi-corpus

Dossier technique du projet vitrine RAG (Retrieval-Augmented Generation) — un seul moteur applicatif, décliné sur trois cas d'usage métier réels : conformité NIS2, urbanisme d'Anglet, convention collective Syntec.

**Objectif** : démontrer une compétence RAG concrète pour un portfolio CV/LinkedIn (profil AMOA / transformation digitale), avec une vraie logique d'architecture plutôt que trois démos isolées.

- Base technique : [run-llama/create-llama](https://github.com/run-llama/create-llama) (MIT)
- Stack : Next.js + TypeScript + LlamaIndex.TS
- Sources vérifiées le 28 août 2026

---

## Architecture retenue

Un seul dépôt GitHub, un moteur d'application partagé, trois branches de contenu, trois déploiements Vercel indépendants.

La branche `main` porte le code de l'application (interface de chat, logique de récupération, configuration). Chaque corpus vit dans sa propre branche, qui ne contient que ses documents sources. Une évolution du moteur se fait sur `main` puis se répercute dans chaque branche par un `merge` — la logique n'est jamais réécrite trois fois.

```
main                     → code de l'application (partagé)
├── corpus/nis2          → data/ (textes NIS2 + ANSSI)
├── corpus/plu-anglet    → data/ (PLU Anglet)
└── corpus/syntec        → data/ (convention Syntec)
```

Chaque branche est connectée à son propre projet Vercel (donc sa propre URL publique), avec sa propre variable d'environnement de clé API. Trois démos live, un seul historique de code à faire évoluer.

> **Point non confirmé, à valider en pratique** : la documentation officielle ne précise pas si l'index généré doit être committé dans Git ou régénéré à chaque build. Le plus sûr : configurer la commande de build Vercel sur `npm run generate && npm run build` plutôt que de committer le dossier d'index — ça fonctionne quel que soit le mécanisme de stockage interne. À valider dès l'étape 1 (branche NIS2) avant de répliquer sur les deux autres branches.

---

## Mise en place

1. Scaffolder le projet — `npx create-llama@latest` — choisir **TypeScript** et **Next.js** quand demandé (cohérent avec l'appli fléchettes existante). Garder la configuration RAG standard (pas besoin d'agents multiples pour cette première version).
2. Initialiser le dépôt Git et créer les trois branches de contenu à partir de `main` : `git checkout -b corpus/nis2`, puis répéter pour `plu-anglet` et `syntec`.
3. Sur chaque branche, vider le dossier `data/` et y déposer uniquement les documents du corpus concerné (voir sources ci-dessous pour chacun).
4. Générer l'index — `npm run generate` — puis tester en local avec `npm run dev` avant de committer.
5. Créer un projet Vercel par branche (trois projets distincts pointant vers le même dépôt, chacun configuré pour builder sa branche), avec la clé API du fournisseur LLM en variable d'environnement.
6. Renommer et personnaliser la page d'accueil de chaque déploiement (titre, questions d'exemple, mention de la source des documents) avant de partager le lien.

---

## Les trois corpus

### 1. Assistant conformité NIS2 — `corpus/nis2`

Double usage réel : une démo CV, et un premier prototype technique du pari SaaS NIS2 (voir studio digital). Cible : dirigeant ou RSSI de PME nouvellement soumis à NIS2 qui ne sait pas par où commencer.

**Sources (textes officiels, publics)**

- [Directive (UE) 2022/2555 (NIS2)](https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX%3A32022L2555) — texte intégral en français, EUR-Lex
- Loi relative à la résilience des infrastructures critiques et au renforcement de la cybersécurité — **promulguée le 17 juillet 2026** ([JORF n° 0165 du 17/07/2026](https://www.legifrance.gouv.fr/jorf/jo/2026/07/17/0165)), entrée en vigueur au 1ᵉʳ octobre 2026. Pour le numéro de loi exact et le texte consolidé, partir du [dossier législatif Sénat](https://www.senat.fr/dossier-legislatif/pjl24-033.html)
- [MonEspaceNIS2](https://monespacenis2.cyber.gouv.fr) — plateforme officielle d'auto-évaluation et d'enregistrement (échéance d'enregistrement : 31 mars 2027)
- Portail [cyber.gouv.fr](https://cyber.gouv.fr) de l'ANSSI — guide d'hygiène informatique, guide PSSI
- Méthode EBIOS Risk Manager (analyse de risque ANSSI)

**Vigilance** : la loi est promulguée mais les décrets d'application ne sont pas tous publiés — préciser dans le README la date d'arrêt du corpus (loi du 17/07/2026) et surveiller les décrets à venir.

**Pitch CV / LinkedIn** : *Assistant RAG répondant en langage naturel aux questions de conformité NIS2 pour PME — directive européenne, loi de transposition française et guides ANSSI — premier prototype technique de mon offre de conformité cyber pour PME.*

---

### 2. Assistant urbanisme Anglet — `corpus/plu-anglet`

Prolonge directement le projet DVF/DPE existant, et sert de démo pour l'offre de digitalisation des PME du bâtiment en Pays Basque. Cible : particulier, artisan ou architecte qui veut savoir ce qu'il a le droit de construire sur une parcelle donnée.

**Sources (documents officiels, publics)**

- [PLU d'Anglet — dossier complet officiel](https://www.geoportail-urbanisme.gouv.fr/api/document/265c2bef1d468d184af9318dc0c0951c/download/64024_PLU_20241207.zip) (Géoportail de l'Urbanisme, déc. 2024) : règlement écrit, règlement graphique, zonage. Fichier volumineux (zip) non entièrement vérifiable automatiquement — teste le téléchargement à la main avant d'indexer ; si le lien a bougé, repars de [geoportail-urbanisme.gouv.fr](https://www.geoportail-urbanisme.gouv.fr) → rechercher "Anglet"
- [Portail géomatique Communauté Pays Basque](https://geobasque.communaute-paysbasque.fr) — rapport de présentation et modifications
- [anglet.fr](https://www.anglet.fr) — service urbanisme, pour toute pièce manquante

**Vigilance** : vérifier la date de la dernière modification du PLU avant indexation — un PLU se modifie régulièrement, la date doit être claire dans le README.

**Pitch CV / LinkedIn** : *Assistant RAG sur le Plan Local d'Urbanisme d'Anglet — questions en langage naturel sur le zonage et les règles de construction, avec citation de l'article du règlement — brique de mon offre de digitalisation pour les artisans du bâtiment en Pays Basque.*

---

### 3. Assistant convention collective Syntec — `corpus/syntec`

Le texte de la convention (IDCC 1486), pas un contrat personnel — aucune donnée privée. Cible : salarié ou RH d'ESN qui cherche une réponse rapide sur le préavis, le forfait jours, ou la grille de classification.

**Sources (texte officiel, public)**

- [Convention collective Syntec — texte de base](https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000005679895/?idConteneur=KALICONT000005635173) (IDCC 1486, brochure 3018, Légifrance — gratuit, texte complet)
- Sur la même page Légifrance (conteneur `KALICONT000005635173`), récupérer aussi les avenants en vigueur (classifications, forfait jours...) pour un corpus à jour

**Vigilance**

- Une convention collective vit par avenants successifs — préciser dans le README la date d'arrêt du corpus, et ajouter un avertissement "vérifier la version en vigueur avant toute décision RH".
- Éviter les PDF "aperçu" de sites comme LégiSocial ou Juritravail : volontairement brouillés pour inciter à l'achat, donc inexploitables tels quels — toujours partir du texte Légifrance.

**Pitch CV / LinkedIn** : *Assistant RAG sur la convention collective Syntec (IDCC 1486) — répond en langage naturel aux questions de préavis, forfait jours et classification, avec citation de l'article — utile à tout consultant ou RH d'ESN.*

---

## Point de vigilance transverse

**Non-conseil** : les trois corpus touchent des sujets réglementaires ou juridiques. Ajouter un bandeau visible sur chaque déploiement : *"Assistant à but démonstratif, ne remplace pas un avis d'expert / juridique"*. Ce n'est pas qu'une précaution légale — c'est exactement le réflexe qu'un profil AMOA doit montrer, et ça se remarque en entretien.

---

## Ordre de construction

1. **Scaffolding + branche NIS2** — le corpus le plus resserré (peu de documents), idéal pour valider toute la chaîne technique une première fois.
2. **Branche PLU Anglet** — corpus plus volumineux (PDF de zonage/règlement) — bon test de la gestion de documents plus longs et plus techniques.
3. **Branche Syntec** — le plus rapide des trois une fois la mécanique connue — texte unique, bien structuré.
4. **Trois posts LinkedIn espacés** plutôt qu'un seul post noyant les trois projets — chacun touche un public différent (dirigeants PME, immobilier/BTP, RH/ESN).

---

## Checklist de publication

- [ ] README à la racine expliquant l'architecture multi-branches et créditant create-llama comme base
- [ ] Un README spécifique par branche : problème résolu, corpus utilisé (avec date d'arrêt), lien de démo
- [ ] Bandeau de non-conseil visible sur chaque déploiement
- [ ] Capture d'écran ou courte vidéo de démo par instance
- [ ] Rubrique "Projets IA" sur le CV avec les trois pitchs, formulés en résultat plutôt qu'en stack technique

---

*Sources vérifiées le 28 août 2026 : GitHub (run-llama/create-llama), EUR-Lex, Légifrance (JORF, KALICONT), Sénat (dossier législatif), cyber.gouv.fr / ANSSI, Géoportail de l'Urbanisme, Communauté Pays Basque.*
