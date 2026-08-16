import assert from "node:assert/strict";
import test from "node:test";
import { designCode, recommendWeight } from "../src/lib/weights.mjs";

test("age 14 UK uses resp14 and fovwt2", () => {
  const rec = recommendWeight(14, "uk");
  assert.equal(rec.restrict, "resp14 == 1");
  assert.equal(rec.weight, "fovwt2");
  const code = designCode(rec);
  assert.match(code.r, /weights = ~fovwt2/);
  assert.match(code.r, /subset\(mcs, resp14 == 1\)/);
  assert.match(code.stata, /pweight=fovwt2/);
  assert.match(code.stata, /subpop\(if resp14==1\)/);
});

test("age 11 one-country uses eovwt1", () => {
  const rec = recommendWeight(11, "country");
  assert.equal(rec.weight, "eovwt1");
  assert.equal(rec.restrict, "resp11 == 1");
});

test("age 23 GB uses hovwtgb and countries 1-3", () => {
  const rec = recommendWeight(23, "gb");
  assert.equal(rec.weight, "hovwtgb");
  assert.match(rec.restrict, /country in 1-3/);
  const code = designCode(rec);
  assert.match(code.r, /country %in% 1:3/);
  assert.match(code.stata, /inlist\(country,1,2,3\)/);
});

test("GB is rejected for ages other than 23", () => {
  assert.throws(() => recommendWeight(14, "gb"), /age 23/);
});
