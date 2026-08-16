export function formatN(n) {
  if (n == null || n === "") return "—";
  return Number(n).toLocaleString("en-GB");
}

export function ageLabel(age) {
  if (age == null || age === "") return "Baseline";
  if (age === "birth") return "Birth";
  return `Age ${age}`;
}

export function domainLabel(domain, fallback) {
  return fallback || domain;
}
