import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export function useSubscription(userId: number) {
  const { data: user } = useQuery({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId,
  });

  const subscribe = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, planId }),
      });
      if (!res.ok) throw new Error("Failed to subscribe");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
    },
  });

  const getCharacterLimit = () => {
    if (!user) return 2; // Free tier default
    switch (user.subscriptionTier) {
      case "basic":
        return 5;
      case "premium":
        return Infinity;
      default:
        return 2; // Free tier
    }
  };

  const isWithinLimit = (currentCount: number) => {
    return currentCount < getCharacterLimit();
  };

  return {
    user,
    subscribe,
    getCharacterLimit,
    isWithinLimit,
    isSubscribed: user?.subscriptionTier !== "free",
  };
}
