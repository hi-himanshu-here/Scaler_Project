import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type CreateBookingInput = z.infer<typeof api.bookings.create.input>;

export function useBookings() {
  return useQuery({
    queryKey: [api.bookings.list.path],
    queryFn: async () => {
      const res = await fetch(api.bookings.list.path);
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return api.bookings.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: async (data: CreateBookingInput) => {
      const res = await fetch(api.bookings.create.path, {
        method: api.bookings.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (res.status === 409) {
        throw new Error("This slot is already booked. Please choose another time.");
      }
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to create booking");
      }
      
      return api.bookings.create.responses[201].parse(await res.json());
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.bookings.cancel.path, { id });
      const res = await fetch(url, { method: api.bookings.cancel.method });
      if (!res.ok) throw new Error("Failed to cancel booking");
      return api.bookings.cancel.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] }),
  });
}
