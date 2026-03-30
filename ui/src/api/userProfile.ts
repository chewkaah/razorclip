import { api } from "./client";

export interface UserProfile {
  id: string;
  userId: string;
  contextMd: string;
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string | null;
  preferences: {
    voiceTone: string;
    verbosity: string;
    autoApproveThreshold: number;
    defaultAgent: string | null;
    notifications: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export const userProfileApi = {
  /** Get current user's profile (creates if doesn't exist) */
  get: () => api.get<UserProfile>("/user/profile"),

  /** Update current user's profile */
  update: (data: Partial<Pick<UserProfile, "contextMd" | "displayName" | "avatarUrl" | "timezone" | "preferences">>) =>
    api.patch<UserProfile>("/user/profile", data),
};
