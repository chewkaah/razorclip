import { api } from "./client";

export interface Connection {
  id: string;
  companyId: string;
  slug: string;
  displayName: string;
  category: string;
  connectionType: string;
  authMechanism: string;
  status: "connected" | "disconnected" | "error" | "pending_auth";
  pluginId: string | null;
  secretRef: string | null;
  oauthScopes: unknown;
  lastSyncAt: string | null;
  lastHealthCheckAt: string | null;
  lastError: string | null;
  errorCode: string | null;
  metadata: Record<string, unknown>;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLog {
  id: string;
  connectionId: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  recordsSynced: number | null;
  errorMessage: string | null;
  durationMs: number | null;
}

export const connectionsApi = {
  list: (companyId: string) =>
    api.get<Connection[]>(`/companies/${companyId}/connections`),

  get: (companyId: string, slug: string) =>
    api.get<Connection>(`/companies/${companyId}/connections/${slug}`),

  enable: (companyId: string, slug: string) =>
    api.post<Connection>(`/companies/${companyId}/connections/${slug}/enable`, {}),

  disable: (companyId: string, slug: string) =>
    api.post<Connection>(`/companies/${companyId}/connections/${slug}/disable`, {}),

  test: (companyId: string, slug: string) =>
    api.post<Connection>(`/companies/${companyId}/connections/${slug}/test`, {}),

  syncLogs: (companyId: string, slug: string) =>
    api.get<SyncLog[]>(`/companies/${companyId}/connections/${slug}/sync-logs`),

  create: (companyId: string, data: { slug: string; displayName: string; category?: string; connectionType?: string; authMechanism?: string }) =>
    api.post<Connection>(`/companies/${companyId}/connections`, data),

  configure: (companyId: string, slug: string, credentials: Record<string, string>) =>
    api.post<Connection>(`/companies/${companyId}/connections/${slug}/configure`, credentials),
};
