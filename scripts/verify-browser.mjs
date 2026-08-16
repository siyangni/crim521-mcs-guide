import { mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire("/home/siyang/.nvm/versions/node/v20.20.2/lib/node_modules/playwright/package.json");
const { chromium } = require("playwright");

const base = process.env.SITE_URL ?? "http://127.0.0.1:4321";
const out = path.resolve("scripts/screenshots");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome-stable",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function shot(page, name) {
  await page.screenshot({ path: path.join(out, name), fullPage: true });
}

const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto(base + "/", { waitUntil: "networkidle" });
const licence = await page.locator(".licence-bar").innerText();
if (!/End User Licence/.test(licence)) errors.push("Home missing licence bar");
if (!(await page.locator(".hero-stat .num").innerText()).includes("19,505")) {
  errors.push("Home missing N");
}
await shot(page, "home-desktop.png");

await page.click('a[href="/weights"]');
await page.waitForURL("**/weights");
const weight = await page.locator("#w-weight").innerText();
const restrict = await page.locator("#w-restrict").innerText();
if (weight !== "fovwt2") errors.push(`Default weight was ${weight}`);
if (restrict !== "resp14 == 1") errors.push(`Default restrict was ${restrict}`);
await page.locator('label:has(input[name="age"][value="11"])').click();
await page.waitForTimeout(100);
if ((await page.locator("#w-weight").innerText()) !== "eovwt2") {
  errors.push("Age 11 UK did not switch to eovwt2");
}
await page.locator('label:has(input[name="geo"][value="country"])').click();
await page.waitForTimeout(100);
if ((await page.locator("#w-weight").innerText()) !== "eovwt1") {
  errors.push("Age 11 country did not switch to eovwt1");
}
await shot(page, "weights-desktop.png");

await page.click("[data-open-search]");
await page.waitForSelector("#search-dialog[open]");
await page.fill("#search-input", "fcstol00");
await page.waitForTimeout(150);
const href = await page.locator("#search-results a").first().getAttribute("href");
if (!href || !href.includes("delinq14_shoplift")) {
  errors.push(`Search fcstol00 landed on ${href}`);
}
await page.locator("#search-results a").first().click();
await page.waitForURL("**/delinquency-age-14**");
if (!(await page.locator("#delinq14_shoplift").count())) {
  errors.push("Shoplift block missing");
}
await shot(page, "shoplift-desktop.png");

await page.goto(base + "/variables", { waitUntil: "networkidle" });
await page.fill("#var-q", "race4");
await page.waitForTimeout(100);
const visible = await page.locator("[data-row]").evaluateAll((nodes) =>
  nodes.filter((node) => node instanceof HTMLElement && !node.hidden && node.offsetParent !== null)
    .length,
);
if (visible !== 1) errors.push(`race4 filter showed ${visible} rows`);
await shot(page, "variables-desktop.png");

await page.setViewportSize({ width: 375, height: 812 });
await page.goto(base + "/", { waitUntil: "networkidle" });
await shot(page, "home-mobile.png");
await page.goto(base + "/weights", { waitUntil: "networkidle" });
await shot(page, "weights-mobile.png");
await page.click("[data-toggle-nav]");
const navOpen = await page.evaluate(() => document.body.classList.contains("nav-open"));
if (!navOpen) errors.push("Mobile menu did not open");
await shot(page, "nav-mobile.png");

await browser.close();

if (errors.length) {
  console.error("VERIFY FAIL\n" + errors.map((e) => `- ${e}`).join("\n"));
  process.exit(1);
}
console.log("VERIFY PASS");
console.log("Screenshots in scripts/screenshots/");
