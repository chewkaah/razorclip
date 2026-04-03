import { api } from "./client";

export interface BIPulse {
  activeClients: number;
  totalClients: number;
  weeklyRevenue: number;
  weeklyBurn: number;
  netMargin: number;
  cashPosition: number;
  pipelineValue: number;
  // Mercury additions
  monthlyRevenue?: number;
  monthlyBurn?: number;
  availableBalance?: number;
  runwayDays?: number;
  mrr?: number;
  activeSubscriptions?: number;
  churnedThisMonth?: number;
}

export interface BITraffic {
  connected: boolean;
  data: {
    visitors: number;
    pageViews: number;
    topPages: { path: string; views: number }[];
    topReferrers: { referrer: string; views: number }[];
    period: string;
  } | null;
  error?: string;
}

export interface BIClient {
  id: string;
  name: string;
  logoUrl: string | null;
  retainerAmount: number | null;
  status: string;
  healthScore: string;
  assignedAgents: unknown;
  lastActivityAt: string | null;
}

export interface BIAlert {
  id: string;
  sourceType: string;
  alertType: string;
  title: string;
  description: string | null;
  severity: string;
  acknowledged: boolean;
  createdAt: string;
}

export const biApi = {
  pulse: (companyId: string) =>
    api.get<BIPulse>(`/companies/${companyId}/bi/pulse`),

  clients: (companyId: string) =>
    api.get<BIClient[]>(`/companies/${companyId}/bi/clients`),

  alerts: (companyId: string) =>
    api.get<BIAlert[]>(`/companies/${companyId}/bi/alerts`),

  acknowledgeAlert: (companyId: string, alertId: string) =>
    api.post<{ ok: boolean }>(`/companies/${companyId}/bi/alerts/${alertId}/acknowledge`, {}),

  traffic: (companyId: string) =>
    api.get<BITraffic>(`/companies/${companyId}/bi/traffic`),

  linkedin: (companyId: string) =>
    api.get<{
      connected: boolean;
      data: { followers: number; impressions: number; engagementRate: number; postsThisWeek: number; profileViews: number; period: string } | null;
      error?: string;
    }>(`/companies/${companyId}/bi/social/linkedin`),
};
