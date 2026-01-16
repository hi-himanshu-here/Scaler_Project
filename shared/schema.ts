import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  bio: text("bio"),
  timezone: text("timezone").notNull().default("UTC"),
});

export const eventTypes = pgTable("event_types", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Foreign key handled in code/logic for now or explicit references
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // in minutes
  isHidden: boolean("is_hidden").default(false),
});

export const availabilities = pgTable("availabilities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, ...
  startTime: text("start_time").notNull(), // Format "HH:MM" 24h
  endTime: text("end_time").notNull(), // Format "HH:MM" 24h
  isActive: boolean("is_active").default(true),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  eventTypeId: integer("event_type_id").notNull(),
  userId: integer("user_id").notNull(), // Host
  guestName: text("guest_name").notNull(),
  guestEmail: text("guest_email").notNull(),
  guestNotes: text("guest_notes"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").notNull().default("confirmed"), // confirmed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const usersRelations = relations(users, ({ many }) => ({
  eventTypes: many(eventTypes),
  bookings: many(bookings),
  availabilities: many(availabilities),
}));

export const eventTypesRelations = relations(eventTypes, ({ one, many }) => ({
  user: one(users, {
    fields: [eventTypes.userId],
    references: [users.id],
  }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  eventType: one(eventTypes, {
    fields: [bookings.eventTypeId],
    references: [eventTypes.id],
  }),
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
}));

export const availabilitiesRelations = relations(availabilities, ({ one }) => ({
  user: one(users, {
    fields: [availabilities.userId],
    references: [users.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertEventTypeSchema = createInsertSchema(eventTypes).omit({ id: true });
export const insertAvailabilitySchema = createInsertSchema(availabilities).omit({ id: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });

// === EXPLICIT API TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type EventType = typeof eventTypes.$inferSelect;
export type InsertEventType = z.infer<typeof insertEventTypeSchema>;

export type Availability = typeof availabilities.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// Request Types
export type CreateEventTypeRequest = Omit<InsertEventType, "userId">; // User ID inferred from session/default
export type UpdateEventTypeRequest = Partial<CreateEventTypeRequest>;

export type UpdateAvailabilityRequest = {
  schedule: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }[];
};

export type CreateBookingRequest = {
  eventTypeId: number;
  guestName: string;
  guestEmail: string;
  guestNotes?: string;
  startTime: string; // ISO string
};

// Response Types
export type EventTypeListResponse = EventType[];
export type AvailabilityListResponse = Availability[];
export type BookingListResponse = (Booking & { eventType?: EventType })[];
