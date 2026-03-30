import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userProfileApi, type UserProfile } from "../api/userProfile";

const PROFILE_KEY = ["user-profile"] as const;

export function useUserProfile() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => userProfileApi.get(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<Pick<UserProfile, "contextMd" | "displayName" | "avatarUrl" | "timezone" | "preferences">>) =>
      userProfileApi.update(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(PROFILE_KEY, updated);
    },
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    updateProfile: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}

/** Helper to get the user's display name from profile or session */
export function useDisplayName(): string {
  const { profile } = useUserProfile();
  return profile?.displayName || "User";
}
