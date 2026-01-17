import { pgTable, text, serial, integer, timestamp, boolean, unique } from "drizzle-orm/pg-core";
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

export const eventTypes = pgTable(
  "event_types",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    duration: integer("duration").notNull(),          // meeting duration (minutes)
    bufferTime: integer("buffer_time").notNull().default(0), // ✅ NEW (minutes)
    isHidden: boolean("is_hidden").default(false),
  },
  (t) => ({
    uniqueUserSlug: unique().on(t.userId, t.slug),
  })
);

export const availabilities = pgTable("availabilities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(), // HH:MM
  endTime: text("end_time").notNull(),     // HH:MM
  isActive: boolean("is_active").default(true),
});

export const dateOverrides = pgTable(
  "date_overrides",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    isBlocked: boolean("is_blocked").notNull().default(false),
    startTime: text("start_time"), // optional HH:MM
    endTime: text("end_time"),     // optional HH:MM
  },
  (t) => ({
    uniqueUserDate: unique().on(t.userId, t.date),
  })
);


export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    eventTypeId: integer("event_type_id").notNull(),
    userId: integer("user_id").notNull(),
    guestName: text("guest_name").notNull(),
    guestEmail: text("guest_email").notNull(),
    guestNotes: text("guest_notes"),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    status: text("status").notNull().default("confirmed"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    uniqueSlot: unique().on(t.eventTypeId, t.startTime),
  })
);

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

export const dateOverridesRelations = relations(dateOverrides, ({ one }) => ({
  user: one(users, {
    fields: [dateOverrides.userId],
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
export const insertDateOverrideSchema = createInsertSchema(dateOverrides).omit({ id: true });


// === TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type EventType = typeof eventTypes.$inferSelect;
export type InsertEventType = z.infer<typeof insertEventTypeSchema>;

export type Availability = typeof availabilities.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type DateOverride = typeof dateOverrides.$inferSelect;
export type InsertDateOverride = z.infer<typeof insertDateOverrideSchema>;

// Request Types
export type CreateEventTypeRequest = Omit<InsertEventType, "userId">;
export type UpdateEventTypeRequest = Partial<CreateEventTypeRequest>;
