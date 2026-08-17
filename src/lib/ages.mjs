import { formatN } from "./format.mjs";

/** One catalog stop on the age spine. Keep hrefs on /ages/* so every click is the same page type. */
export const AGE_STOPS = [
  {
    key: "9m",
    label: "9 months",
    shortLabel: "9m",
    sweep: "MCS1",
    year: "2001",
    href: "/ages/9m",
    countKey: "obs9m",
    matchAges: ["birth"],
    lede: "First-recorded sex and ethnicity in the class file. MCS1 began in 2001.",
  },
  {
    key: "3",
    label: "Age 3",
    shortLabel: "3",
    sweep: "MCS2",
    year: "2004",
    href: "/ages/3",
    countKey: "obs3",
    matchAges: ["3"],
    lede: "Every class-file variable attached to age 3. MCS2 · 2004.",
  },
  {
    key: "11",
    label: "Age 11",
    shortLabel: "11",
    sweep: "MCS5",
    year: "2012",
    href: "/ages/11",
    countKey: "resp11",
    matchAges: ["11"],
    lede: "Every class-file variable attached to age 11. MCS5 · 2012.",
  },
  {
    key: "14",
    label: "Age 14",
    shortLabel: "14",
    sweep: "MCS6",
    year: "2015",
    href: "/ages/14",
    countKey: "resp14",
    matchAges: ["14"],
    lede: "Every class-file variable attached to age 14. MCS6 · 2015.",
  },
  {
    key: "17",
    label: "Age 17",
    shortLabel: "17",
    sweep: "MCS7",
    year: "2018",
    href: "/ages/17",
    countKey: "resp17",
    matchAges: ["17"],
    lede: "Every class-file variable attached to age 17. MCS7 · 2018.",
  },
  {
    key: "23",
    label: "Age 23",
    shortLabel: "23",
    sweep: "MCS8",
    year: "2023",
    href: "/ages/23",
    countKey: "resp23",
    matchAges: ["23"],
    lede: "Every class-file variable attached to age 23. MCS8 · 2023.",
  },
];

export function findAgeStop(key) {
  return AGE_STOPS.find((stop) => stop.key === key) ?? null;
}

export function normalizePath(pathname) {
  return (pathname || "/").replace(/\/$/, "") || "/";
}

export function isAgeStopActive(stop, currentPath) {
  const path = normalizePath(currentPath);
  return path === stop.href || path.endsWith(`/ages/${stop.key}`);
}

export function variableMatchesStop(variableAge, stop) {
  return stop.matchAges.includes(variableAge);
}

export function stopDetail(stop, respondents = {}) {
  const n = respondents[stop.countKey];
  if (n) return `${formatN(n)} with data`;
  return `${stop.sweep} · ${stop.year}`;
}
