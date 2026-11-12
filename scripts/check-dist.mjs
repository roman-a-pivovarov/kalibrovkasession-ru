import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = "dist";
const required = [
  "index.html",
  "corporate/index.html",
  "personal/index.html",
  "approach/index.html",
  "cases/index.html",
  "roman/index.html",
];

const forbiddenParts = [
  `${path.sep}private${path.sep}`,
  `${path.sep}docs${path.sep}`,
  `${path.sep}src${path.sep}`,
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}.github${path.sep}`,
  `${path.sep}.git${path.sep}`,
];

const forbiddenNames = new Set([
  "package.json",
  "package-lock.json",
  "import-state.json",
  "editorial.json",
  "delivered-cases.json",
  "REGISTRY.md",
  ".env",
]);

function walk(dir, files) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full, files);
      continue;
    }
    files.push(full);
  }
}

if (!existsSync(root)) {
  console.error("Нет каталога dist/. Сначала соберите сайт.");
  process.exit(1);
}

const files = [];
walk(root, files);
let failed = false;

for (const relative of required) {
  if (!existsSync(path.join(root, relative))) {
    console.error(`В сборке нет страницы ${relative}`);
    failed = true;
  }
}

for (const file of files) {
  const base = path.basename(file);
  if (base.endsWith(".md") || forbiddenNames.has(base) || base.startsWith(".env")) {
    console.error(`В сборку попал служебный файл ${path.relative(root, file)}`);
    failed = true;
  }
  const marked = `${path.sep}${file}`;
  for (const part of forbiddenParts) {
    if (marked.includes(part)) {
      console.error(`В сборку попал закрытый путь ${path.relative(root, file)}`);
      failed = true;
    }
  }
}

const htmlFiles = files.filter((file) => file.endsWith(".html"));
const hrefs = new Set();
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (href.startsWith("/") && !href.startsWith("//")) hrefs.add(href);
  }
}

for (const href of hrefs) {
  const [pathname] = href.split("#");
  if (!pathname || pathname.startsWith("/assets/")) continue;
  const relative = pathname.replace(/^\//, "");
  const candidates = [
    path.join(root, relative),
    path.join(root, relative, "index.html"),
  ];
  if (!candidates.some((candidate) => existsSync(candidate))) {
    console.error(`Ссылка ${href} не ведёт на файл в dist/`);
    failed = true;
  }
}

if (failed) process.exit(1);
