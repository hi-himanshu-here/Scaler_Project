import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type CreateEventTypeInput = z.infer<typeof api.eventTypes.create.input>;
type UpdateEventTypeInput = z.infer<typeof api.eventTypes.update.input>;

export function useEventTypes() {
  return useQuery({
    queryKey: [api.eventTypes.list.path],
    queryFn: async () => {
      const res = await fetch(api.eventTypes.list.path);
      if (!res.ok) throw new Error("Failed to fetch event types");
      return api.eventTypes.list.responses[200].parse(await res.json());
    },
  });
}

export function useEventType(id: number) {
  return useQuery({
    queryKey: [api.eventTypes.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.eventTypes.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch event type");
      return api.eventTypes.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useEventTypeBySlug(username: string, slug: string) {
  return useQuery({
    queryKey: [api.eventTypes.getBySlug.path, username, slug],
    queryFn: async () => {
      const url = buildUrl(api.eventTypes.getBySlug.path, { username, slug });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch event type");
      return api.eventTypes.getBySlug.responses[200].parse(await res.json());
    },
    enabled: !!username && !!slug,
  });
}

export function useCreateEventType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateEventTypeInput) => {
      const res = await fetch(api.eventTypes.create.path, {
        method: api.eventTypes.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create event type");
      return api.eventTypes.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.eventTypes.list.path] }),
  });
}

export function useUpdateEventType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateEventTypeInput) => {
      const url = buildUrl(api.eventTypes.update.path, { id });
      const res = await fetch(url, {
        method: api.eventTypes.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update event type");
      return api.eventTypes.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.eventTypes.list.path] }),
  });
}

export function useDeleteEventType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.eventTypes.delete.path, { id });
      const res = await fetch(url, { method: api.eventTypes.delete.method });
      if (!res.ok) throw new Error("Failed to delete event type");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.eventTypes.list.path] }),
  });
}
