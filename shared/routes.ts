import { z } from 'zod';
import { 
  insertEventTypeSchema, 
  insertAvailabilitySchema, 
  insertBookingSchema,
  eventTypes,
  availabilities,
  bookings,
  users
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  conflict: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  // User Management (Simplified for this assignment)
  users: {
    me: {
      method: 'GET' as const,
      path: '/api/users/me',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
      },
    },
    getByUsername: {
      method: 'GET' as const,
      path: '/api/users/:username',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },

  // Event Types
  eventTypes: {
    list: {
      method: 'GET' as const,
      path: '/api/event-types',
      responses: {
        200: z.array(z.custom<typeof eventTypes.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/event-types/:id',
      responses: {
        200: z.custom<typeof eventTypes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    getBySlug: {
      method: 'GET' as const,
      path: '/api/event-types/slug/:username/:slug',
      responses: {
        200: z.custom<typeof eventTypes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/event-types',
      input: insertEventTypeSchema.omit({ userId: true }),
      responses: {
        201: z.custom<typeof eventTypes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/event-types/:id',
      input: insertEventTypeSchema.omit({ userId: true }).partial(),
      responses: {
        200: z.custom<typeof eventTypes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/event-types/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // Availability
  availability: {
    list: {
      method: 'GET' as const,
      path: '/api/availability',
      responses: {
        200: z.array(z.custom<typeof availabilities.$inferSelect>()),
      },
    },
    getUserAvailability: {
      method: 'GET' as const,
      path: '/api/availability/:username',
      responses: {
        200: z.array(z.custom<typeof availabilities.$inferSelect>()),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/availability',
      input: z.object({
        schedule: z.array(z.object({
          dayOfWeek: z.number().min(0).max(6),
          startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
          endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
          isActive: z.boolean(),
        }))
      }),
      responses: {
        200: z.array(z.custom<typeof availabilities.$inferSelect>()),
      },
    },
  },

  // Bookings
  bookings: {
    list: {
      method: 'GET' as const,
      path: '/api/bookings',
      responses: {
        200: z.array(z.custom<typeof bookings.$inferSelect & { eventType?: typeof eventTypes.$inferSelect }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/bookings',
      input: z.object({
        eventTypeId: z.number(),
        guestName: z.string().min(1),
        guestEmail: z.string().email(),
        guestNotes: z.string().optional(),
        startTime: z.string().datetime(), // ISO string from frontend
      }),
      responses: {
        201: z.custom<typeof bookings.$inferSelect>(),
        400: errorSchemas.validation,
        409: errorSchemas.conflict, // Double booking
      },
    },
    cancel: {
      method: 'PATCH' as const,
      path: '/api/bookings/:id/cancel',
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
