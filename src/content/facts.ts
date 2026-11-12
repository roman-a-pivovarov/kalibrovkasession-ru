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
 * Место и месяц подтверждены. Точные даты, набор и логистика не публикуются.
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
  place: "Шри-Ланка",
  dates: "декабрь 2026",
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

/** День и полный проект — разные ориентиры. Суммы не складываются. */
export const corporatePricing = {
  dayMinRub: 160_000,
  dayMaxRub: 480_000,
  projectMinRub: 400_000,
  projectMaxRub: 800_000,
  accompanimentStatement:
    "После сессии возможны контрольная встреча или регулярное сопровождение. Это отдельная договорённость.",
} as const;

function thousand(amount: number): string {
  return String(Math.round(amount / 1000));
}

export function corporateDayStatement(): string {
  return `Ориентир за день — ${thousand(corporatePricing.dayMinRub)}–${thousand(corporatePricing.dayMaxRub)} тыс. ₽. Диапазон зависит от задачи и глубины подготовки.`;
}

export function corporateProjectStatement(): string {
  return `Ориентир для типового проекта — ${thousand(corporatePricing.projectMinRub)}–${thousand(corporatePricing.projectMaxRub)} тыс. ₽. В расчёт входят подготовка, проведение, обработка результатов и согласованная последующая работа.`;
}

export function corporateRangesNote(): string {
  return "День и проект — два разных ориентира. Они не складываются в одну сумму.";
}

/** Авторский ориентир объёма. На странице — только сама формулировка. */
export const corporatePractice = {
  usualSessionsPerYear: "5–6",
} as const;

export function corporateVolumeStatement(): string {
  return `В течение года я обычно провожу ${corporatePractice.usualSessionsPerYear} корпоративных сессий.`;
}

export const personalSequence = [
  { id: "personal", publicLabel: "Личные ориентиры" },
  { id: "core-id", publicLabel: "Суть и идентичность бизнеса" },
  { id: "product-sales", publicLabel: "Продукты и продажи" },
  { id: "resource-resolution", publicLabel: "Ресурсы и решения" },
] as const;

export function publicSequenceLabels(): string[] {
  return personalSequence.flatMap((step) =>
    step.publicLabel ? [step.publicLabel] : [],
  );
}
