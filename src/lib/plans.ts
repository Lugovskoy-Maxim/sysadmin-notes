export type PlanId = "free" | "pro" | "team";

export type PlanCard = {
  id: PlanId;
  name: string;
  priceMonthlyRub: number;
  description: string;
  highlights: string[];
  cta: string;
  popular?: boolean;
};

export const PLAN_CARDS: PlanCard[] = [
  {
    id: "free",
    name: "Бесплатный",
    priceMonthlyRub: 0,
    description: "Для личной работы и быстрых заметок",
    highlights: [
      "2 собственных проекта",
      "Хранилище и задачи",
      "Публичные ссылки",
      "Участие в чужих проектах",
    ],
    cta: "Начать бесплатно",
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthlyRub: 490,
    description: "Модули инфраструктуры и небольшая команда",
    highlights: [
      "10 проектов",
      "До 5 участников",
      "Склад, оснащение, сеть",
      "Исполнители в задачах",
    ],
    cta: "Оформить Pro",
    popular: true,
  },
  {
    id: "team",
    name: "Team",
    priceMonthlyRub: 1490,
    description: "Для отдела с полным доступом",
    highlights: [
      "50 проектов",
      "До 25 участников",
      "Роли viewer / editor",
      "Всё из Pro",
    ],
    cta: "Оформить Team",
  },
];

export function formatPriceRub(value: number) {
  if (!value) return "0 ₽";
  return `${value.toLocaleString("ru-RU")} ₽`;
}

export function isPremiumPlan(plan: PlanId) {
  return plan === "pro" || plan === "team";
}