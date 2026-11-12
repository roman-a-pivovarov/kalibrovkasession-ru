import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runImport } from "../../scripts/import-public-package.ts";
import {
  importPublicPackage,
  type DeliveredFile,
  type Editorial,
  type ImportState,
} from "./public-package.ts";

const emptyDelivered: DeliveredFile = { packageVersion: null, records: [] };
const emptyState: ImportState = {
  lastDeliveredPackageVersion: null,
  lastPublishedPackageVersion: null,
  queue: [],
};
const editorial: Editorial = { featuredIds: ["north-plant"] };

function story(overrides: Record<string, unknown> = {}) {
  return {
    id: "north-plant",
    contentVersion: "1",
    purpose: "corporate-work",
    format: "audit",
    client: "Север",
    industry: "Производство",
    period: "2024",
    task: "Понять, где расходится план и работа цеха",
    work: "Разбор документов и разговор с руководителями",
    role: "Вёл аудит",
    result: null,
    summary: "Коротко об аудите цеха.",
    detail: "Подробно об аудите цеха.",
    media: [],
    collections: ["corporate", "cases"],
    publicationPermitted: true,
    publicEdition: true,
    ...overrides,
  };
}

function pack(records: unknown[], extras: Record<string, unknown> = {}) {
  return {
    packageVersion: "2026-11-12.1",
    complete: true,
    records,
    removals: [],
    ...extras,
  };
}

function apply(
  input: unknown,
  delivered: DeliveredFile = emptyDelivered,
  state: ImportState = emptyState,
  selection: Editorial = editorial,
) {
  return importPublicPackage(delivered, state, input, selection);
}

test("разрешённая история доставляется один раз и сохраняет формат", () => {
  const first = apply(pack([story()]));
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.value.delivered.records.length, 1);
  assert.equal(first.value.delivered.records[0]?.format, "audit");
  assert.equal(first.value.state.lastPublishedPackageVersion, null);

  const second = apply(pack([story()]), first.value.delivered, first.value.state);
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.value.unchanged, true);
  assert.equal(second.value.delivered.records.length, 1);
});

test("повтор того же пакета не создаёт дубль", () => {
  const once = apply(pack([story(), story({ id: "south-office", contentVersion: "1" })]));
  assert.equal(once.ok, true);
  if (!once.ok) return;
  const twice = apply(
    pack([story(), story({ id: "south-office", contentVersion: "1" })]),
    once.value.delivered,
    once.value.state,
  );
  assert.equal(twice.ok, true);
  if (!twice.ok) return;
  assert.deepEqual(
    twice.value.delivered.records.map((item) => item.id),
    ["north-plant", "south-office"],
  );
});

test("выбор для главной не берётся из пакета и переживает новую редакцию", () => {
  const smuggled = apply(pack([story({ featured: true })]));
  assert.equal(smuggled.ok, false);

  const first = apply(pack([story()]));
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const next = apply(
    pack(
      [story({ contentVersion: "2", summary: "Обновлённый короткий текст." })],
      { packageVersion: "2026-11-12.2" },
    ),
    first.value.delivered,
    first.value.state,
  );
  assert.equal(next.ok, true);
  if (!next.ok) return;
  assert.equal(next.value.delivered.records[0]?.summary, "Обновлённый короткий текст.");
  assert.equal("featured" in (next.value.delivered.records[0] ?? {}), false);
});

test("неполный пакет и пропуск истории не снимают уже доставленное", () => {
  const first = apply(pack([story()]));
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const incomplete = apply(
    { packageVersion: "2026-11-12.2", complete: false, records: [], removals: [] },
    first.value.delivered,
    first.value.state,
  );
  assert.equal(incomplete.ok, false);
  const omitted = apply(
    pack([story({ id: "other-work" })], { packageVersion: "2026-11-12.2" }),
    first.value.delivered,
    first.value.state,
  );
  assert.equal(omitted.ok, true);
  if (!omitted.ok) return;
  assert.deepEqual(
    omitted.value.delivered.records.map((item) => item.id),
    ["north-plant", "other-work"],
  );
});

test("снятие без основания не меняет набор, с основанием снимает", () => {
  const first = apply(pack([story()]));
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const blocked = apply(
    pack([], {
      packageVersion: "2026-11-12.2",
      removals: [{ id: "north-plant", basis: " " }],
    }),
    first.value.delivered,
    first.value.state,
  );
  assert.equal(blocked.ok, false);
  const removed = apply(
    pack([], {
      packageVersion: "2026-11-12.2",
      removals: [{ id: "north-plant", basis: "Публикация отозвана владельцем" }],
    }),
    first.value.delivered,
    first.value.state,
  );
  assert.equal(removed.ok, true);
  if (!removed.ok) return;
  assert.equal(removed.value.delivered.records.length, 0);
  assert.equal(removed.value.state.lastPublishedPackageVersion, null);
});

test("новая редакция без разрешения не заменяет прежний текст", () => {
  const first = apply(pack([story()]));
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const held = apply(
    pack(
      [
        story({
          contentVersion: "2",
          summary: "Неразрешённый текст.",
          publicationPermitted: false,
        }),
      ],
      { packageVersion: "2026-11-12.2" },
    ),
    first.value.delivered,
    first.value.state,
  );
  assert.equal(held.ok, true);
  if (!held.ok) return;
  assert.equal(held.value.delivered.records[0]?.summary, "Коротко об аудите цеха.");
  assert.equal(held.value.state.queue[0]?.stage, "prepared");
  const again = apply(
    pack(
      [
        story({
          contentVersion: "2",
          summary: "Неразрешённый текст.",
          publicationPermitted: false,
        }),
      ],
      { packageVersion: "2026-11-12.2" },
    ),
    held.value.delivered,
    held.value.state,
  );
  assert.equal(again.ok, true);
  if (!again.ok) return;
  assert.equal(again.value.unchanged, true);
  assert.equal(again.value.state.queue.length, 1);
});

test("материал без редакции остаётся в очереди и не публикуется", () => {
  const result = apply(
    pack([
      story({
        publicEdition: false,
        publicationPermitted: false,
        client: "",
        summary: "",
      }),
    ]),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.delivered.records.length, 0);
  assert.equal(result.value.state.queue[0]?.stage, "discovered");
});

test("ошибка пакета не предлагает записывать результат", () => {
  const result = apply(
    pack([story({ format: "strategy-session", media: [{ src: "https://drive.google.com/file" }] })]),
  );
  assert.equal(result.ok, false);
});

test("неполный пакет не переписывает файлы", () => {
  const root = mkdtempSync(path.join(tmpdir(), "kalibrovka-package-"));
  const deliveredPath = path.join(root, "delivered.json");
  const statePath = path.join(root, "state.json");
  const editorialPath = path.join(root, "editorial.json");
  const packagePath = path.join(root, "package.json");
  const delivered = {
    packageVersion: "2026-11-12.1",
    records: [
      {
        id: "north-plant",
        contentVersion: "1",
        purpose: "corporate-work",
        format: "audit",
        client: "Север",
        industry: "Производство",
        period: "2024",
        task: "Понять, где расходится план и работа цеха",
        work: "Разбор документов и разговор с руководителями",
        role: "Вёл аудит",
        result: null,
        summary: "Коротко об аудите цеха.",
        detail: "Подробно об аудите цеха.",
        media: [],
        collections: ["corporate", "cases"],
      },
    ],
  };
  writeFileSync(deliveredPath, JSON.stringify(delivered));
  writeFileSync(
    statePath,
    JSON.stringify({
      lastDeliveredPackageVersion: "2026-11-12.1",
      lastPublishedPackageVersion: null,
      queue: [],
    }),
  );
  writeFileSync(editorialPath, JSON.stringify({ featuredIds: [] }));
  writeFileSync(
    packagePath,
    JSON.stringify({ packageVersion: "broken", complete: false, records: [], removals: [] }),
  );
  const before = readFileSync(deliveredPath, "utf8");
  const result = runImport({ packagePath, deliveredPath, statePath, editorialPath });
  assert.equal(result.ok, false);
  assert.equal(readFileSync(deliveredPath, "utf8"), before);
});
