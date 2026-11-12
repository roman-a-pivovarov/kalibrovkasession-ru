import { personalFormatStatement } from "./facts";

export type InquiryContext = "general" | "corporate" | "personal";

export const siteName = "Калибровка";

export const author = {
  name: "Роман Пивоваров",
  nameGenitive: "Романа Пивоварова",
} as const;

export const ctaLabel = "Обсудить задачу";

export const nav = [
  { href: "/corporate/", label: "Для компании", context: "corporate" },
  { href: "/personal/", label: "Для себя", context: "personal" },
  { href: "/approach/", label: "Наш подход", context: "general" },
  { href: "/cases/", label: "Кейсы и опыт", context: "general" },
  { href: "/roman/", label: "О Романе", context: "general" },
] as const;

export const formats = {
  corporate: {
    href: "/corporate/",
    title: "Корпоративные сессии",
    text: "Стратегическая работа с командой компании. Сначала подготовка, затем сама сессия и фиксация решений. Продолжение после сессии согласуем отдельно.",
  },
  personal: {
    href: "/personal/",
    title: "Персональная «Калибровка»",
    text: personalFormatStatement,
  },
} as const;

export const contact = {
  email: "hello@romanpivovarov.ru",
  telegramUrl: "https://t.me/romanpivovarov",
  telegramLabel: "@romanpivovarov",
} as const;

export function mailHref(context: InquiryContext): string {
  const subject =
    context === "corporate"
      ? "Калибровка: задача компании"
      : context === "personal"
        ? "Калибровка: участие в программе"
        : "Калибровка: обсудить задачу";
  return `mailto:${contact.email}?subject=${encodeURIComponent(subject)}`;
}

export function discussHref(): string {
  return "#discuss";
}
