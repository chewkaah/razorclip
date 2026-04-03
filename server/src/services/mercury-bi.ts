const MERCURY_BASE = "https://api.mercury.com/api/v1";

export interface MercuryPulse {
  cashPosition: number;
  availableBalance: number;
  weeklyBurn: number;
  monthlyBurn: number;
  runwayDays: number;
  accountCount: number;
}

export interface MercuryHealthCheck {
  ok: boolean;
  accountCount?: number;
  error?: string;
}

interface MercuryAccount {
  id: string;
  name: string;
  status: string;
  currentBalance: number;
  availableBalance: number;
}

interface MercuryTransaction {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  counterpartyName: string;
}

async function mercuryFetch<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${MERCURY_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Mercury API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

/** Fetch all active accounts and their balances. */
async function getAccounts(apiKey: string): Promise<MercuryAccount[]> {
  const data = await mercuryFetch<{ accounts: MercuryAccount[] }>("/accounts", apiKey);
  return (data.accounts ?? []).filter((a) => a.status === "active");
}

/** Fetch transactions for a date range across all accounts. */
async function getTransactions(
  apiKey: string,
  accounts: MercuryAccount[],
  start: string,
  end: string,
): Promise<MercuryTransaction[]> {
  const all: MercuryTransaction[] = [];
  for (const account of accounts) {
    const data = await mercuryFetch<{ transactions: MercuryTransaction[] }>(
      `/account/${account.id}/transactions?start=${start}&end=${end}&limit=500`,
      apiKey,
    );
    all.push(...(data.transactions ?? []));
  }
  return all;
}

/** Calculate burn from transactions (sum of outflows). */
function calcBurn(transactions: MercuryTransaction[]): number {
  return transactions
    .filter((t) => t.amount < 0 && t.status !== "cancelled" && t.status !== "failed")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

export async function fetchMercuryPulse(apiKey: string): Promise<MercuryPulse> {
  const accounts = await getAccounts(apiKey);
  const cashPosition = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const availableBalance = accounts.reduce((sum, a) => sum + a.availableBalance, 0);

  // Weekly burn: transactions from last 7 days
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 86400 * 1000);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const [weekTxns, monthTxns] = await Promise.all([
    getTransactions(apiKey, accounts, fmt(weekAgo), fmt(now)),
    getTransactions(apiKey, accounts, fmt(monthAgo), fmt(now)),
  ]);

  const weeklyBurn = Math.round(calcBurn(weekTxns) * 100) / 100;
  const monthlyBurn = Math.round(calcBurn(monthTxns) * 100) / 100;

  // Runway in days based on weekly burn rate
  const dailyBurn = weeklyBurn > 0 ? weeklyBurn / 7 : 0;
  const runwayDays = dailyBurn > 0 ? Math.round(cashPosition / dailyBurn) : 9999;

  return {
    cashPosition: Math.round(cashPosition * 100) / 100,
    availableBalance: Math.round(availableBalance * 100) / 100,
    weeklyBurn,
    monthlyBurn,
    runwayDays,
    accountCount: accounts.length,
  };
}

export async function checkMercuryHealth(apiKey: string): Promise<MercuryHealthCheck> {
  try {
    const accounts = await getAccounts(apiKey);
    return { ok: true, accountCount: accounts.length };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
