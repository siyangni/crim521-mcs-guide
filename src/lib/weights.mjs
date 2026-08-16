/** Survey-design recommendations from user-guide §3.3. */

const BY_AGE = {
  11: { flag: "resp11", uk: "eovwt2", country: "eovwt1", sweep: "MCS5" },
  14: { flag: "resp14", uk: "fovwt2", country: "fovwt1", sweep: "MCS6" },
  17: { flag: "resp17", uk: "govwt2", country: "govwt1", sweep: "MCS7" },
  23: { flag: "resp23", uk: "hovwt2", country: "hovwt1", sweep: "MCS8" },
};

export const WEIGHT_AGES = [11, 14, 17, 23];

export function recommendWeight(age, geography) {
  const nAge = Number(age);
  const spec = BY_AGE[nAge];
  if (!spec) {
    throw new Error(`Unsupported outcome age: ${age}`);
  }
  if (geography === "gb") {
    if (nAge !== 23) {
      throw new Error("Great Britain-only weight is defined for age 23");
    }
    return {
      age: 23,
      geography: "gb",
      sweep: spec.sweep,
      restrict: "resp23 == 1 and country in 1-3",
      restrictHuman: "MCS8 respondents in England, Wales or Scotland",
      weight: "hovwtgb",
      note: "Great Britain only at age 23. Exclude Northern Ireland (country == 4).",
    };
  }
  if (geography !== "uk" && geography !== "country") {
    throw new Error(`Unsupported geography: ${geography}`);
  }
  const uk = geography === "uk";
  return {
    age: nAge,
    geography,
    sweep: spec.sweep,
    restrict: `${spec.flag} == 1`,
    restrictHuman: `Cohort members with the age-${nAge} interview (${spec.flag} == 1)`,
    weight: uk ? spec.uk : spec.country,
    note: uk
      ? "Overall UK weight. Combines the sample design weight and a non-response adjustment."
      : "Overall single-country weight. Still restrict the sample to the country you mean to describe.",
  };
}

export function designCode(rec) {
  const subset =
    rec.geography === "gb"
      ? "subset(mcs, resp23 == 1 & country %in% 1:3)"
      : `subset(mcs, ${rec.restrict.replace("==", "==")})`;
  const rSubset =
    rec.geography === "gb"
      ? "subset(mcs, resp23 == 1 & country %in% 1:3)"
      : `subset(mcs, ${rec.restrict})`;
  const stataIf =
    rec.geography === "gb"
      ? "if resp23==1 & inlist(country,1,2,3)"
      : `if ${rec.restrict.replace(/ == /g, "==")}`;

  const r = [
    "library(haven)",
    "library(survey)",
    'mcs <- read_dta("mcs_class.dta")',
    "des <- svydesign(",
    "  ids     = ~sptn00,",
    "  strata  = ~pttype2,",
    `  weights = ~${rec.weight},`,
    "  fpc     = ~nh2,",
    "  nest    = TRUE,",
    `  data    = ${rSubset}`,
    ")",
  ].join("\n");

  const stata = [
    "use mcs_class.dta, clear",
    `svyset sptn00 [pweight=${rec.weight}], strata(pttype2) fpc(nh2) singleunit(centered)`,
    `svy, subpop(${stataIf}): mean <outcome>`,
  ].join("\n");

  return { r, stata, subset };
}
