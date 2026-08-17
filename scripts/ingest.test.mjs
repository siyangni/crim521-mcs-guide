import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  enhanceHtml,
  extractBackticked,
  ingestFromSources,
  listMarkdownHeadings,
  parseCsv,
  parseFrequencies,
  relatedStem,
  slugify,
  splitMarkdownSections,
  stripLocalFilePaths,
} from "./ingest.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const guideMd = fs.readFileSync(path.join(root, "docs/mcs_class_user_guide.md"), "utf8");
const specCsv = fs.readFileSync(path.join(root, "scripts/recode_spec.csv"), "utf8");
const freqMd = fs.readFileSync(path.join(root, "docs/class_file_frequencies.md"), "utf8");

test("parseCsv reads recode_spec headers and mcsid", () => {
  const rows = parseCsv(specCsv);
  assert.equal(rows[0].class_var, "mcsid");
  assert.ok(rows.find((row) => row.class_var === "delinq14_shoplift"));
  assert.ok(rows.length > 100);
});

test("parseFrequencies reads sex and missing counts", () => {
  const freq = parseFrequencies(freqMd);
  assert.ok(freq.sex);
  const missing = freq.sex.find((row) => row.isMissing);
  assert.equal(missing.n, 35);
  const males = freq.sex.find((row) => row.value === "1");
  assert.equal(males.n, 9994);
});

test("stripLocalFilePaths keeps only the file name", () => {
  assert.equal(stripLocalFilePaths("w2/mcs2_parent_interview.dta"), "mcs2_parent_interview.dta");
  assert.equal(stripLocalFilePaths("`w8/mcs8_23y_cm_survey.dta`"), "`mcs8_23y_cm_survey.dta`");
  assert.equal(stripLocalFilePaths('read_dta("output/mcs_class.dta")'), 'read_dta("mcs_class.dta")');
  assert.equal(
    stripLocalFilePaths("https://cls.ucl.ac.uk/data_documentation/longitudinal-family-file-guide/"),
    "https://cls.ucl.ac.uk/data_documentation/longitudinal-family-file-guide/",
  );
});

test("slugify drops section numbers", () => {
  assert.equal(slugify("5.12 Delinquency, age 14"), "delinquency-age-14");
  assert.equal(slugify("5.1 Identifiers"), "identifiers");
});

test("relatedStem groups shoplifting across ages", () => {
  assert.equal(relatedStem("delinq11_shoplift_ever"), relatedStem("delinq14_shoplift"));
  assert.equal(relatedStem("delinq14_shoplift"), relatedStem("delinq17_shoplift"));
  assert.notEqual(relatedStem("delinq14_graffiti"), relatedStem("att14_graffiti"));
  assert.equal(relatedStem("job14"), relatedStem("job17"));
  assert.equal(relatedStem("gang14"), relatedStem("gang17"));
  assert.equal(relatedStem("knife17"), relatedStem("knife23"));
});

test("field-detail tables keep a matching table-wrap", () => {
  const html = enhanceHtml(
    "<table><thead><tr><th>Field</th><th>Detail</th></tr></thead><tbody><tr><td>A</td><td>B</td></tr></tbody></table>",
    { variablesByName: new Map(), topicsById: new Map(), seenIds: new Set() },
  );
  const opens = (html.match(/table-wrap/g) || []).length;
  const closes = (html.match(/<\/div>/g) || []).length;
  assert.equal(opens, 1);
  assert.equal(opens, closes);
  assert.match(html, /class="field-table"/);
});

test("splitMarkdownSections keeps every ## and ### heading", () => {
  const split = splitMarkdownSections(guideMd);
  const headings = listMarkdownHeadings(guideMd);
  const ingested = [];
  for (const chapter of split.chapters) {
    ingested.push(chapter.heading);
    for (const section of chapter.subsections) ingested.push(section.heading);
  }
  assert.deepEqual(ingested, headings);
});

test("full ingest is parity-clean and links shoplift", () => {
  const payload = ingestFromSources({ guideMd, specCsv, freqMd });
  assert.deepEqual(payload.errors, []);
  assert.equal(payload.meta.n, 19505);
  assert.equal(payload.meta.version, "1.0");
  assert.equal(payload.meta.respondents.resp14, 11719);
  const observedN = (rows = []) =>
    rows.filter((row) => !row.isMissing).reduce((sum, row) => sum + row.n, 0);
  assert.equal(payload.meta.respondents.obs9m, observedN(payload.frequencies.sex));
  assert.equal(payload.meta.respondents.obs3, observedN(payload.frequencies.conduct3));
  assert.ok(!payload.variables.some((variable) => variable.name === "resp9m" || variable.name === "resp3"));

  const score = payload.variables.find((variable) => variable.name === "conduct3_score");
  assert.equal(score.yesN, null);
  const band = payload.variables.find((variable) => variable.name === "conduct3");
  assert.equal(band.yesN, 4956);

  const sexTopic = payload.topics.find((topic) => topic.slug === "sex");
  assert.ok(sexTopic.ages.includes("birth"));

  const shoplift = payload.variables.find((row) => row.name === "delinq14_shoplift");
  assert.ok(shoplift);
  assert.equal(shoplift.originalVar, "fcstol00");
  assert.equal(shoplift.topicSlug, "delinquency-age-14");
  assert.equal(shoplift.href, "/variables/delinquency-age-14#delinq14_shoplift");

  const race4 = payload.variables.find((row) => row.name === "race4");
  assert.ok(race4.href.includes("ethnic"));

  const topicSlugs = new Set(payload.topics.map((topic) => topic.slug));
  assert.ok(topicSlugs.has("delinquency-age-14"));
  assert.ok(topicSlugs.has("ever-criminal-justice-contact-age-17"));

  const mentions = extractBackticked(guideMd);
  for (const variable of payload.variables) {
    assert.ok(mentions.has(variable.name), variable.name);
  }

  const weights = payload.chapters.find((chapter) => chapter.href === "/weights");
  const weightsHtml = [
    weights?.html,
    ...(weights?.subsections.map((section) => section.html) ?? []),
  ].join("");
  assert.match(weightsHtml, /id="eovwt2"/);
  assert.match(weightsHtml, /id="country"/);

  const job14 = payload.related.job14 ?? [];
  assert.ok(job14.some((item) => item.name === "job17"));

  const construction = payload.chapters.find((chapter) => chapter.href === "/construction");
  const constructionHtml = [
    construction?.html,
    ...(construction?.subsections.map((section) => section.html) ?? []),
  ].join("");
  assert.doesNotMatch(constructionHtml, /w[0-9]\//);
  assert.match(constructionHtml, /mcs_longitudinal_cm_file\.dta/);
  assert.match(constructionHtml, /mcs2_parent_interview\.dta/);
  assert.match(constructionHtml, /mcs_core\.dta/);

  const topicHtml = payload.topics.map((topic) => topic.html).join("\n");
  const otherTopicFiles = [...topicHtml.matchAll(/[A-Za-z0-9_.-]+\.(?:dta|csv|md|R)\b/g)]
    .map((match) => match[0])
    .filter((name) => name !== "mcs_class.dta" && name !== "mcs_class.csv");
  assert.deepEqual(otherTopicFiles, []);
});
