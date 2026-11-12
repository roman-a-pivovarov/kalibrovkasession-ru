import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const factsPath = "src/content/facts.ts";
const facts = readFileSync(factsPath, "utf8");
const tokens = new Set();

for (const match of facts.matchAll(/\b\d[\d_]{2,}\b/g)) {
  const digits = match[0].replaceAll("_", "");
  if (digits.length < 3) continue;
  tokens.add(digits);
  tokens.add(digits.replace(/\B(?=(\d{3})+(?!\d))/g, " "));
  tokens.add(digits.replace(/\B(?=(\d{3})+(?!\d))/g, "_"));
}

for (const match of facts.matchAll(/"([^"\n]*\d[^"\n]*)"/g)) {
  const value = match[1].trim();
  if (value.length >= 2 && value.length <= 48) tokens.add(value);
}

function includesFact(text, token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (/^\d+$/.test(token)) {
    return new RegExp(`(?<![\\p{L}\\p{N}_-])${escaped}(?![\\p{L}\\p{N}_-])`, "u").test(text);
  }
  return text.includes(token);
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules" || name === "dist" || name === "private") continue;
      walk(full);
      continue;
    }
    if (!/\.(astro|ts|js|mjs|css)$/.test(name)) continue;
    const rel = path.relative(process.cwd(), full).replaceAll("\\", "/");
    if (rel === factsPath) continue;
    const text = readFileSync(full, "utf8");
    if (text.includes("\u20bd")) {
      console.error(`Знак цены вне ${factsPath}: ${rel}`);
      process.exitCode = 1;
    }
    for (const token of tokens) {
      if (token && includesFact(text, token)) {
        console.error(`Повторяющийся факт «${token}» вне ${factsPath}: ${rel}`);
        process.exitCode = 1;
      }
    }
  }
}

walk("src");
walk("scripts");
if (process.exitCode) process.exit(process.exitCode);
