/**
 * Vercel Analytics integration — fetches web traffic data from the
 * Vercel Analytics API for configured projects.
 *
 * API: https://vercel.com/docs/rest-api/endpoints/analytics
 * Auth: Bearer token (Vercel API token)
 */

const VERCEL_BASE = "https://api.vercel.com";

export interface VercelTrafficData {
  visitors: number;
  pageViews: number;
  topPages: { path: string; views: number }[];
  topReferrers: { referrer: string; views: number }[];
  period: string;
}

export interface VercelHealthCheck {
  ok: boolean;
  userName?: string;
  error?: string;
}

async function vercelFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${VERCEL_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Vercel API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch web analytics for a project over the last 7 days.
 * projectId can be the project name or ID.
 */
export async function fetchVercelTraffic(
  token: string,
  projectId: string,
  teamId?: string,
): Promise<VercelTrafficData> {
  const now = Date.now();
  const weekAgo = now - 7 * 86400 * 1000;

  const teamParam = teamId ? `&teamId=${teamId}` : "";

  // Fetch page views + visitors
  const [viewsData, referrersData] = await Promise.all([
    vercelFetch<{
      data?: { key: string; total: number; devices: number }[];
    }>(
      `/v1/web/analytics/page-views?projectId=${projectId}&from=${weekAgo}&to=${now}&limit=20${teamParam}`,
      token,
    ).catch(() => ({ data: [] })),
    vercelFetch<{
      data?: { key: string; total: number }[];
    }>(
      `/v1/web/analytics/referrers?projectId=${projectId}&from=${weekAgo}&to=${now}&limit=10${teamParam}`,
      token,
    ).catch(() => ({ data: [] })),
  ]);

  const pages = (viewsData.data ?? []).map((d) => ({ path: d.key, views: d.total }));
  const totalViews = pages.reduce((sum, p) => sum + p.views, 0);
  const totalVisitors = (viewsData.data ?? []).reduce((sum, d) => sum + (d.devices ?? 0), 0);

  const referrers = (referrersData.data ?? []).map((d) => ({ referrer: d.key, views: d.total }));

  return {
    visitors: totalVisitors,
    pageViews: totalViews,
    topPages: pages.slice(0, 10),
    topReferrers: referrers.slice(0, 5),
    period: "7d",
  };
}

/** Verify a Vercel token is valid by fetching the authenticated user. */
export async function checkVercelHealth(token: string): Promise<VercelHealthCheck> {
  try {
    const user = await vercelFetch<{ user?: { name?: string; username?: string } }>("/v2/user", token);
    return { ok: true, userName: user.user?.name ?? user.user?.username ?? "Vercel User" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
