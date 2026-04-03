import Stripe from "stripe";

export interface StripePulse {
  weeklyRevenue: number;
  monthlyRevenue: number;
  mrr: number;
  activeSubscriptions: number;
  churnedThisMonth: number;
  weeklyBurn: number;
}

export interface StripeHealthCheck {
  ok: boolean;
  accountName?: string;
  error?: string;
}

/** Create a Stripe client from an API key. Returns null if key is missing. */
function makeClient(apiKey: string | undefined): Stripe | null {
  if (!apiKey || apiKey.length < 10) return null;
  return new Stripe(apiKey, { apiVersion: "2025-03-31.basil" });
}

/** Fetch weekly + monthly revenue, MRR, active subs, and churn. */
export async function fetchStripePulse(apiKey: string): Promise<StripePulse> {
  const stripe = makeClient(apiKey);
  if (!stripe) throw new Error("Invalid Stripe API key");

  const now = Math.floor(Date.now() / 1000);
  const weekAgo = now - 7 * 86400;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartTs = Math.floor(monthStart.getTime() / 1000);

  // Fetch in parallel
  const [weeklyCharges, monthlyCharges, activeSubs, canceledSubs] = await Promise.all([
    // Weekly successful charges
    stripe.charges.list({
      created: { gte: weekAgo },
      limit: 100,
    }),
    // Monthly successful charges
    stripe.charges.list({
      created: { gte: monthStartTs },
      limit: 100,
    }),
    // Active subscriptions
    stripe.subscriptions.list({
      status: "active",
      limit: 100,
    }),
    // Canceled this month
    stripe.subscriptions.list({
      status: "canceled",
      created: { gte: monthStartTs },
      limit: 100,
    }),
  ]);

  const weeklyRevenue = weeklyCharges.data
    .filter((c) => c.status === "succeeded" && !c.refunded)
    .reduce((sum, c) => sum + c.amount, 0);

  const monthlyRevenue = monthlyCharges.data
    .filter((c) => c.status === "succeeded" && !c.refunded)
    .reduce((sum, c) => sum + c.amount, 0);

  // MRR from active subscription items
  const mrr = activeSubs.data.reduce((sum, sub) => {
    const items = sub.items?.data ?? [];
    for (const item of items) {
      const price = item.price;
      if (!price?.unit_amount || !price.recurring) continue;
      const interval = price.recurring.interval;
      const amount = price.unit_amount * (item.quantity ?? 1);
      if (interval === "month") sum += amount;
      else if (interval === "year") sum += Math.round(amount / 12);
      else if (interval === "week") sum += amount * 4;
    }
    return sum;
  }, 0);

  return {
    weeklyRevenue: Math.round(weeklyRevenue / 100), // cents to dollars
    monthlyRevenue: Math.round(monthlyRevenue / 100),
    mrr: Math.round(mrr / 100),
    activeSubscriptions: activeSubs.data.length,
    churnedThisMonth: canceledSubs.data.length,
    weeklyBurn: 0, // Stripe doesn't track burn — Mercury handles this
  };
}

/** Verify a Stripe key is valid by fetching the account. */
export async function checkStripeHealth(apiKey: string): Promise<StripeHealthCheck> {
  const stripe = makeClient(apiKey);
  if (!stripe) return { ok: false, error: "Invalid API key format" };

  try {
    const balance = await stripe.balance.retrieve();
    return {
      ok: true,
      accountName: `${balance.available.length} currency(ies)`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}
