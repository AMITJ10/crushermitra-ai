export type PlanCode = "starter" | "growth" | "enterprise";

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  price: number;
  priceLabel: string;
  orderLimit: number | null;
  dispatchLimit: number | null;
  userLimit: number | null;
  features: string[];
}

export interface SubscriptionSnapshot {
  planCode: PlanCode;
  planName: string;
  planPrice: string;
  status: "active" | "pending" | "failed";
  validFrom: string;
  validUntil: string;
  ordersUsed: number;
  ordersLimit: number | null;
  dispatchUsed: number;
  dispatchLimit: number | null;
  paymentStatus: "paid" | "pending" | "failed";
  paymentMethod: string;
}

export const planDefinitions: PlanDefinition[] = [
  {
    code: "starter",
    name: "Starter",
    price: 999,
    priceLabel: "Rs. 999/month",
    orderLimit: 50,
    dispatchLimit: 50,
    userLimit: 1,
    features: ["Basic dashboard", "Master data", "Orders", "Dispatch", "CSV export", "Email support"]
  },
  {
    code: "growth",
    name: "Growth",
    price: 2999,
    priceLabel: "Rs. 2,999/month",
    orderLimit: 150,
    dispatchLimit: 150,
    userLimit: 5,
    features: ["Advanced dashboard", "Operations", "Reports", "CSV/PDF export", "AI recommendations", "Priority support"]
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: 9999,
    priceLabel: "Rs. 9,999/month",
    orderLimit: null,
    dispatchLimit: null,
    userLimit: null,
    features: ["Multi-plant support", "Advanced reports", "Role-based access", "Dedicated support", "Custom onboarding"]
  }
];

export function getPlanDefinition(code: PlanCode): PlanDefinition {
  return planDefinitions.find((plan) => plan.code === code) ?? planDefinitions[0]!;
}

export function createActivatedSubscription(planCode: PlanCode, paymentMethod: string): SubscriptionSnapshot {
  const plan = getPlanDefinition(planCode);
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 30);

  return {
    planCode,
    planName: plan.name,
    planPrice: plan.priceLabel,
    status: "active",
    validFrom: start.toISOString(),
    validUntil: end.toISOString(),
    ordersUsed: 0,
    ordersLimit: plan.orderLimit,
    dispatchUsed: 0,
    dispatchLimit: plan.dispatchLimit,
    paymentStatus: "paid",
    paymentMethod
  };
}

export function daysRemaining(validUntil: string): number {
  const end = new Date(validUntil).getTime();
  if (!Number.isFinite(end)) {
    return 0;
  }
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}
