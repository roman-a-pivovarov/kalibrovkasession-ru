import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  importPublicPackage,
  parseDeliveredFile,
  parseEditorial,
  parseImportState,
} from "../src/content/public-package.ts";

type Paths = {
  packagePath: string;
  deliveredPath: string;
  statePath: string;
  editorialPath: string;
};

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeJson(file: string, value: unknown): void {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function runImport(paths: Paths): { ok: true; unchanged: boolean } | { ok: false; errors: string[] } {
  const delivered = parseDeliveredFile(readJson(paths.deliveredPath));
  const state = parseImportState(readJson(paths.statePath));
  const editorial = parseEditorial(readJson(paths.editorialPath));
  const errors = [
    ...(!delivered.ok ? delivered.errors : []),
    ...(!state.ok ? state.errors : []),
    ...(!editorial.ok ? editorial.errors : []),
  ];
  if (!delivered.ok || !state.ok || !editorial.ok) {
    return { ok: false, errors };
  }
  const plan = importPublicPackage(
    delivered.value,
    state.value,
    readJson(paths.packagePath),
    editorial.value,
  );
  if (!plan.ok) return plan;
  if (!plan.value.unchanged) {
    writeJson(paths.deliveredPath, plan.value.delivered);
    writeJson(paths.statePath, plan.value.state);
  }
  return { ok: true, unchanged: plan.value.unchanged };
}

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function main(): void {
  const packagePath = argument("--package");
  if (!packagePath) {
    console.error("Нужен путь к пакету: --package <file>");
    process.exit(1);
  }
  const result = runImport({
    packagePath,
    deliveredPath: argument("--delivered") ?? "src/content/delivered-cases.json",
    statePath: argument("--state") ?? "content/import-state.json",
    editorialPath: argument("--editorial") ?? "src/content/editorial.json",
  });
  if (!result.ok) {
    for (const error of result.errors) console.error(error);
    console.error("Импорт остановлен. Доставленные истории и очередь не изменены. Выпуск не выполняется.");
    process.exit(1);
  }
  console.log(
    result.unchanged
      ? "Пакет уже применён. Повторов нет. Выпуск не выполняется."
      : "Пакет принят в репозиторий. Выпуск на сайт не выполняется.",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
