import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type UpdateAvailabilityInput = z.infer<typeof api.availability.update.input>;

export function useAvailability() {
  return useQuery({
    queryKey: [api.availability.list.path],
    queryFn: async () => {
      const res = await fetch(api.availability.list.path);
      if (!res.ok) throw new Error("Failed to fetch availability");
      return api.availability.list.responses[200].parse(await res.json());
    },
  });
}

export function useUserAvailability(username: string) {
  return useQuery({
    queryKey: [api.availability.getUserAvailability.path, username],
    queryFn: async () => {
      const url = buildUrl(api.availability.getUserAvailability.path, { username });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch availability");
      return api.availability.getUserAvailability.responses[200].parse(await res.json());
    },
    enabled: !!username,
  });
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateAvailabilityInput) => {
      const res = await fetch(api.availability.update.path, {
        method: api.availability.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update availability");
      return api.availability.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.availability.list.path] }),
  });
}
