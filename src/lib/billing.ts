export interface BillingPlan {
  name: string;
  credits: number;
  priceUSD: number;
}

export const billingPlans: Record<string, BillingPlan> = {
  free: { name: 'Free', credits: 50000, priceUSD: 0 },
  lite: { name: 'Lite', credits: 99000, priceUSD: 1.0 },
  starter: { name: 'Starter', credits: 999000, priceUSD: 4.5 },
  growth: { name: 'Growth', credits: 4999000, priceUSD: 14.5 },
  pro: { name: 'Pro Studio', credits: 19999000, priceUSD: 39.5 },
};

export function calculateBillingAmount(planId: string, billingCycle: string, promoCode?: string): number {
  const plan = billingPlans[planId.toLowerCase()] || billingPlans.starter;
  const discount = promoCode?.toUpperCase() === 'LAUNCH50' ? 0.5 : 0;
  const usdPrice = plan.priceUSD * (1 - discount);
  const annualMultiplier = billingCycle === 'annual' ? 0.7 * 12 : 1;
  return Math.round((usdPrice * annualMultiplier * 25500) / 1000) * 1000;
}