export const workFormats = [
  "corporate-session",
  "unit-preparation",
  "audit",
  "foresight",
  "accompaniment",
] as const;

export type WorkFormat = (typeof workFormats)[number];

export const casePurposes = [
  "corporate-work",
  "personal-program",
  "practice",
] as const;

export type CasePurpose = (typeof casePurposes)[number];

export const caseCollections = ["corporate", "cases"] as const;

export type CaseCollection = (typeof caseCollections)[number];

export const queueStages = ["discovered", "prepared"] as const;

export type QueueStage = (typeof queueStages)[number];

const versionPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const mediaSrcPattern = /^\/assets\/cases\/[a-z0-9][a-z0-9./-]*$/;

const packageKeys = new Set([
  "packageVersion",
  "complete",
  "records",
  "removals",
]);

const recordKeys = new Set([
  "id",
  "contentVersion",
  "purpose",
  "format",
  "client",
  "industry",
  "period",
  "task",
  "work",
  "role",
  "result",
  "summary",
  "detail",
  "media",
  "collections",
  "publicationPermitted",
  "publicEdition",
]);

const deliveredKeys = new Set([
  "id",
  "contentVersion",
  "purpose",
  "format",
  "client",
  "industry",
  "period",
  "task",
  "work",
  "role",
  "result",
  "summary",
  "detail",
  "media",
  "collections",
]);

const removalKeys = new Set(["id", "basis"]);
const mediaKeys = new Set(["id", "src", "alt"]);
const stateKeys = new Set([
  "lastDeliveredPackageVersion",
  "lastPublishedPackageVersion",
  "queue",
]);
const queueKeys = new Set(["id", "contentVersion", "stage", "reason"]);
const editorialKeys = new Set(["featuredIds"]);
const deliveredFileKeys = new Set(["packageVersion", "records"]);

export type CaseMedia = {
  id: string;
  src: string;
  alt: string;
};

export type PackageRecord = {
  id: string;
  contentVersion: string;
  purpose: CasePurpose;
  format: WorkFormat;
  client: string;
  industry: string;
  period: string;
  task: string;
  work: string;
  role: string;
  result: string | null;
  summary: string;
  detail: string | null;
  media: CaseMedia[];
  collections: CaseCollection[];
  publicationPermitted: boolean;
  publicEdition: boolean;
};

export type PackageRemoval = {
  id: string;
  basis: string;
};

export type PublicPackage = {
  packageVersion: string;
  complete: true;
  records: PackageRecord[];
  removals: PackageRemoval[];
};

export type DeliveredCase = {
  id: string;
  contentVersion: string;
  purpose: CasePurpose;
  format: WorkFormat;
  client: string;
  industry: string;
  period: string;
  task: string;
  work: string;
  role: string;
  result: string | null;
  summary: string;
  detail: string | null;
  media: CaseMedia[];
  collections: CaseCollection[];
};

export type DeliveredFile = {
  packageVersion: string | null;
  records: DeliveredCase[];
};

export type QueueItem = {
  id: string;
  contentVersion: string;
  stage: QueueStage;
  reason: string;
};

export type ImportState = {
  lastDeliveredPackageVersion: string | null;
  lastPublishedPackageVersion: string | null;
  queue: QueueItem[];
};

export type Editorial = {
  featuredIds: string[];
};

export type CaseStudy = DeliveredCase & {
  corporate: boolean;
  featured: boolean;
};

type Failure = { ok: false; errors: string[] };
type Success<T> = { ok: true; value: T };

export type ImportPlan = {
  delivered: DeliveredFile;
  state: ImportState;
  unchanged: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extraKeys(value: Record<string, unknown>, allowed: Set<string>): string[] {
  return Object.keys(value).filter((key) => !allowed.has(key));
}

function hasUnsafeText(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    lower.includes("://") ||
    lower.includes("drive.google") ||
    lower.includes("docs.google") ||
    lower.includes("www.")
  );
}

function walkStrings(value: unknown, found: string[]): void {
  if (typeof value === "string") {
    if (hasUnsafeText(value)) found.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkStrings(item, found);
    return;
  }
  if (isRecord(value)) {
    for (const nested of Object.values(value)) walkStrings(nested, found);
  }
}

function versionError(value: unknown, label: string): string | null {
  if (typeof value !== "string" || !versionPattern.test(value)) {
    return `${label} должен быть короткой версией из латиницы, цифр, точки, _ или -.`;
  }
  return null;
}

function idError(value: unknown, label: string): string | null {
  if (typeof value !== "string" || !idPattern.test(value)) {
    return `${label} должен оставаться постоянным идентификатором из строчных латинских букв, цифр и дефисов.`;
  }
  return null;
}

function push(errors: string[], message: string | null): void {
  if (message) errors.push(message);
}

function parseMedia(value: unknown, recordId: string, errors: string[]): CaseMedia[] | null {
  if (!Array.isArray(value)) {
    errors.push(`У истории ${recordId} медиа должны быть списком.`);
    return null;
  }
  const media: CaseMedia[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!isRecord(item)) {
      errors.push(`У истории ${recordId} элемент медиа должен быть объектом.`);
      continue;
    }
    const unexpected = extraKeys(item, mediaKeys);
    if (unexpected.length > 0) {
      errors.push(`У истории ${recordId} в медиа есть лишние поля: ${unexpected.join(", ")}.`);
    }
    push(errors, idError(item.id, `Идентификатор медиа в истории ${recordId}`));
    if (typeof item.id === "string" && seen.has(item.id)) {
      errors.push(`У истории ${recordId} повтор медиа ${item.id}.`);
    }
    if (typeof item.id === "string") seen.add(item.id);
    if (typeof item.src !== "string" || !mediaSrcPattern.test(item.src) || item.src.includes("..")) {
      errors.push(`Медиа истории ${recordId} должно лежать в /assets/cases/.`);
    }
    if (typeof item.alt !== "string" || item.alt.trim() === "") {
      errors.push(`У медиа истории ${recordId} нужна текстовая подпись.`);
    }
    if (
      typeof item.id === "string" &&
      typeof item.src === "string" &&
      typeof item.alt === "string"
    ) {
      media.push({ id: item.id, src: item.src, alt: item.alt });
    }
  }
  return media;
}

function parseCollections(value: unknown, recordId: string, errors: string[]): CaseCollection[] | null {
  if (!Array.isArray(value)) {
    errors.push(`У истории ${recordId} подборки должны быть списком.`);
    return null;
  }
  const collections: CaseCollection[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !caseCollections.includes(item as CaseCollection)) {
      errors.push(`У истории ${recordId} неизвестная подборка.`);
      continue;
    }
    if (!collections.includes(item as CaseCollection)) {
      collections.push(item as CaseCollection);
    }
  }
  return collections;
}

function readText(
  value: unknown,
  label: string,
  errors: string[],
  required: boolean,
): string | null | undefined {
  if (value === undefined || value === null || value === "") {
    if (required) errors.push(`${label} не может быть пустым.`);
    return null;
  }
  if (typeof value !== "string") {
    errors.push(`${label} должен быть текстом или пустым.`);
    return undefined;
  }
  const trimmed = value.trim();
  if (required && trimmed === "") errors.push(`${label} не может быть пустым.`);
  return trimmed === "" ? null : trimmed;
}

export function parsePackage(input: unknown): Success<PublicPackage> | Failure {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["Пакет должен быть объектом."] };
  }
  const unexpected = extraKeys(input, packageKeys);
  if (unexpected.length > 0) {
    errors.push(`В пакете есть лишние поля: ${unexpected.join(", ")}.`);
  }
  if (input.complete !== true) {
    errors.push("Неполный пакет не применяется. Уже доставленные истории сохраняются.");
    return { ok: false, errors };
  }
  push(errors, versionError(input.packageVersion, "Идентификатор пакета"));
  if (!Array.isArray(input.records) || !Array.isArray(input.removals)) {
    errors.push("В пакете должны быть списки историй и снятий.");
    return { ok: false, errors };
  }

  const records: PackageRecord[] = [];
  const seen = new Set<string>();
  for (const item of input.records) {
    if (!isRecord(item)) {
      errors.push("История в пакете должна быть объектом.");
      continue;
    }
    const extra = extraKeys(item, recordKeys);
    if (extra.length > 0) {
      errors.push(`У истории есть лишние поля: ${extra.join(", ")}.`);
    }
    push(errors, idError(item.id, "Идентификатор истории"));
    const id = typeof item.id === "string" ? item.id : "";
    if (id && seen.has(id)) errors.push(`В пакете повтор истории ${id}.`);
    if (id) seen.add(id);
    push(errors, versionError(item.contentVersion, `Версия истории ${id || "без идентификатора"}`));
    if (typeof item.purpose !== "string" || !casePurposes.includes(item.purpose as CasePurpose)) {
      errors.push(`У истории ${id || "без идентификатора"} неизвестное назначение.`);
    }
    if (typeof item.format !== "string" || !workFormats.includes(item.format as WorkFormat)) {
      errors.push(`У истории ${id || "без идентификатора"} неизвестный формат.`);
    }
    if (typeof item.publicationPermitted !== "boolean" || typeof item.publicEdition !== "boolean") {
      errors.push(`У истории ${id || "без идентификатора"} должны быть явные признаки редакции и разрешения.`);
      continue;
    }
    const media = parseMedia(item.media, id || "без идентификатора", errors);
    const collections = parseCollections(item.collections, id || "без идентификатора", errors);
    const permitted = item.publicationPermitted === true && item.publicEdition === true;
    const client = readText(item.client, `Клиент истории ${id}`, errors, permitted);
    const industry = readText(item.industry, `Отрасль истории ${id}`, errors, permitted);
    const period = readText(item.period, `Период истории ${id}`, errors, permitted);
    const task = readText(item.task, `Задача истории ${id}`, errors, permitted);
    const work = readText(item.work, `Содержание истории ${id}`, errors, permitted);
    const role = readText(item.role, `Роль в истории ${id}`, errors, permitted);
    const summary = readText(item.summary, `Краткий текст истории ${id}`, errors, permitted);
    const result = readText(item.result, `Результат истории ${id}`, errors, false);
    const detail = readText(item.detail, `Подробный текст истории ${id}`, errors, false);
    if (
      !id ||
      typeof item.contentVersion !== "string" ||
      typeof item.purpose !== "string" ||
      typeof item.format !== "string" ||
      client === undefined ||
      industry === undefined ||
      period === undefined ||
      task === undefined ||
      work === undefined ||
      role === undefined ||
      summary === undefined ||
      result === undefined ||
      detail === undefined ||
      !media ||
      !collections
    ) {
      continue;
    }
    records.push({
      id,
      contentVersion: item.contentVersion,
      purpose: item.purpose as CasePurpose,
      format: item.format as WorkFormat,
      client: client ?? "",
      industry: industry ?? "",
      period: period ?? "",
      task: task ?? "",
      work: work ?? "",
      role: role ?? "",
      summary: summary ?? "",
      result,
      detail,
      media,
      collections,
      publicationPermitted: item.publicationPermitted,
      publicEdition: item.publicEdition,
    });
  }

  const removals: PackageRemoval[] = [];
  const removalIds = new Set<string>();
  for (const item of input.removals) {
    if (!isRecord(item)) {
      errors.push("Снятие должно быть объектом.");
      continue;
    }
    const extra = extraKeys(item, removalKeys);
    if (extra.length > 0) errors.push(`В снятии есть лишние поля: ${extra.join(", ")}.`);
    push(errors, idError(item.id, "Идентификатор снятия"));
    if (typeof item.basis !== "string" || item.basis.trim() === "") {
      errors.push("Снятие истории требует явного основания.");
    } else if (hasUnsafeText(item.basis)) {
      errors.push("Основание снятия не должно содержать ссылку.");
    }
    if (typeof item.id === "string" && removalIds.has(item.id)) {
      errors.push(`Повтор снятия истории ${item.id}.`);
    }
    if (typeof item.id === "string") removalIds.add(item.id);
    if (typeof item.id === "string" && seen.has(item.id)) {
      errors.push(`История ${item.id} одновременно обновляется и снимается.`);
    }
    if (typeof item.id === "string" && typeof item.basis === "string" && item.basis.trim() !== "") {
      removals.push({ id: item.id, basis: item.basis.trim() });
    }
  }

  const unsafe: string[] = [];
  walkStrings(input, unsafe);
  if (unsafe.length > 0) {
    errors.push("В пакете есть внешняя ссылка. Такой пакет не применяется.");
  }

  if (errors.length > 0 || typeof input.packageVersion !== "string") {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      packageVersion: input.packageVersion,
      complete: true,
      records,
      removals,
    },
  };
}

function deliveredFrom(record: PackageRecord): DeliveredCase {
  return {
    id: record.id,
    contentVersion: record.contentVersion,
    purpose: record.purpose,
    format: record.format,
    client: record.client,
    industry: record.industry,
    period: record.period,
    task: record.task,
    work: record.work,
    role: record.role,
    result: record.result,
    summary: record.summary,
    detail: record.detail,
    media: record.media,
    collections: record.collections,
  };
}

function sameCase(left: DeliveredCase, right: DeliveredCase): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function queueKey(item: Pick<QueueItem, "id" | "contentVersion">): string {
  return `${item.id}@${item.contentVersion}`;
}

function sortRecords(records: DeliveredCase[]): DeliveredCase[] {
  return [...records].sort((left, right) => left.id.localeCompare(right.id));
}

function sortQueue(queue: QueueItem[]): QueueItem[] {
  return [...queue].sort((left, right) => queueKey(left).localeCompare(queueKey(right)));
}

export function parseDeliveredFile(input: unknown): Success<DeliveredFile> | Failure {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ["Файл доставленных историй повреждён."] };
  const extra = extraKeys(input, deliveredFileKeys);
  if (extra.length > 0) errors.push(`В доставленных историях есть лишние поля: ${extra.join(", ")}.`);
  if (input.packageVersion !== null) {
    push(errors, versionError(input.packageVersion, "Версия доставленного пакета"));
  }
  if (!Array.isArray(input.records)) {
    return { ok: false, errors: [...errors, "Доставленные истории должны быть списком."] };
  }
  const records: DeliveredCase[] = [];
  const seen = new Set<string>();
  for (const item of input.records) {
    if (!isRecord(item)) {
      errors.push("Доставленная история должна быть объектом.");
      continue;
    }
    const unexpected = extraKeys(item, deliveredKeys);
    if (unexpected.length > 0) {
      errors.push(`В доставленной истории есть лишние поля: ${unexpected.join(", ")}.`);
    }
    const parsed = parsePackage({
      packageVersion: "check-delivered",
      complete: true,
      records: [{ ...item, publicationPermitted: true, publicEdition: true }],
      removals: [],
    });
    if (!parsed.ok) {
      errors.push(...parsed.errors.filter((error) => !error.startsWith("Идентификатор пакета")));
      continue;
    }
    const record = parsed.value.records[0];
    if (!record) continue;
    if (seen.has(record.id)) errors.push(`Повтор доставленной истории ${record.id}.`);
    seen.add(record.id);
    records.push(deliveredFrom(record));
  }
  if (errors.length > 0 || (input.packageVersion !== null && typeof input.packageVersion !== "string")) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      packageVersion: input.packageVersion === null ? null : input.packageVersion,
      records: sortRecords(records),
    },
  };
}

export function parseEditorial(input: unknown): Success<Editorial> | Failure {
  if (!isRecord(input)) return { ok: false, errors: ["Редакционный файл должен быть объектом."] };
  const errors: string[] = [];
  const extra = extraKeys(input, editorialKeys);
  if (extra.length > 0) errors.push(`В редакционном файле есть лишние поля: ${extra.join(", ")}.`);
  if (!Array.isArray(input.featuredIds)) {
    return { ok: false, errors: [...errors, "Список выбранных историй должен быть массивом."] };
  }
  const featuredIds: string[] = [];
  for (const id of input.featuredIds) {
    push(errors, idError(id, "Идентификатор выбранной истории"));
    if (typeof id === "string" && featuredIds.includes(id)) {
      errors.push(`История ${id} выбрана на главную дважды.`);
    }
    if (typeof id === "string") featuredIds.push(id);
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { featuredIds } };
}

export function parseImportState(input: unknown): Success<ImportState> | Failure {
  if (!isRecord(input)) return { ok: false, errors: ["Состояние импорта повреждено."] };
  const errors: string[] = [];
  const extra = extraKeys(input, stateKeys);
  if (extra.length > 0) errors.push(`В состоянии импорта есть лишние поля: ${extra.join(", ")}.`);
  for (const key of ["lastDeliveredPackageVersion", "lastPublishedPackageVersion"] as const) {
    if (input[key] !== null) push(errors, versionError(input[key], key));
  }
  if (!Array.isArray(input.queue)) {
    return { ok: false, errors: [...errors, "Очередь подготовки должна быть списком."] };
  }
  const queue: QueueItem[] = [];
  const seen = new Set<string>();
  for (const item of input.queue) {
    if (!isRecord(item)) {
      errors.push("Элемент очереди должен быть объектом.");
      continue;
    }
    const unexpected = extraKeys(item, queueKeys);
    if (unexpected.length > 0) errors.push(`В очереди есть лишние поля: ${unexpected.join(", ")}.`);
    push(errors, idError(item.id, "Идентификатор в очереди"));
    push(errors, versionError(item.contentVersion, "Версия в очереди"));
    if (typeof item.stage !== "string" || !queueStages.includes(item.stage as QueueStage)) {
      errors.push("В очереди допустимы только стадии обнаружения и подготовки.");
    }
    if (typeof item.reason !== "string" || item.reason.trim() === "" || hasUnsafeText(item.reason)) {
      errors.push("Причина в очереди должна быть короткой и без ссылок.");
    }
    if (typeof item.id === "string" && typeof item.contentVersion === "string") {
      const key = queueKey({ id: item.id, contentVersion: item.contentVersion });
      if (seen.has(key)) errors.push(`В очереди повтор ${key}.`);
      seen.add(key);
      if (typeof item.stage === "string" && typeof item.reason === "string") {
        queue.push({
          id: item.id,
          contentVersion: item.contentVersion,
          stage: item.stage as QueueStage,
          reason: item.reason,
        });
      }
    }
  }
  if (
    errors.length > 0 ||
    (input.lastDeliveredPackageVersion !== null &&
      typeof input.lastDeliveredPackageVersion !== "string") ||
    (input.lastPublishedPackageVersion !== null &&
      typeof input.lastPublishedPackageVersion !== "string")
  ) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      lastDeliveredPackageVersion:
        input.lastDeliveredPackageVersion === null ? null : input.lastDeliveredPackageVersion,
      lastPublishedPackageVersion:
        input.lastPublishedPackageVersion === null ? null : input.lastPublishedPackageVersion,
      queue: sortQueue(queue),
    },
  };
}

export function withEditorial(
  records: readonly DeliveredCase[],
  editorial: Editorial,
): CaseStudy[] {
  const featured = new Set(editorial.featuredIds);
  return records.map((record) => ({
    ...record,
    corporate: record.collections.includes("corporate"),
    featured: featured.has(record.id),
  }));
}

export function assertHomeSelection(cases: readonly CaseStudy[]): string | null {
  if (cases.filter((item) => item.featured).length > 3) {
    return "На главной не больше трёх выбранных историй.";
  }
  return null;
}

export function importPublicPackage(
  delivered: DeliveredFile,
  state: ImportState,
  input: unknown,
  editorial: Editorial,
): Success<ImportPlan> | Failure {
  if (
    delivered.packageVersion !== state.lastDeliveredPackageVersion
  ) {
    return {
      ok: false,
      errors: [
        "Версия доставленного набора и состояние импорта разошлись. Файлы не изменены.",
      ],
    };
  }
  const parsed = parsePackage(input);
  if (!parsed.ok) return parsed;
  const pkg = parsed.value;
  const errors: string[] = [];
  const next = new Map(delivered.records.map((record) => [record.id, record]));
  const queue = new Map(state.queue.map((item) => [queueKey(item), item]));

  for (const record of pkg.records) {
    if (!record.publicEdition || !record.publicationPermitted) {
      const existing = next.get(record.id);
      if (existing && existing.contentVersion === record.contentVersion) continue;
      const stage: QueueStage = record.publicEdition ? "prepared" : "discovered";
      const reason = record.publicEdition
        ? "Нет разрешения на публикацию этой редакции."
        : "Нет публичной редакции.";
      queue.set(queueKey(record), {
        id: record.id,
        contentVersion: record.contentVersion,
        stage,
        reason,
      });
      continue;
    }
    const incoming = deliveredFrom(record);
    const existing = next.get(record.id);
    if (existing && existing.contentVersion === incoming.contentVersion) {
      if (!sameCase(existing, incoming)) {
        errors.push(
          `Версия ${incoming.contentVersion} истории ${incoming.id} уже доставлена с другим текстом.`,
        );
      }
      queue.delete(queueKey(record));
      continue;
    }
    next.set(record.id, incoming);
    queue.delete(queueKey(record));
  }

  for (const removal of pkg.removals) {
    next.delete(removal.id);
    for (const key of [...queue.keys()]) {
      if (key.startsWith(`${removal.id}@`)) queue.delete(key);
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const nextDelivered: DeliveredFile = {
    packageVersion: pkg.packageVersion,
    records: sortRecords([...next.values()]),
  };
  const studies = withEditorial(nextDelivered.records, editorial);
  const selectionError = assertHomeSelection(studies);
  if (selectionError) return { ok: false, errors: [selectionError] };

  const nextState: ImportState = {
    lastDeliveredPackageVersion: pkg.packageVersion,
    lastPublishedPackageVersion: state.lastPublishedPackageVersion,
    queue: sortQueue([...queue.values()]),
  };
  const unchanged =
    JSON.stringify(nextDelivered) === JSON.stringify(delivered) &&
    JSON.stringify(nextState.queue) === JSON.stringify(state.queue) &&
    nextState.lastDeliveredPackageVersion === state.lastDeliveredPackageVersion &&
    nextState.lastPublishedPackageVersion === state.lastPublishedPackageVersion;

  if (delivered.packageVersion === pkg.packageVersion && !unchanged) {
    return {
      ok: false,
      errors: [
        `Пакет ${pkg.packageVersion} уже доставлялся с другим составом. Повтор той же версии не меняет истории.`,
      ],
    };
  }

  return {
    ok: true,
    value: { delivered: nextDelivered, state: nextState, unchanged },
  };
}
