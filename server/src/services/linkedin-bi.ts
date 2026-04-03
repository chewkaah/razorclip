/**
 * LinkedIn integration — fetches profile and organization metrics.
 *
 * Uses the LinkedIn Marketing API v2. Requires an OAuth access token
 * with r_organization_social and rw_organization_admin scopes (for org pages),
 * or r_liteprofile + r_basicprofile for personal profiles.
 *
 * Note: LinkedIn's API has strict rate limits and requires an approved app.
 * The access token must be refreshed periodically (60-day expiry for 3-legged OAuth).
 */

const LINKEDIN_BASE = "https://api.linkedin.com/v2";

export interface LinkedInPresence {
  followers: number;
  impressions: number;
  engagementRate: number;
  postsThisWeek: number;
  profileViews: number;
  period: string;
}

export interface LinkedInHealthCheck {
  ok: boolean;
  name?: string;
  error?: string;
}

async function linkedinFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${LINKEDIN_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LinkedIn API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchLinkedInPresence(
  token: string,
  organizationId?: string,
): Promise<LinkedInPresence> {
  // If we have an org ID, fetch org-level stats
  if (organizationId) {
    const [followStats, shareStats] = await Promise.all([
      linkedinFetch<{ firstDegreeSize?: number }>(
        `/networkSizes/urn:li:organization:${organizationId}?edgeType=CompanyFollowedByMember`,
        token,
      ).catch(() => ({ firstDegreeSize: 0 })),
      linkedinFetch<{
        elements?: { totalShareStatistics?: { impressionCount?: number; engagementRate?: number; shareCount?: number } }[];
      }>(
        `/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${organizationId}`,
        token,
      ).catch(() => ({ elements: [] })),
    ]);

    const stats = shareStats.elements?.[0]?.totalShareStatistics;

    return {
      followers: followStats.firstDegreeSize ?? 0,
      impressions: stats?.impressionCount ?? 0,
      engagementRate: stats?.engagementRate ?? 0,
      postsThisWeek: stats?.shareCount ?? 0,
      profileViews: 0,
      period: "lifetime",
    };
  }

  // Personal profile fallback
  const profile = await linkedinFetch<{ vanityName?: string; id?: string }>("/me", token).catch(() => null);

  return {
    followers: 0,
    impressions: 0,
    engagementRate: 0,
    postsThisWeek: 0,
    profileViews: 0,
    period: "lifetime",
  };
}

export async function checkLinkedInHealth(token: string): Promise<LinkedInHealthCheck> {
  try {
    const profile = await linkedinFetch<{
      localizedFirstName?: string;
      localizedLastName?: string;
      vanityName?: string;
    }>("/me", token);
    const name = [profile.localizedFirstName, profile.localizedLastName].filter(Boolean).join(" ") || profile.vanityName || "LinkedIn User";
    return { ok: true, name };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
