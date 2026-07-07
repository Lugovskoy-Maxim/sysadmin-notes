"use client";

import { useEffect, useState } from "react";
import { Check, Crown } from "lucide-react";
import { api } from "@/lib/api";
import { formatPriceRub, PLAN_CARDS, type PlanId } from "@/lib/plans";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import type { BillingStatus } from "@/lib/types";

type PricingPanelProps = {
  token?: string | null;
  compact?: boolean;
  onSubscribed?: (billing: BillingStatus) => void;
};

export function PricingPanel({ token, compact, onSubscribed }: PricingPanelProps) {
  const storeBilling = useAppStore((s) => s.billing);
  const setBilling = useAppStore((s) => s.setBilling);
  const toast = useToast((s) => s.push);
  const [plans, setPlans] = useState(PLAN_CARDS);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [localBilling, setLocalBilling] = useState<BillingStatus | null>(storeBilling);

  useEffect(() => {
    void api.billing.plans()
      .then((result) => {
        if (result.plans?.length) {
          setPlans(
            result.plans.map((plan) => ({
              id: plan.id,
              name: plan.name,
              priceMonthlyRub: plan.priceMonthlyRub,
              description: plan.description,
              highlights: plan.highlights,
              cta: PLAN_CARDS.find((item) => item.id === plan.id)?.cta ?? "Выбрать",
              popular: plan.id === "pro",
            })),
          );
        }
      })
      .catch(() => setPlans(PLAN_CARDS));
  }, []);

  useEffect(() => {
    setLocalBilling(storeBilling);
  }, [storeBilling]);

  useEffect(() => {
    if (!token) return;
    void api.billing.status(token)
      .then((status) => {
        setLocalBilling(status);
        setBilling(status);
      })
      .catch(() => undefined);
  }, [token, setBilling]);

  async function choosePlan(planId: PlanId) {
    if (planId === "free") return;
    if (!token) {
      window.location.href = `/?login=1&plan=${planId}`;
      return;
    }
    setLoadingPlan(planId);
    try {
      const status = await api.billing.subscribe(token, planId);
      setLocalBilling(status);
      setBilling(status);
      onSubscribed?.(status);
      toast(`Тариф «${status.planName}» активирован на 30 дней`, "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось оформить подписку", "error");
    } finally {
      setLoadingPlan(null);
    }
  }

  async function cancelPlan() {
    if (!token || !window.confirm("Отменить подписку и вернуться на бесплатный тариф?")) return;
    try {
      const status = await api.billing.cancel(token);
      setLocalBilling(status);
      setBilling(status);
      onSubscribed?.(status);
      toast("Подписка отменена", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось отменить подписку", "error");
    }
  }

  return (
    <div className={`pricing-panel ${compact ? "compact" : ""}`}>
      <section className="pricing-hero">
        <span className="pricing-badge">
          <Crown size={14} />
          Тарифы для команд
        </span>
        <h1>{compact ? "Подписка" : "Работайте вместе над инфраструктурой"}</h1>
        <p>
          Free — личные заметки. Pro и Team — склад, оснащение, карта сети и совместная работа.
        </p>
        {localBilling ? (
          <p className="pricing-current">
            Ваш тариф: <strong>{localBilling.planName}</strong>
            {localBilling.currentPeriodEnd ? (
              <> · до {new Date(localBilling.currentPeriodEnd).toLocaleDateString("ru-RU")}</>
            ) : null}
            {localBilling.isPremium ? (
              <button type="button" className="ghost-button compact" onClick={() => void cancelPlan()}>
                Отменить
              </button>
            ) : null}
          </p>
        ) : null}
      </section>

      <section className="pricing-grid">
        {plans.map((plan) => {
          const isCurrent = localBilling?.plan === plan.id;
          const isPaid = plan.id !== "free";
          return (
            <article key={plan.id} className={`pricing-card ${plan.popular ? "popular" : ""} ${isCurrent ? "current" : ""}`}>
              {plan.popular ? <span className="pricing-card-badge">Популярный</span> : null}
              <h2>{plan.name}</h2>
              <p className="pricing-card-desc">{plan.description}</p>
              <div className="pricing-price">
                <strong>{formatPriceRub(plan.priceMonthlyRub)}</strong>
                <span>{plan.priceMonthlyRub ? "/ месяц" : "навсегда"}</span>
              </div>
              <ul className="pricing-features">
                {plan.highlights.map((item) => (
                  <li key={item}>
                    <Check size={14} />
                    {item}
                  </li>
                ))}
              </ul>
              {plan.id === "free" ? null : (
                <button
                  type="button"
                  className={plan.popular ? "primary-button full" : "ghost-button full"}
                  disabled={isCurrent || loadingPlan === plan.id}
                  onClick={() => void choosePlan(plan.id)}
                >
                  {isCurrent ? "Текущий тариф" : loadingPlan === plan.id ? "Оформление…" : plan.cta}
                </button>
              )}
              {isPaid && token ? (
                <p className="fine-print pricing-demo-note">Демо-активация на 30 дней без оплаты</p>
              ) : null}
            </article>
          );
        })}
      </section>

      {!compact ? (
        <section className="pricing-compare">
          <h2>Сравнение возможностей</h2>
          <div className="pricing-table-wrap">
            <table className="pricing-table">
              <thead>
                <tr>
                  <th>Функция</th>
                  <th>Free</th>
                  <th>Pro</th>
                  <th>Team</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Собственные проекты</td><td>2</td><td>10</td><td>50</td></tr>
                <tr><td>Участники в проекте</td><td>—</td><td>5</td><td>25</td></tr>
                <tr><td>Хранилище и задачи</td><td>✓</td><td>✓</td><td>✓</td></tr>
                <tr><td>Склад / оснащение / сеть</td><td>—</td><td>✓</td><td>✓</td></tr>
                <tr><td>Исполнители в задачах</td><td>—</td><td>✓</td><td>✓</td></tr>
                <tr><td>Роли viewer / editor</td><td>—</td><td>✓</td><td>✓</td></tr>
                <tr><td>Участие в чужих проектах</td><td>✓</td><td>✓</td><td>✓</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}