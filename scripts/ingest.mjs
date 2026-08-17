#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { withBase } from "../src/lib/paths.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, "..");
const PROJECT_ROOT = path.resolve(SITE_ROOT, "..");

marked.use({ gfm: true, breaks: false });

export const CHAPTER_ROUTES = [
  { match: /^User guide/i, href: "/cite", nav: "Cite & licence" },
  { match: /^1\./, href: "/introduction", nav: "1 Introduction" },
  { match: /^2\./, href: "/construction", nav: "2 Construction" },
  { match: /^3\./, href: "/weights", nav: "3 Weights" },
  { match: /^4\./, href: "/missing", nav: "4 Missing data" },
  { match: /^5\./, href: "/variables", nav: "5 Dictionary" },
];

export const DOMAIN_LABELS = {
  id: "Identifiers",
  design: "Design & weights",
  demo: "Demographics",
  conduct: "Conduct (age 3)",
  delinquency: "Delinquency",
  attitude: "Attitudes",
  online: "Time online",
  job: "Work & money",
  dating: "Dating & partnership",
  victim: "Victimization",
  gang: "Gang membership",
  knife: "Weapon carrying",
  cj: "Criminal justice",
  family: "Living & partnership",
  education: "Education",
};

/** Show only the file name for local project paths. Leave URLs alone. */
export function stripLocalFilePaths(text) {
  return String(text).replace(
    /(?<![\/\w:])(?:[\w.-]+\/)+([\w.-]+\.(?:dta|csv|md|R|r))\b/g,
    "$1",
  );
}

export function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row = {};
    headers.forEach((header, i) => {
      row[header] = cols[i] ?? "";
    });
    return row;
  });
}

function splitCsvLine(line) {
  return line.split(",").map((cell) => cell.trim());
}

export function parseFrequencies(md) {
  const result = {};
  const parts = md.split(/^#### `/m).slice(1);
  for (const part of parts) {
    const tick = part.indexOf("`");
    if (tick === -1) continue;
    const name = part.slice(0, tick).trim();
    const rows = [];
    for (const line of part.split(/\r?\n/)) {
      const match = line.match(/^\|\s*(.*?)\s*\|\s*(.*?)\s*\|$/);
      if (!match) continue;
      const value = match[1].trim();
      const nRaw = match[2].trim();
      if (value === "Value" || /^-+$/.test(value) || value === "---") continue;
      const n = Number(String(nRaw).replace(/,/g, ""));
      if (!Number.isFinite(n)) continue;
      rows.push({
        value,
        n,
        isMissing: value === "" || /^missing$/i.test(value),
      });
    }
    result[name] = rows;
  }
  return result;
}

export function slugify(heading) {
  return String(heading)
    .replace(/^\d+(\.\d+)*\s+/, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function listMarkdownHeadings(md) {
  return md
    .split(/\r?\n/)
    .filter((line) => /^#{2,3}\s+/.test(line))
    .map((line) => line.replace(/^#+\s+/, "").trim());
}

export function splitMarkdownSections(md) {
  const lines = md.split(/\r?\n/);
  const doc = { title: "", preamble: [], chapters: [] };
  let currentH2 = null;
  let currentH3 = null;

  for (const line of lines) {
    if (/^# /.test(line) && !/^## /.test(line)) {
      doc.title = line.replace(/^#\s+/, "").trim();
      continue;
    }
    if (/^## /.test(line)) {
      currentH2 = { heading: line.replace(/^##\s+/, "").trim(), body: [], subsections: [] };
      doc.chapters.push(currentH2);
      currentH3 = null;
      continue;
    }
    if (/^### /.test(line)) {
      if (!currentH2) {
        currentH2 = { heading: "Preamble", body: [], subsections: [] };
        doc.chapters.push(currentH2);
      }
      currentH3 = { heading: line.replace(/^###\s+/, "").trim(), body: [] };
      currentH2.subsections.push(currentH3);
      continue;
    }
    if (currentH3) currentH3.body.push(line);
    else if (currentH2) currentH2.body.push(line);
    else doc.preamble.push(line);
  }

  return {
    title: doc.title,
    preamble: doc.preamble.join("\n").trim(),
    chapters: doc.chapters.map((chapter) => ({
      heading: chapter.heading,
      markdown: chapter.body.join("\n").trim(),
      subsections: chapter.subsections.map((section) => ({
        heading: section.heading,
        markdown: section.body.join("\n").trim(),
      })),
    })),
  };
}

export function parseMdTable(md) {
  const lines = md.split(/\r?\n/).filter((line) => line.startsWith("|"));
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = splitTableRow(lines[0]);
  const rows = lines
    .slice(1)
    .filter((line) => !/^\|\s*[-:| ]+\|$/.test(line))
    .map(splitTableRow);
  return { headers, rows };
}

function splitTableRow(line) {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

export function extractBackticked(text) {
  const names = new Set();
  const re = /`([A-Za-z][A-Za-z0-9_]*)`/g;
  let match;
  while ((match = re.exec(text))) {
    names.add(match[1]);
  }
  return names;
}

export function relatedStem(name) {
  const match = name.match(
    /^(delinq|vic|att|online|date|job|gang|knife|cj|conduct)(\d+)(?:_(.+))?$/,
  );
  if (!match) return name;
  const rest = (match[3] ?? "").replace(/_ever$/, "");
  return rest ? `${match[1]}:${rest}` : match[1];
}

export function chapterHref(heading) {
  const found = CHAPTER_ROUTES.find((route) => route.match.test(heading));
  return found ? found.href : `/${slugify(heading)}`;
}

function topicId(heading) {
  const match = heading.match(/^(\d+\.\d+)\b/);
  return match ? match[1] : null;
}

function yesN(frequencies) {
  if (!frequencies || frequencies.length === 0) return null;
  const observed = frequencies.filter((row) => !row.isMissing);
  const values = new Set(observed.map((row) => row.value));
  if (!values.has("0") || !values.has("1")) return null;
  if ([...values].some((value) => value !== "0" && value !== "1")) return null;
  return observed.find((row) => row.value === "1")?.n ?? null;
}

export function sanitizeHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=/gi, " data-dropped=")
    .replace(/javascript:/gi, "");
}

export function enhanceHtml(html, { variablesByName, topicsById, seenIds }) {
  let out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, level, inner) => {
    const text = inner.replace(/<[^>]+>/g, "");
    return `<h${level} id="${slugify(text)}">${inner}</h${level}>`;
  });

  out = out.replace(/Section\s+(\d+\.\d+)/g, (full, id) => {
    const topic = topicsById.get(id);
    if (!topic) return full;
    return `<a href="${withBase(`/variables/${topic.slug}`)}">Section ${id}</a>`;
  });

  out = out.replace(/<code>([A-Za-z][A-Za-z0-9_]*)<\/code>/g, (full, name) => {
    const variable = variablesByName.get(name);
    if (!variable) return full;
    const needsId = variable.href.startsWith("/weights#") && seenIds && !seenIds.has(name);
    if (needsId) seenIds.add(name);
    const idAttr = needsId ? ` id="${name}"` : "";
    return `<a class="var-link"${idAttr} href="${withBase(variable.href)}"><code>${name}</code></a>`;
  });

  out = out.replace(/<table>/g, '<div class="table-wrap"><table>');
  out = out.replace(
    /<div class="table-wrap"><table>\s*<thead>\s*<tr>\s*<th>Field<\/th>/gi,
    '<div class="table-wrap"><table class="field-table"><thead><tr><th>Field</th>',
  );
  out = out.replace(/<\/table>/g, "</table></div>");
  return sanitizeHtml(out);
}

function extractFenced(md, lang) {
  const re = new RegExp("```" + lang + "\\n([\\s\\S]*?)```");
  const match = md.match(re);
  return match ? match[1].replace(/\n$/, "") : "";
}

export function ingestFromSources({ guideMd, specCsv, freqMd }) {
  guideMd = stripLocalFilePaths(guideMd);
  const split = splitMarkdownSections(guideMd);
  const specRows = parseCsv(specCsv);
  const frequencies = parseFrequencies(freqMd);
  const headingList = listMarkdownHeadings(guideMd);

  const versionMatch = guideMd.match(/Version\s+([0-9.]+)/);
  const nMatch = guideMd.match(/N in the class file is ([\d,]+)/);
  const n = nMatch ? Number(nMatch[1].replace(/,/g, "")) : null;

  const chapters = split.chapters.map((chapter) => {
    const href = chapterHref(chapter.heading);
    const route = CHAPTER_ROUTES.find((item) => item.match.test(chapter.heading));
    return {
      heading: chapter.heading,
      slug: slugify(chapter.heading),
      href,
      nav: route ? route.nav : chapter.heading,
      markdown: chapter.markdown,
      subsections: chapter.subsections.map((section) => ({
        heading: section.heading,
        id: topicId(section.heading),
        slug: slugify(section.heading),
        markdown: section.markdown,
      })),
    };
  });

  const dictChapter = chapters.find((chapter) => chapter.href === "/variables");
  const topics = (dictChapter?.subsections ?? [])
    .filter((section) => section.id)
    .map((section) => ({
      id: section.id,
      heading: section.heading,
      slug: section.slug,
      href: `/variables/${section.slug}`,
      markdown: section.markdown,
    }));

  const topicsById = new Map(topics.map((topic) => [topic.id, topic]));
  const guideMentions = extractBackticked(guideMd);

  const topicForName = new Map();
  for (const topic of topics) {
    for (const name of extractBackticked(`${topic.heading}\n${topic.markdown}`)) {
      if (!topicForName.has(name)) topicForName.set(name, topic);
    }
  }

  const variables = specRows.map((row) => {
    const name = row.class_var;
    const topic = topicForName.get(name);
    const ageRaw = String(row.age ?? "").trim();
    const age = ageRaw === "" ? null : ageRaw;
    const href = topic
      ? `${topic.href}#${name}`
      : guideMentions.has(name) && /^(country|pttype2|sptn00|nh2|weight|resp|eovwt|fovwt|govwt|hovwt|issued|aoutc|hcasetype)/.test(name)
        ? `/weights#${name}`
        : `/variables#${name}`;
    const freq = frequencies[name] ?? [];
    return {
      name,
      domain: row.domain,
      domainLabel: DOMAIN_LABELS[row.domain] ?? row.domain,
      age,
      sourceFile: stripLocalFilePaths(row.source_file),
      originalVar: row.original_var,
      recodeType: row.recode_type,
      question: row.question,
      originalCodes: row.original_codes,
      classCodes: row.class_codes,
      notes: row.notes,
      frequencies: freq,
      yesN: yesN(freq),
      topicSlug: topic ? topic.slug : null,
      topicId: topic ? topic.id : null,
      href,
      stem: relatedStem(name),
    };
  });

  const variablesByName = new Map(variables.map((variable) => [variable.name, variable]));
  const seenIds = new Set();

  const related = {};
  for (const variable of variables) {
    const peers = variables
      .filter((other) => other.stem === variable.stem && other.name !== variable.name)
      .map((other) => ({ name: other.name, href: other.href, age: other.age }));
    related[variable.name] = peers;
  }

  for (const chapter of chapters) {
    chapter.html = enhanceHtml(marked.parse(chapter.markdown || "") || "", {
      variablesByName,
      topicsById,
      seenIds,
    });
    chapter.subsections = chapter.subsections.map((section) => ({
      ...section,
      html: enhanceHtml(marked.parse(section.markdown || "") || "", {
        variablesByName,
        topicsById,
        seenIds,
      }),
    }));
  }

  for (const topic of topics) {
    const names = [...extractBackticked(`${topic.heading}\n${topic.markdown}`)].filter((name) =>
      variablesByName.has(name),
    );
    topic.variableNames = names;
    topic.ages = [
      ...new Set(
        names
          .map((name) => variablesByName.get(name)?.age)
          .filter((age) => age && (/^\d+$/.test(age) || age === "birth")),
      ),
    ];
    topic.html = enhanceHtml(marked.parse(topic.markdown || "") || "", {
      variablesByName,
      topicsById,
      seenIds,
    });
    delete topic.markdown;
  }

  const intro = chapters.find((chapter) => chapter.href === "/introduction");
  const introWhat = intro?.subsections.find((section) => /1\.1/.test(section.heading));
  const introFiles = intro?.subsections.find((section) => /1\.3/.test(section.heading));
  const sweepsTable = introWhat ? parseMdTable(introWhat.markdown) : { rows: [] };
  const filesTable = introFiles ? parseMdTable(introFiles.markdown) : { rows: [] };

  const cite = chapters.find((chapter) => chapter.href === "/cite");
  const citeSection = cite?.subsections.find((section) => /cite/i.test(section.heading));
  const deposits = [];
  if (citeSection) {
    for (const line of citeSection.markdown.split(/\r?\n/)) {
      const item = line.match(/^-\s+(.+)/);
      if (item) deposits.push(item[1].replace(/`/g, ""));
    }
  }

  const resp = {};
  for (const flag of ["resp11", "resp14", "resp17", "resp23"]) {
    const rows = frequencies[flag] ?? [];
    const yes = rows.find((row) => row.value === "1");
    if (yes) resp[flag] = yes.n;
  }
  const observedN = (rows = []) =>
    rows.filter((row) => !row.isMissing).reduce((sum, row) => sum + row.n, 0);
  const n9m = observedN(frequencies.sex);
  const n3 = observedN(frequencies.conduct3);
  if (n9m) resp.obs9m = n9m;
  if (n3) resp.obs3 = n3;

  const weightsChapter = chapters.find((chapter) => chapter.href === "/weights");
  const exampleSection = weightsChapter?.subsections.find((section) => /3\.4/.test(section.heading));
  const examples = exampleSection
    ? {
        r: extractFenced(exampleSection.markdown, "r"),
        stata: extractFenced(exampleSection.markdown, "stata"),
      }
    : { r: "", stata: "" };

  const licence =
    "The file is for teaching. It remains UK Data Service End User Licence data. Do not share it outside the licence under which the source deposits were obtained.";

  const errors = [];
  const ingestedHeadings = [];
  for (const chapter of chapters) {
    ingestedHeadings.push(chapter.heading);
    for (const section of chapter.subsections) ingestedHeadings.push(section.heading);
  }
  for (const heading of headingList) {
    if (!ingestedHeadings.includes(heading)) {
      errors.push(`Heading not ingested: ${heading}`);
    }
  }
  for (const variable of variables) {
    if (!guideMentions.has(variable.name)) {
      errors.push(`Spec variable not found in guide: ${variable.name}`);
    }
  }
  for (const name of Object.keys(frequencies)) {
    const inSpec = variablesByName.has(name);
    const inGuide = guideMentions.has(name);
    if (!inSpec && !inGuide) {
      errors.push(`Frequency variable has no spec/guide home: ${name}`);
    }
  }
  const slugs = topics.map((topic) => topic.slug);
  if (new Set(slugs).size !== slugs.length) {
    errors.push("Duplicate topic slugs");
  }

  const searchIndex = [
    ...variables.map((variable) => ({
      type: "variable",
      title: variable.name,
      subtitle: variable.question,
      tokens: [
        variable.name,
        variable.originalVar,
        variable.question,
        variable.domain,
        variable.domainLabel,
        variable.notes,
        variable.age ?? "",
      ]
        .join(" ")
        .toLowerCase(),
      href: withBase(variable.href),
      age: variable.age,
      domain: variable.domain,
    })),
    ...topics.map((topic) => ({
      type: "topic",
      title: topic.heading,
      subtitle: "Variable dictionary",
      tokens: `${topic.heading} ${topic.variableNames.join(" ")}`.toLowerCase(),
      href: withBase(topic.href),
    })),
    ...chapters.map((chapter) => ({
      type: "chapter",
      title: chapter.heading,
      subtitle: "User guide",
      tokens: [
        chapter.heading,
        chapter.markdown,
        ...chapter.subsections.map((section) => `${section.heading} ${section.markdown}`),
      ]
        .join(" ")
        .toLowerCase(),
      href: withBase(chapter.href),
    })),
  ];

  for (const chapter of chapters) {
    delete chapter.markdown;
    for (const section of chapter.subsections) delete section.markdown;
  }

  const payload = {
    meta: {
      title: split.title,
      version: versionMatch ? versionMatch[1] : "1.0",
      n,
      licence,
      deposits,
      files: filesTable.rows.map((row) => ({ file: stripMd(row[0]), contents: stripMd(row[1]) })),
      sweeps: sweepsTable.rows.map((row) => ({
        sweep: stripMd(row[0]),
        age: stripMd(row[1]),
        fieldwork: stripMd(row[2]),
      })),
      respondents: resp,
      examples,
    },
    chapters,
    topics,
    variables,
    related,
    frequencies,
    searchIndex,
    errors,
  };

  return payload;
}

function stripMd(text) {
  return String(text ?? "")
    .replace(/`/g, "")
    .trim();
}

export function writeIngest(payload, outDir = path.join(SITE_ROOT, "src/data")) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(SITE_ROOT, "public"), { recursive: true });

  const { frequencies, searchIndex, errors, ...guide } = payload;
  fs.writeFileSync(path.join(outDir, "guide.json"), JSON.stringify(guide, null, 2));
  fs.writeFileSync(path.join(outDir, "variables.json"), JSON.stringify(payload.variables, null, 2));
  fs.writeFileSync(path.join(outDir, "frequencies.json"), JSON.stringify(frequencies, null, 2));
  fs.writeFileSync(path.join(outDir, "related.json"), JSON.stringify(payload.related, null, 2));
  fs.writeFileSync(
    path.join(SITE_ROOT, "public/search-index.json"),
    JSON.stringify(searchIndex),
  );
  return { errors };
}

function isMain() {
  const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return entry === fileURLToPath(import.meta.url);
}

if (isMain()) {
  const guideMd = fs.readFileSync(path.join(PROJECT_ROOT, "docs/mcs_class_user_guide.md"), "utf8");
  const specCsv = fs.readFileSync(path.join(PROJECT_ROOT, "scripts/recode_spec.csv"), "utf8");
  const freqMd = fs.readFileSync(path.join(PROJECT_ROOT, "docs/class_file_frequencies.md"), "utf8");
  const payload = ingestFromSources({ guideMd, specCsv, freqMd });
  if (payload.errors.length > 0) {
    console.error("Ingest parity failed:\n" + payload.errors.map((e) => `  - ${e}`).join("\n"));
    process.exit(1);
  }
  writeIngest(payload);
  console.log(
    `Ingested ${payload.variables.length} variables, ${payload.topics.length} topics, N=${payload.meta.n}`,
  );
}
