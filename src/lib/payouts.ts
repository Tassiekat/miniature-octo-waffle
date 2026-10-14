import { generateMembers, TIER_PRICES, type Tier } from "@/lib/fake-data";

export type PayoutStatus = "pending" | "processing" | "paid";

export type Payout = {
  id: string;
  period_end: string;
  paid_at: string | null;
  status: PayoutStatus;
  method: "Stripe payout" | "Bank transfer";
  gross_usd: number;
  referral_commission_usd: number;
  fees_usd: number;
  net_usd: number;
};

export const DEFAULT_COMMISSION_RATE = 0.3;

// Deterministic RNG so repeated calls agree with each other.
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildPayouts(months = 6, commissionRate = DEFAULT_COMMISSION_RATE): Payout[] {
  const members = generateMembers(120).filter((m) => m.status === "Active");
  const mrr = members.reduce(
    (s, m) => s + (TIER_PRICES[m.tier as Tier] ?? 0),
    0,
  );

  const out: Payout[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    // Seed per period so a payout's numbers never depend on how many
    // months the caller asked for (dashboard card vs MCP tool stay in sync).
    const rng = mulberry32(2024 + end.getFullYear() * 100 + end.getMonth());
    const gross = Math.round(mrr * (0.78 + rng() * 0.35));
    const commission = Math.round(gross * commissionRate);
    const fees = Math.round(gross * 0.029 + 30);
    const net = gross - commission - fees;
    const isCurrent = i === 0;
    const isPrev = i === 1;
    const status: PayoutStatus = isCurrent ? "pending" : isPrev ? "processing" : "paid";
    const paidAt = status === "paid" ? new Date(end.getTime() + 3 * 86400000) : null;
    out.push({
      id: `po_${end.toISOString().slice(0, 7).replace("-", "")}`,
      period_end: end.toISOString().slice(0, 10),
      paid_at: paidAt ? paidAt.toISOString().slice(0, 10) : null,
      status,
      method: rng() < 0.8 ? "Stripe payout" : "Bank transfer",
      gross_usd: gross,
      referral_commission_usd: commission,
      fees_usd: fees,
      net_usd: net,
    });
  }
  return out.reverse();
}


export function getPayoutSummary(months = 6, commissionRate = DEFAULT_COMMISSION_RATE) {
  const all = buildPayouts(months, commissionRate);
  const pending = all.filter((p) => p.status !== "paid");
  const next = new Date();
  next.setMonth(next.getMonth() + 1, 1);

  return {
    currency: "USD" as const,
    commission_rate: commissionRate,
    pending_balance_usd: pending.reduce((s, p) => s + p.net_usd, 0),
    pending_payout_count: pending.length,
    next_payout_date: next.toISOString().slice(0, 10),
    lifetime_paid_usd: all
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + p.net_usd, 0),
    payouts: all,
  };
}
