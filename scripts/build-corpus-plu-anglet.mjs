// ETL de corpus — branche corpus/plu-anglet uniquement (pas du code moteur).
//
// Convertit les trois pièces écrites du PLU d'Anglet (règlement, PADD, OAP) en
// Markdown indexable, avec un identifiant citable (zone, article, secteur) dans
// chaque bloc.
//
//   node scripts/build-corpus-plu-anglet.mjs <dossier-pdf> <dossier-data>
//
// Récupération de la source :
//   Géoportail de l'Urbanisme -> commune d'Anglet -> « télécharger le document
//   complet » -> 64024_PLU_20241207.zip (PLU approuvé, modification n° 7 du
//   07/12/2024, publication GPU du 20/12/2024). Décompresser, puis pointer le
//   script sur Pieces_ecrites/ (il retrouve les 3 PDF par nom).
//
// Dépendance externe : `pdftotext` (poppler-utils) doit être dans le PATH.
//
// Choix de périmètre (exactitude — cf. CLAUDE.md priorité n° 1) :
//   - seules les pièces à valeur normative ou d'orientation sont indexées :
//     règlement écrit, PADD, OAP ;
//   - exclus : documents graphiques (plans de zonage, plans de masse), rapport
//     de présentation (descriptif, non opposable, volumineux), annexes
//     (servitudes) — non exploitables en RAG texte ou hors sujet pour la cible ;
//   - en-têtes / pieds de page répétés et légendes de schémas (« Le schéma ne
//     présente pas de valeur réglementaire… ») retirés : bruit de chunk.

import { execFileSync } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [, , pdfDir, dataDir] = process.argv;
if (!pdfDir || !dataDir) {
  console.error(
    "usage: node scripts/build-corpus-plu-anglet.mjs <dossier-pdf> <dossier-data>",
  );
  process.exit(1);
}

const CUTOFF = "2024-12-20"; // publication au Géoportail de l'Urbanisme
const PLU_VERSION = "modification n° 7 approuvée le 7 décembre 2024";

const DISCLAIMER =
  "> ⚠️ Assistant à but démonstratif — ne remplace pas un avis d'expert ou juridique. " +
  "Vérifier la version en vigueur du PLU et consulter le service urbanisme d'Anglet avant toute décision.";

const GRAPHIC_NOTE =
  "> **Lecture.** Ce fichier reproduit une pièce *écrite* du PLU. Les documents " +
  "*graphiques* (plans de zonage, plans de masse) ne sont pas dans le corpus : " +
  "pour savoir en quelle zone se trouve une parcelle précise, se reporter au " +
  "règlement graphique sur le Géoportail de l'Urbanisme. " +
  `Corpus arrêté au ${CUTOFF} (publication GPU).`;

// --- Nettoyage commun -----------------------------------------------------

// Fragments d'en-tête / pied de page. « Ville d'Anglet » est aussi un nom de
// lieu en clair dans le texte : on ne supprime NOISE que si la ligne entière
// n'est faite que de ça (vrai bandeau de page), jamais au milieu d'une phrase.
const NOISE = new RegExp(
  [
    String.raw`p\.\s?\d+\s?\/\s?\d+`,
    String.raw`Ville d[’'\`]Anglet`,
    String.raw`Modification(?:\s+simplifiée)?\s+n°\s?\d+`,
    String.raw`Révision générale`,
    String.raw`le\s+\d{1,2}\s+[A-Za-zéûùîàè]+\s+\d{4}`,
    String.raw`Plan Local d[’'\`]Urbanisme`,
    String.raw`Obras architectes`,
    String.raw`Approuvé`,
    String.raw`\bP\.?\s?L\.?\s?U\.?\b`,
  ].join("|"),
  "gi",
);

// Séquences NOISE en tête / en pied de ligne (footer recollé au contenu par le
// mode -layout) — retirées, jamais au milieu d'une phrase.
const NOISE_EDGE = new RegExp(
  `^(?:\\s*(?:${NOISE.source})\\s*)+|(?:\\s*(?:${NOISE.source})\\s*)+$`,
  "gi",
);
const trimNoise = (s) => s.replace(NOISE_EDGE, "").trim();

// Lignes entières à supprimer.
const JUNK_LINE = [/^SOMMAIRE$/i];

// Légende de schéma insérée dans le fil du texte (toutes variantes d'habillage).
const SCHEMA_CAPTION =
  /Le schéma ne présente pas de valeur\s+réglementaire,?\s+il a vocation à illustrer\s+l[’'`]expression\s+de la règle\s*(\(Modification[^)]*\))?/g;

function pdfToText(pdfPath) {
  return execFileSync("pdftotext", ["-enc", "UTF-8", "-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

// Retire l'en-tête de document + le sommaire : tout ce qui précède la première
// occurrence, en début de ligne, du marqueur `startAt`.
function dropFrontMatter(lines, startAt) {
  const i = lines.findIndex((l) => startAt.test(l.trim()));
  return i > 0 ? lines.slice(i) : lines;
}

// « (Modification simplifiée n°3, Modification n°6) » : traçabilité interne au
// PLU, sans valeur pour la recherche — on retire la parenthèse entière.
const MOD_PAREN = /\s*\((?=[^()]*Modifications?\b)[^()]*\)/gi;

// Une ligne est un bandeau de page si, une fois les fragments NOISE et la
// ponctuation retirés, il ne reste rien.
function isPageBanner(line) {
  return line.replace(NOISE, "").replace(/[\s,;.·|/-]+/g, "") === "";
}

function stripJunk(lines) {
  const out = [];
  for (const l of lines) {
    const raw = l.replace(MOD_PAREN, "").replace(/\s+/g, " ").trim();
    if (raw === "" || isPageBanner(raw)) {
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }
    const t = trimNoise(raw);
    if (t === "") continue;
    if (JUNK_LINE.some((re) => re.test(t))) continue;
    if (/\.{4,}\s*\d*\s*$/.test(t)) continue; // ligne de sommaire à pointillés
    // « Révision » / « générale » sur deux lignes : mention de couverture.
    if (/^générale$/i.test(t) && /^Révision$/i.test(out[out.length - 1] ?? "")) {
      out.pop();
      continue;
    }
    out.push(t);
  }
  return out;
}

// Fusionne les lignes de prose d'un même paragraphe. Les listes (-, o, •, 1.,
// 1-, a)) et les lignes vides restent autonomes, normalisées « - item ». En
// mode -layout, pdftotext ne coupe pas les mots : un « - » en fin de ligne est
// un vrai trait d'union (« au-dessus ») — on le garde en recollant.
const LIST_START = /^(?:[-–—•o]\s+|\d+[.)-]\s+|[a-z][.)]\s+)/;

function reflow(text) {
  const out = [];
  for (const raw of text.split("\n")) {
    const t = raw.trim();
    const prev = out.length ? out[out.length - 1] : "";

    if (t === "") {
      if (prev !== "") out.push("");
      continue;
    }
    if (/^#{1,6}\s/.test(t) || t.startsWith(">")) {
      out.push(t);
      continue;
    }
    if (LIST_START.test(t)) {
      out.push(t.replace(LIST_START, "- "));
      continue;
    }
    // Continuation d'un paragraphe ou d'un item de liste sur la ligne suivante.
    const prevIsText =
      prev !== "" && !/^#{1,6}\s/.test(prev) && !prev.startsWith(">");
    if (prevIsText) {
      out[out.length - 1] = /[-‐]$/.test(prev) ? prev + t : prev + " " + t;
      continue;
    }
    out.push(t);
  }
  return out.join("\n");
}

function sentenceCase(s) {
  if (s !== s.toUpperCase()) return s; // déjà en casse normale
  const lower = s.toLowerCase().replace(/\bzones? a urbaniser\b/, (m) =>
    m.replace(" a ", " à "),
  );
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function finalize(blocks) {
  return (
    blocks
      .join("\n")
      .replace(SCHEMA_CAPTION, "")
      // Renvois de modification recollés par le reflow (« … présenté.
      // (Modification simplifiée n°3) »).
      .replace(MOD_PAREN, "")
      // Parenthèses vidées de leur contenu (« ( ) », « (, et ) », « (,, ) »).
      .replace(/\s*\(\s*[,;.\s]*(?:et[,;.\s]*)?\)/gi, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/ +([.,])/g, "$1")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}

function header(piece, h1) {
  return [
    `<!-- PLU d'Anglet — ${piece}. Source : dossier PLU approuvé, ${PLU_VERSION}, ` +
      `téléchargé sur le Géoportail de l'Urbanisme (64024_PLU_20241207, publication du 20/12/2024). ` +
      `Converti depuis le PDF officiel par scripts/build-corpus-plu-anglet.mjs. Corpus arrêté au ${CUTOFF}. -->`,
    ``,
    h1,
    ``,
    GRAPHIC_NOTE,
    ``,
    DISCLAIMER,
    ``,
  ].join("\n");
}

// --- Règlement écrit ----------------------------------------------------

const ZONE_RE = /^ZONE\s+([A-Z][A-Za-z0-9]*)$/;
const ART_RE = /^([A-Z]{1,4})\s*-\s*Article\s+(\d+)\s*:?\s*(.*)$/;
// Vrai titre de chapitre dans le corps : « CHAPITRE 2 : LES ZONES À URBANISER »
// (Partie II, tout en capitales) ou « Chapitre 1 : » seul suivi de son titre
// sur les lignes suivantes (Partie I).
const CHAP_CAPS_RE = /^CHAPITRE\s+(\d+)\s*:\s*(.+)$/;
const CHAP_SPLIT_RE = /^Chapitre\s+(\d+)\s*:\s*(.*)$/;
// Page de garde répétée avant chaque zone : « Chapitre 1 - », « Deuxième
// partie : … » — redondant avec le vrai titre, on écarte.
const CHAP_DIVIDER_RE = /^Chapitre\s+\d+\s*[-–]/i;
// Fragments de page de garde communs aux trois pièces (titre de partie éclaté,
// mention de couverture) — formulations non ambiguës uniquement.
const DIVIDER_RE =
  /^(?:(?:Première|Deuxième|Troisième|Quatrième|Cinquième) partie\s*:?|Les règles spécifiques|aux différentes zones du|règlement du(?: PLU)?|Les définitions|et dispositions communes du|Révision générale)\s*$/i;
// Résidus supplémentaires propres au règlement (titre de chapitre éclaté sur
// une page de garde : « Les Zones à » / « urbaniser » / « Révision » …).
const REGLEMENT_DIVIDER_RE =
  /^(?:Révision|générale|Les zones? (?:à|urbaines?|naturelles?)|La zone agricole|urbaniser|naturelles?|agricole)\s*$/i;

const PARTIE_TITLES = {
  I: "Partie I — Les définitions et dispositions communes du règlement",
  II: "Partie II — Les règles spécifiques aux différentes zones du règlement",
};

function srcReglement(scope) {
  return `> **Source :** Règlement écrit du PLU d'Anglet — ${scope} — ${PLU_VERSION}.`;
}

function buildReglement(rawText) {
  let lines = dropFrontMatter(rawText.split("\n"), /^PARTIE\s+I\./);
  lines = stripJunk(lines);

  const out = [];
  let inDefinitions = false;
  let inPartieII = false;
  let curZone = "";
  const seenChapters = new Set();
  const norm = (s) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === "") {
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }

    if (DIVIDER_RE.test(t) || REGLEMENT_DIVIDER_RE.test(t)) continue;

    // Page de garde « Chapitre N - » : ignorer la ligne et son titre éclaté
    // (jusqu'à la ligne vide ou la zone qui suit), sans rien émettre.
    if (CHAP_DIVIDER_RE.test(t)) {
      while (
        i + 1 < lines.length &&
        lines[i + 1].trim() !== "" &&
        !ZONE_RE.test(lines[i + 1].trim()) &&
        !ART_RE.test(lines[i + 1].trim())
      ) {
        i++;
      }
      continue;
    }

    const mp = t.match(/^PARTIE\s+(I{1,2})\./);
    if (mp) {
      inPartieII = mp[1] === "II";
      out.push("", `# ${PARTIE_TITLES[mp[1]]}`, "");
      inDefinitions = false;
      continue;
    }

    const mCaps = t.match(CHAP_CAPS_RE);
    const mSplit = !mCaps && t.match(CHAP_SPLIT_RE);
    // En Partie II, seul le titre tout en capitales est le vrai chapitre ; la
    // forme « Chapitre N : » à casse mixte est une page de garde répétée.
    if (mSplit && inPartieII) {
      while (
        i + 1 < lines.length &&
        lines[i + 1].trim() !== "" &&
        !ZONE_RE.test(lines[i + 1].trim()) &&
        !ART_RE.test(lines[i + 1].trim())
      ) {
        i++;
      }
      continue;
    }
    const mc = mCaps || mSplit;
    if (mc) {
      let title = mc[2].replace(/\s+/g, " ").trim();
      // Titre éclaté sur les lignes suivantes (chapitres Partie I).
      while (
        !title &&
        i + 1 < lines.length &&
        lines[i + 1].trim() !== "" &&
        !CHAP_CAPS_RE.test(lines[i + 1].trim()) &&
        !ZONE_RE.test(lines[i + 1].trim()) &&
        !ART_RE.test(lines[i + 1].trim())
      ) {
        title = lines[++i].trim();
      }
      const key = norm(title);
      if (title && !seenChapters.has(key)) {
        out.push("", `## Chapitre : ${sentenceCase(title)}`, "");
        seenChapters.add(key);
      }
      inDefinitions = /définitions communes/i.test(title);
      continue;
    }

    // Résidu de titre de partie / page de garde : ligne courte tout en
    // capitales qui n'est ni PARTIE, ni CHAPITRE, ni ZONE, ni article.
    if (
      t === t.toUpperCase() &&
      t.length < 55 &&
      /[A-ZÉÈ]/.test(t) &&
      !/^(PARTIE|CHAPITRE|ZONE)\b/.test(t) &&
      !ART_RE.test(t)
    ) {
      continue;
    }

    const mz = t.match(ZONE_RE);
    if (mz) {
      inDefinitions = false;
      curZone = mz[1];
      out.push("", `## Zone ${mz[1]}`, "", srcReglement(`zone ${mz[1]}`), "");
      continue;
    }
    // En-tête courant « Zone IAU » répété en tête de page de contenu.
    if (curZone && new RegExp(`^Zone ${curZone}$`, "i").test(t)) continue;

    const ma = t.match(ART_RE);
    if (ma) {
      const [, prefix, num] = ma;
      let title = ma[3].trim();
      while (
        i + 1 < lines.length &&
        lines[i + 1].trim() !== "" &&
        !ART_RE.test(lines[i + 1].trim()) &&
        !ZONE_RE.test(lines[i + 1].trim()) &&
        /^[a-zéèêàïû]/.test(lines[i + 1].trim())
      ) {
        title += " " + lines[++i].trim();
      }
      title = title.replace(/\s+/g, " ").trim();
      const scope =
        prefix === "DC"
          ? `dispositions communes, article ${num}`
          : `zone ${prefix}, article ${num}`;
      const label =
        prefix === "DC"
          ? `Dispositions communes — Article ${num}`
          : `Zone ${prefix} — Article ${num}`;
      out.push(
        "",
        `### ${label}${title ? ` : ${title}` : ""}`,
        "",
        srcReglement(scope),
        "",
      );
      continue;
    }

    if (inDefinitions && isDefinitionTerm(t, out, lines, i)) {
      out.push(
        "",
        `### ${t}`,
        "",
        srcReglement(`définitions communes, « ${t} »`),
        "",
      );
      continue;
    }

    out.push(lines[i]);
  }

  return finalize([
    header("règlement écrit", "# Règlement écrit du PLU d'Anglet"),
    reflow(out.join("\n")),
  ]);
}

function isDefinitionTerm(t, out, lines, i) {
  if (t.length > 55 || t.split(/\s+/).length > 6) return false;
  if (/[.:,;?!]$/.test(t)) return false;
  if (!/^[A-ZÉÈÀÎÏ]/.test(t)) return false;
  if (t === t.toUpperCase()) return false; // titre éclaté en colonne
  if ((out.length ? out[out.length - 1] : "").trim() !== "") return false;
  let j = i + 1;
  while (j < lines.length && lines[j].trim() === "") j++;
  const next = j < lines.length ? lines[j].trim() : "";
  return (
    next.length > 40 ||
    /^(Extrait|Élément|Éléments|Action|Ensemble|Un |Une |La |Le |Les |Ligne )/.test(
      next,
    )
  );
}

// --- PADD ---------------------------------------------------------------

const PADD_NUM_RE = /^((?:[IVX]+|\d+)(?:\.\d+)*)\.\s+(\S.*)$/;
// Les 3 ambitions : titres en capitales sans accents dans la source, remis en
// forme (l'accentuation ne se déduit pas de manière fiable des capitales).
const PADD_AMBITIONS = {
  PREMIERE: "Première ambition — Une ville pour tous",
  DEUXIEME: "Deuxième ambition — Une ville marquée par la nature",
  TROISIEME: "Troisième ambition — Une ville d'identités et de contrastes",
};
const PADD_AMBITION_RE = /^(PREMIERE|DEUXIEME|TROISIEME)\s+AMBITION$/;

function srcPadd(scope) {
  return `> **Source :** PADD du PLU d'Anglet — ${scope} — pièce approuvée le 14 juin 2013.`;
}

function buildPadd(rawText) {
  let lines = dropFrontMatter(rawText.split("\n"), /^PREAMBULE$/);
  lines = stripJunk(lines);

  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === "") {
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }
    if (DIVIDER_RE.test(t)) continue;
    if (/^PREAMBULE$/.test(t)) {
      out.push("", "## Préambule", "", srcPadd("préambule"), "");
      continue;
    }
    if (/^ORIENTATIONS GENERALES/i.test(t)) {
      out.push(
        "",
        "## Orientations générales d'aménagement et d'urbanisme",
        "",
      );
      continue;
    }
    const mam = t.match(PADD_AMBITION_RE);
    if (mam) {
      // La ligne suivante (« UNE VILLE POUR TOUS ») est déjà dans le libellé.
      if (i + 1 < lines.length && /^UNE VILLE/i.test(lines[i + 1].trim())) i++;
      out.push(
        "",
        `### ${PADD_AMBITIONS[mam[1]]}`,
        "",
        srcPadd("orientations générales"),
        "",
      );
      continue;
    }
    const mn = t.match(PADD_NUM_RE);
    if (mn) {
      let [, numbering, title] = mn;
      // Titre parfois coupé sur 1–2 lignes suivantes (retrait de continuation) :
      // on agrège tant qu'on ne rencontre ni ligne vide, ni nouveau numéro.
      // Une continuation de titre coupé est en capitales (comme le titre lui-même).
      let joined = 0;
      while (
        joined < 2 &&
        i + 1 < lines.length &&
        lines[i + 1].trim() !== "" &&
        lines[i + 1].trim() === lines[i + 1].trim().toUpperCase() &&
        /[A-ZÉÈ]/.test(lines[i + 1].trim()) &&
        !PADD_NUM_RE.test(lines[i + 1].trim()) &&
        !PADD_AMBITION_RE.test(lines[i + 1].trim())
      ) {
        title += " " + lines[++i].trim();
        joined++;
      }
      title = sentenceCase(title.replace(/\s+/g, " ").trim()).replace(
        /[\s,;:]+$/,
        "",
      );
      const depth = numbering.split(".").length;
      const hashes = "#".repeat(Math.min(depth + 1, 5));
      out.push(
        "",
        `${hashes} ${numbering}. ${title}`,
        "",
        srcPadd(`orientation ${numbering}`),
        "",
      );
      continue;
    }
    out.push(lines[i]);
  }

  return finalize([
    header(
      "PADD",
      "# Projet d'aménagement et de développement durable (PADD) — PLU d'Anglet",
    ),
    "> Le PADD exprime le projet politique de la commune. Il n'est pas directement " +
      "opposable aux demandes d'autorisation d'urbanisme (art. L.151-2 du Code de " +
      "l'urbanisme) ; le règlement écrit et les OAP le sont. Pièce approuvée le 14 juin 2013.",
    "",
    reflow(out.join("\n")),
  ]);
}

// --- OAP --------------------------------------------------------------

const OAP_SECTOR_RE = /^Orientation d[’'`]aménagement\s*:?\s*(.+)$/i;

function srcOap(sector) {
  return `> **Source :** OAP du PLU d'Anglet — secteur « ${sector} » — ${PLU_VERSION}.`;
}

function nextProse(lines, i) {
  let j = i + 1;
  while (j < lines.length && lines[j].trim() === "") j++;
  return j < lines.length && lines[j].trim().length > 50;
}

function buildOap(rawText) {
  let lines = dropFrontMatter(rawText.split("\n"), /^Préambule$/);
  lines = stripJunk(lines);

  const out = [];
  const seen = new Set();
  const key = (s) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim();

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === "") {
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }
    // Page de garde : « Orientation d'aménagement » seul, suivi du nom de
    // secteur en capitales — le vrai titre « Orientation d'aménagement : X »
    // arrive plus loin.
    if (DIVIDER_RE.test(t)) continue;
    // Page de garde : « Orientation [d'aménagement] » (parfois éclaté sur deux
    // lignes) suivi du nom de secteur en capitales — le vrai titre
    // « Orientation d'aménagement : X » arrive plus loin.
    if (/^Orientation( d[’'`]aménagement)?$/i.test(t)) {
      if (
        i + 1 < lines.length &&
        /^d[’'`]aménagement$/i.test(lines[i + 1].trim())
      ) {
        i++;
      }
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      if (
        j < lines.length &&
        lines[j].trim() === lines[j].trim().toUpperCase() &&
        /[A-ZÉÈ]/.test(lines[j].trim())
      ) {
        i = j;
      }
      continue;
    }
    // Sous-titre de fiche (« Préambule », « Description du site », « Programme »
    // …) : ligne courte sans ponctuation finale, suivie de prose.
    if (
      /^[A-ZÉÈ][a-zà-ÿ].{1,44}$/.test(t) &&
      t.split(/\s+/).length <= 6 &&
      !/[.,;!?]$/.test(t) &&
      out[out.length - 1] === "" &&
      nextProse(lines, i)
    ) {
      out.push("", `### ${t.replace(/\s*:$/, "")}`, "");
      continue;
    }
    const ms = t.match(OAP_SECTOR_RE);
    if (ms) {
      const sector = ms[1]
        .replace(/\s*[/].*$/, "")
        .replace(/\s+/g, " ")
        .replace(/[.:;,\s]+$/, "")
        .trim();
      const k = key(sector);
      if (!seen.has(k)) {
        out.push(
          "",
          `## OAP — ${sentenceCase(sector)}`,
          "",
          srcOap(sentenceCase(sector)),
          "",
        );
        seen.add(k);
      }
      continue;
    }
    out.push(lines[i]);
  }

  return finalize([
    header(
      "OAP",
      "# Orientations d'aménagement et de programmation (OAP) — PLU d'Anglet",
    ),
    "> Les OAP sont **opposables** aux autorisations d'urbanisme dans un rapport de " +
      "compatibilité (art. L.152-1 du Code de l'urbanisme). Cinq secteurs : Le Refuge, " +
      "Melville Lynch, Sutar, Labordotte, Quatre Cantons.",
    "",
    reflow(out.join("\n")),
  ]);
}

// --- Pilotage --------------------------------------------------------

function findPdf(fragment) {
  const hit = readdirSync(pdfDir).find(
    (f) =>
      f.toLowerCase().includes(fragment) && f.toLowerCase().endsWith(".pdf"),
  );
  if (!hit) {
    throw new Error(`PDF introuvable (fragment « ${fragment} ») dans ${pdfDir}`);
  }
  return join(pdfDir, hit);
}

const JOBS = [
  { slug: "plu-anglet-01-reglement", frag: "reglement_2024", build: buildReglement },
  { slug: "plu-anglet-02-padd", frag: "padd_2024", build: buildPadd },
  {
    slug: "plu-anglet-03-oap",
    frag: "orientations_amenagement_2024",
    build: buildOap,
  },
];

for (const job of JOBS) {
  const md = job.build(pdfToText(findPdf(job.frag)));
  writeFileSync(join(dataDir, `${job.slug}.md`), md, "utf8");
  const headings = (md.match(/^#{1,6}\s/gm) || []).length;
  console.log(`${job.slug}.md : ${md.length} octets, ${headings} titres`);
}
