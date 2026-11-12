export type SampleStatus = "real" | "demonstration" | "template";

export const sampleStatusLabel: Record<SampleStatus, string> = {
  real: "Фрагмент выполненной работы",
  demonstration: "Демонстрационный пример",
  template: "Рабочий шаблон",
};

export type WorkSample = {
  id: string;
  title: string;
  question: string;
  body: string;
  purpose: string;
  status: SampleStatus;
  image: { src: string; alt: string } | null;
};

/** Образцы появляются здесь только после проверки и разрешения на показ. */
export const samples: WorkSample[] = [];

export function publishedSamples(
  list: readonly WorkSample[] = samples,
): WorkSample[] {
  return list.filter((item) => item.question.trim() && item.body.trim());
}
