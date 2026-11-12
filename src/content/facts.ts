const rubFormat = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

export function formatRub(amount: number): string {
  const formatted = rubFormat
    .format(amount)
    .replace(/\u00a0/g, " ")
    .replace(/\u202f/g, " ");
  return `${formatted} ₽`;
}

/** Постоянное описание персональной программы. Конкретный выезд — в nextRetreat. */
export const personalProgram = {
  durationLabel: "четырёхдневной",
  feeRub: 160_000,
} as const;

export function personalFeeStatement(): string {
  return `${formatRub(personalProgram.feeRub)} — организационный взнос за участие в ${personalProgram.durationLabel} рабочей программе.`;
}

export const participantExpensesStatement =
  "Перелёт, проживание, питание, трансферы и остальные расходы участник оплачивает самостоятельно.";

export const personalFormatStatement =
  "Ежегодная открытая программа на четыре дня. Каждый участник работает над своей задачей внутри группы.";

/**
 * Ближайший выезд. Пустые поля не показываются.
 * Даты не переносятся со старого сайта и остаются пустыми, пока их отдельно не согласуют.
 */
export type NextRetreat = {
  title: string | null;
  place: string | null;
  dates: string | null;
  enrollment: string | null;
  included: readonly string[] | null;
  extraCosts: readonly string[] | null;
};

export const nextRetreat: NextRetreat = {
  title: null,
  place: null,
  dates: null,
  enrollment: null,
  included: null,
  extraCosts: null,
};

export function retreatIsPublic(retreat: NextRetreat): boolean {
  return Boolean(
    retreat.title ||
      retreat.place ||
      retreat.dates ||
      retreat.enrollment ||
      (retreat.included && retreat.included.length > 0) ||
      (retreat.extraCosts && retreat.extraCosts.length > 0),
  );
}

/**
 * Корпоративная стоимость. Числовой диапазон и формулировка дня
 * отличаются от полного проекта и появятся здесь только из согласованного пакета.
 */
export const corporatePricing = {
  volumeStatement:
    "Стоимость корпоративного проекта определяется его объёмом: подготовка, проведение, обработка результатов и сопровождение.",
  accompanimentStatement: "Сопровождение после сессии согласуем отдельно.",
  dayStatement: null as string | null,
  projectStatement: null as string | null,
};

/** Авторский ориентир объёма, не подсчёт архива и не лимит мест. */
export const corporatePractice = {
  usualSessionsPerYear: "5–6",
} as const;

export function corporateVolumeStatement(): string {
  return `В течение года я обычно провожу ${corporatePractice.usualSessionsPerYear} корпоративных сессий. Это мой обычный объём работы, а не ограничение мест и не подсчёт архива.`;
}

export const personalSequence = [
  { id: "personal", publicLabel: "Личные ориентиры" },
  { id: "core-id", publicLabel: "Роль собственника" },
  { id: "product-sales", publicLabel: "Продукт и продажи" },
  { id: "resource-resolution", publicLabel: "Ресурсы и решения" },
] as const;

export function publicSequenceLabels(): string[] {
  return personalSequence.flatMap((step) =>
    step.publicLabel ? [step.publicLabel] : [],
  );
}
