import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useMe() {
  return useQuery({
    queryKey: [api.users.me.path],
    queryFn: async () => {
      const res = await fetch(api.users.me.path);
      if (!res.ok) throw new Error("Failed to fetch user");
      return api.users.me.responses[200].parse(await res.json());
    },
  });
}

export function useUserByUsername(username: string) {
  return useQuery({
    queryKey: [api.users.getByUsername.path, username],
    queryFn: async () => {
      const url = buildUrl(api.users.getByUsername.path, { username });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return api.users.getByUsername.responses[200].parse(await res.json());
    },
    enabled: !!username,
  });
}
