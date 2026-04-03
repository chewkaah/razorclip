/**
 * Notion CRM integration — syncs client records from a Notion database
 * into the bi_clients table. Expects the Notion database to have:
 *   - Name (title property)
 *   - Status (select: Active, Paused, At Risk, Churned)
 *   - Retainer (number, monthly amount)
 *   - Health (select: Green, Amber, Red)
 */

const NOTION_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

export interface NotionClient {
  id: string;
  name: string;
  status: string;
  retainerAmount: number | null;
  healthScore: string;
  lastEditedAt: string;
}

export interface NotionHealthCheck {
  ok: boolean;
  userName?: string;
  error?: string;
}

async function notionFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${NOTION_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Notion API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

/** Extract a plain text value from a Notion property. */
function propText(prop: any): string {
  if (!prop) return "";
  if (prop.type === "title") return prop.title?.map((t: any) => t.plain_text).join("") ?? "";
  if (prop.type === "rich_text") return prop.rich_text?.map((t: any) => t.plain_text).join("") ?? "";
  if (prop.type === "select") return prop.select?.name ?? "";
  if (prop.type === "status") return prop.status?.name ?? "";
  return "";
}

function propNumber(prop: any): number | null {
  if (!prop || prop.type !== "number") return null;
  return prop.number ?? null;
}

/** Normalize a Notion status value to our internal status. */
function normalizeStatus(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("active") || lower.includes("live")) return "active";
  if (lower.includes("pause")) return "paused";
  if (lower.includes("risk") || lower.includes("at-risk") || lower.includes("at risk")) return "at-risk";
  if (lower.includes("churn") || lower.includes("cancel")) return "churned";
  if (lower.includes("onboard")) return "onboarding";
  return "active";
}

function normalizeHealth(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("red") || lower.includes("critical")) return "red";
  if (lower.includes("amber") || lower.includes("yellow") || lower.includes("warn")) return "amber";
  return "green";
}

/**
 * Query a Notion database and return client records.
 * The databaseId is stored in the connection's metadata.
 */
export async function fetchNotionClients(token: string, databaseId: string): Promise<NotionClient[]> {
  const body = {
    page_size: 100,
    sorts: [{ property: "Name", direction: "ascending" }],
  };

  const data = await notionFetch<{ results: any[] }>(
    `/databases/${databaseId}/query`,
    token,
    { method: "POST", body: JSON.stringify(body) },
  );

  return (data.results ?? []).map((page: any) => {
    const props = page.properties ?? {};
    // Try common property names for each field
    const name = propText(props.Name || props.name || props.Company || props.company || props.Client || props.client);
    const status = propText(props.Status || props.status || props.Stage || props.stage);
    const retainer = propNumber(props.Retainer || props.retainer || props.MRR || props.mrr || props.Revenue || props.revenue);
    const health = propText(props.Health || props.health || props["Health Score"] || props["health score"]);

    return {
      id: page.id,
      name: name || "Unnamed",
      status: normalizeStatus(status),
      retainerAmount: retainer,
      healthScore: normalizeHealth(health),
      lastEditedAt: page.last_edited_time ?? new Date().toISOString(),
    };
  }).filter((c: NotionClient) => c.name !== "Unnamed");
}

export async function checkNotionHealth(token: string): Promise<NotionHealthCheck> {
  try {
    const user = await notionFetch<{ bot?: { owner?: { user?: { name?: string } } } }>("/users/me", token);
    return { ok: true, userName: user.bot?.owner?.user?.name ?? "Notion Bot" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
