import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userProfileApi, type UserProfile } from "../api/userProfile";
import { authApi } from "../api/auth";
import { queryKeys } from "../lib/queryKeys";

const PROFILE_KEY = ["user-profile"] as const;

export function useUserProfile() {
  const queryClient = useQueryClient();

  // Get session for fallback name
  const sessionQuery = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    retry: false,
  });

  const query = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => userProfileApi.get(),
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: !!sessionQuery.data, // only fetch profile if we have a session
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<Pick<UserProfile, "contextMd" | "displayName" | "avatarUrl" | "timezone" | "preferences">>) =>
      userProfileApi.update(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(PROFILE_KEY, updated);
    },
  });

  // Display name priority: profile.displayName > session.user.name (first name) > "there"
  const displayName =
    query.data?.displayName ||
    sessionQuery.data?.user?.name?.split(" ")[0] ||
    "there";

  return {
    profile: query.data ?? null,
    displayName,
    isLoading: query.isLoading,
    error: query.error,
    updateProfile: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}

/** Helper to get the user's display name */
export function useDisplayName(): string {
  const { displayName } = useUserProfile();
  return displayName;
}
