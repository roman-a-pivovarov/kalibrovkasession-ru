import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  assertHomeSelection,
  parseDeliveredFile,
  parseEditorial,
  parseImportState,
  withEditorial,
} from "../src/content/public-package.ts";

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function checkPublishedFiles(paths: {
  deliveredPath: string;
  statePath: string;
  editorialPath: string;
}): string[] {
  const delivered = parseDeliveredFile(readJson(paths.deliveredPath));
  const state = parseImportState(readJson(paths.statePath));
  const editorial = parseEditorial(readJson(paths.editorialPath));
  const errors = [
    ...(!delivered.ok ? delivered.errors : []),
    ...(!state.ok ? state.errors : []),
    ...(!editorial.ok ? editorial.errors : []),
  ];
  if (!delivered.ok || !state.ok || !editorial.ok) return errors;
  if (delivered.value.packageVersion !== state.value.lastDeliveredPackageVersion) {
    errors.push("Версия доставленного набора и состояние импорта разошлись.");
  }
  const selection = assertHomeSelection(
    withEditorial(delivered.value.records, editorial.value),
  );
  if (selection) errors.push(selection);
  return errors;
}

function main(): void {
  const errors = checkPublishedFiles({
    deliveredPath: "src/content/delivered-cases.json",
    statePath: "content/import-state.json",
    editorialPath: "src/content/editorial.json",
  });
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
