import assert from "node:assert/strict";
import test from "node:test";
import {
  AGE_STOPS,
  findAgeStop,
  isAgeStopActive,
  stopDetail,
  variableMatchesStop,
} from "../src/lib/ages.mjs";

test("every spine stop is an age catalog, including 9 months", () => {
  assert.equal(AGE_STOPS.length, 6);
  const nine = findAgeStop("9m");
  assert.equal(nine.href, "/ages/9m");
  assert.notEqual(nine.href, "/introduction");
  for (const stop of AGE_STOPS) {
    assert.match(stop.href, /^\/ages\//);
  }
});

test("spine labels use the same count format on every stop", () => {
  const respondents = {
    obs9m: 19470,
    obs3: 14938,
    resp11: 13436,
    resp14: 11719,
    resp17: 10343,
    resp23: 9675,
  };
  const details = AGE_STOPS.map((stop) => stopDetail(stop, respondents));
  assert.deepEqual(details, [
    "19,470 with data",
    "14,938 with data",
    "13,436 with data",
    "11,719 with data",
    "10,343 with data",
    "9,675 with data",
  ]);
  for (const detail of details) {
    assert.match(detail, /^\d{1,3}(,\d{3})* with data$/);
  }
});

test("9 months highlights on its catalog page, not on Introduction", () => {
  const nine = findAgeStop("9m");
  assert.equal(isAgeStopActive(nine, "/ages/9m"), true);
  assert.equal(isAgeStopActive(nine, "/ages/9m/"), true);
  assert.equal(isAgeStopActive(nine, "/introduction"), false);
  assert.equal(isAgeStopActive(findAgeStop("3"), "/ages/3"), true);
  assert.equal(isAgeStopActive(findAgeStop("11"), "/ages/11"), true);
  assert.equal(isAgeStopActive(findAgeStop("11"), "/variables/delinquent-attitudes-age-11-and-age-14"), false);
  assert.equal(isAgeStopActive(findAgeStop("14"), "/variables/delinquent-attitudes-age-11-and-age-14"), false);
});

test("9 months catalog includes birth-tagged variables", () => {
  const nine = findAgeStop("9m");
  assert.equal(variableMatchesStop("birth", nine), true);
  assert.equal(variableMatchesStop("9m", nine), false);
  assert.equal(variableMatchesStop("3", nine), false);
  assert.equal(variableMatchesStop("birth", findAgeStop("3")), false);
});
