import deliveredRaw from "./delivered-cases.json";
import editorialRaw from "./editorial.json";
import {
  assertHomeSelection,
  parseDeliveredFile,
  parseEditorial,
  withEditorial,
} from "./public-package";
import type { CaseStudy, WorkFormat } from "./public-package";

export type { CaseStudy, WorkFormat };

export const formatLabel: Record<WorkFormat, string> = {
  "corporate-session": "Корпоративная стратегическая сессия",
  "unit-preparation": "Подготовка подразделения",
  audit: "Аудит",
  foresight: "Форсайт",
  accompaniment: "Сопровождение",
};

function unwrap<T>(result: { ok: true; value: T } | { ok: false; errors: string[] }): T {
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return result.value;
}

const delivered = unwrap(parseDeliveredFile(deliveredRaw));
const editorial = unwrap(parseEditorial(editorialRaw));

/**
 * Истории, уже принятые в репозиторий.
 * Выбор для главной берётся только из editorial.json и импортом не заменяется.
 * Число записей не показывается как число проведённых сессий.
 */
export const cases: CaseStudy[] = withEditorial(delivered.records, editorial);

const selectionError = assertHomeSelection(cases);
if (selectionError) throw new Error(selectionError);

export function featuredCases(list: readonly CaseStudy[] = cases): CaseStudy[] {
  const picked = list.filter((item) => item.featured);
  if (picked.length > 3) {
    throw new Error("На главной не больше трёх выбранных историй.");
  }
  return picked;
}

export function corporateCases(list: readonly CaseStudy[] = cases): CaseStudy[] {
  return list.filter((item) => item.corporate);
}
