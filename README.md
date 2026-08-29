# Assistant conformité NIS2 — branche `corpus/nis2`

Assistant RAG qui répond en langage naturel aux questions de conformité **NIS2**
d'une PME (dirigeant, RSSI) nouvellement concernée et qui ne sait pas par où
commencer. Chaque réponse **cite l'article ou le guide d'origine**.

> ⚠️ **Non-conseil** — Assistant à but démonstratif. Ne remplace pas un avis
> d'expert ou juridique. Vérifier la version en vigueur des textes avant toute
> décision.

Cette branche ne contient que le corpus (`data/`). Le moteur, l'architecture
multi-branches et la stack sont décrits dans le [README de `main`](https://github.com/Alex6460064/RAG-multi_corpus/blob/main/README.md).

---

## Corpus

**Corpus gelé en août 2026.** Ce n'est pas la date des documents : le texte
normatif le plus récent est la directive elle-même (14/12/2022) ; les guides
ANSSI vont jusqu'à 01/2025. C'est la date à laquelle l'état des sources a été
arrêté pour l'indexation — voir le point de vigilance ci-dessous sur la loi
française.

| Document | Source | Version |
|---|---|---|
| Directive (UE) 2022/2555 (NIS2 / « SRI 2 ») — texte intégral FR | [EUR-Lex, CELEX 32022L2555](https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32022L2555) | 14/12/2022, JO L 333/80 |
| Guide d'hygiène informatique | [ANSSI / MesServicesCyber](https://messervices.cyber.gouv.fr/documents-guides/guide_hygiene_informatique_anssi.pdf) | 42 mesures |
| La cybersécurité pour les TPE/PME en 13 questions | [ANSSI / MesServicesCyber](https://messervices.cyber.gouv.fr/documents-guides/20241212_np_anssi_guide_tpe-pme_v2.pdf) | v2, 12/2024 |
| Recommandations pour l'administration sécurisée des SI | [ANSSI / MesServicesCyber](https://messervices.cyber.gouv.fr/documents-guides/anssi-guide-admin_securisee_si_v3-0.pdf) | v3.0 |
| La méthode EBIOS Risk Manager | [ANSSI / MesServicesCyber](https://messervices.cyber.gouv.fr/documents-guides/250129_np_anssi_guide_ebios_fr_final_collection_WEB.pdf) | 01/2025 |
| Note de contexte : état de la transposition de NIS2 en France | synthèse datée (Sénat, Assemblée nationale, FAQ MonEspaceNIS2) — `data/00-contexte-transposition-nis2-france.md` | arrêtée au 29/08/2026 |

> **Volontairement hors corpus** : le guide PSSI de l'ANSSI (méthodologie de
> 2004, redondante avec le guide d'hygiène et le guide TPE/PME pour la cible
> visée) et la plateforme MonEspaceNIS2 (service en ligne, pas un document ;
> aucune échéance d'enregistrement officielle tant que la loi n'est pas
> promulguée).

### Point de vigilance — loi française de transposition

La **loi relative à la résilience des infrastructures critiques et au
renforcement de la cybersécurité** (transposition NIS2 + REC + DORA) **n'est pas
promulguée** à la date d'arrêt du corpus : adoptée en 1ʳᵉ lecture au Sénat le
12/03/2025 (texte n° 78), examen en séance à l'Assemblée nationale reporté à la
rentrée de septembre 2026 ; la Commission européenne a saisi la CJUE le
08/07/2026 pour retard de transposition. Dossiers :
[Sénat](https://www.senat.fr/dossier-legislatif/pjl24-033.html) ·
[Assemblée nationale](https://www.assemblee-nationale.fr/dyn/17/dossiers/DLR5L17N50731).

Les obligations NIS2 **ne sont donc pas encore applicables en droit français**.
Le corpus ne contient que le droit de l'Union et les guides ANSSI ; détail dans
`data/00-contexte-transposition-nis2-france.md`. À compléter avec la loi, ses
décrets et arrêtés dès publication au JORF, puis mettre à jour la date d'arrêt.

---

## Variables d'environnement (projet Vercel de cette branche)

| Variable | Valeur |
|---|---|
| `OPENAI_API_KEY` | *(clé du projet, plafond de dépense conseillé)* |
| `NEXT_PUBLIC_CORPUS_NAME` | `Conformité NIS2` |
| `NEXT_PUBLIC_CORPUS_CUTOFF` | `corpus gelé en août 2026 — directive (UE) 2022/2555 (2022) et guides ANSSI (jusqu'à 01/2025) ; la loi française de transposition n'est pas encore promulguée` |
| `NEXT_PUBLIC_CORPUS_SOURCE_LABEL` | `Directive (UE) 2022/2555 (EUR-Lex) · guides ANSSI : hygiène informatique, cybersécurité TPE-PME, administration sécurisée, EBIOS Risk Manager` |
| `NEXT_PUBLIC_STARTER_QUESTIONS` | `["Mon entreprise est-elle concernée par NIS2 ?", "Quelles sont les obligations de notification d'incident ?", "Quelles sanctions en cas de non-conformité ?", "Par où commencer une démarche de mise en conformité ?"]` |

Build : `npm run generate && npm run build` (l'index `storage/` est régénéré au
build, jamais committé).

---

## Démo

*(lien Vercel à ajouter)*
