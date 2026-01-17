import { db } from "./db";
import {
  users,
  eventTypes,
  availabilities,
  bookings,
  dateOverrides,
  type User,
  type InsertUser,
  type EventType,
  type InsertEventType,
  type UpdateEventTypeRequest,
  type Availability,
  type InsertAvailability,
  type Booking,
  type InsertBooking,
  type DateOverride,            // ✅
  type InsertDateOverride, 
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTimezone(userId: number, timezone: string): Promise<User>;

  getEventTypes(userId: number): Promise<EventType[]>;
  getEventType(id: number): Promise<EventType | undefined>;
  getEventTypeBySlug(username: string, slug: string): Promise<EventType | undefined>;
  createEventType(eventType: InsertEventType): Promise<EventType>;
  updateEventType(id: number, updates: UpdateEventTypeRequest): Promise<EventType>;
  deleteEventType(id: number): Promise<void>;

  getAvailability(userId: number): Promise<Availability[]>;
  updateAvailability(userId: number, schedule: InsertAvailability[]): Promise<Availability[]>;

  getBookings(userId: number): Promise<(Booking & { eventType?: EventType })[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBooking(id: number): Promise<Booking | undefined>;
  cancelBooking(id: number): Promise<Booking>;
  checkBookingConflict(eventTypeId: number, startTime: Date, endTime: Date): Promise<boolean>;

  getDateOverride(userId: number, date: string): Promise<DateOverride | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser) {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUserTimezone(userId: number, timezone: string) {
    const [updated] = await db
      .update(users)
      .set({ timezone })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async getEventTypes(userId: number) {
    return db
      .select()
      .from(eventTypes)
      .where(and(eq(eventTypes.userId, userId), eq(eventTypes.isHidden, false)));
  }

  async getEventType(id: number) {
    const [eventType] = await db.select().from(eventTypes).where(eq(eventTypes.id, id));
    return eventType;
  }

  async getEventTypeBySlug(username: string, slug: string) {
    const result = await db
      .select({ eventType: eventTypes })
      .from(eventTypes)
      .innerJoin(users, eq(eventTypes.userId, users.id))
      .where(and(eq(users.username, username), eq(eventTypes.slug, slug)));

    return result[0]?.eventType;
  }

  async createEventType(eventType: InsertEventType) {
    const [newType] = await db.insert(eventTypes).values(eventType).returning();
    return newType;
  }

  async updateEventType(id: number, updates: UpdateEventTypeRequest) {
    const [updated] = await db
      .update(eventTypes)
      .set(updates)
      .where(eq(eventTypes.id, id))
      .returning();
    return updated;
  }

  async deleteEventType(id: number) {
    await db.update(eventTypes).set({ isHidden: true }).where(eq(eventTypes.id, id));
  }

  async getDateOverride(userId: number, date: string): Promise<DateOverride | undefined> {
    const [override] = await db
      .select()
      .from(dateOverrides)
      .where(
        and(
          eq(dateOverrides.userId, userId),
          eq(dateOverrides.date, date)
        )
      );

    return override;
  }


  async getAvailability(userId: number) {
    return db.select().from(availabilities).where(eq(availabilities.userId, userId));
  }

  async updateAvailability(userId: number, schedule: InsertAvailability[]) {
    const byDay = new Map<number, InsertAvailability[]>();

    for (const slot of schedule) {
      if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) throw new Error("INVALID_DAY_OF_WEEK");
      if (slot.startTime >= slot.endTime) throw new Error("INVALID_TIME_RANGE");

      if (!byDay.has(slot.dayOfWeek)) byDay.set(slot.dayOfWeek, []);
      byDay.get(slot.dayOfWeek)!.push(slot);
    }

    for (const [, slots] of byDay) {
      const sorted = slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].startTime < sorted[i - 1].endTime) {
          throw new Error("OVERLAPPING_AVAILABILITY");
        }
      }
    }

    return db.transaction(async (tx) => {
      await tx.delete(availabilities).where(eq(availabilities.userId, userId));
      if (schedule.length) {
        return tx.insert(availabilities).values(schedule).returning();
      }
      return [];
    });

  }

  async getBookings(userId: number) {
    const rows = await db
      .select({ booking: bookings, eventType: eventTypes })
      .from(bookings)
      .innerJoin(eventTypes, eq(bookings.eventTypeId, eventTypes.id))
      .where(eq(eventTypes.userId, userId))
      .orderBy(sql`${bookings.startTime} asc`);

    return rows.map(r => ({ ...r.booking, eventType: r.eventType }));
  }

  async createBooking(booking: InsertBooking) {
    try {
      const [newBooking] = await db.insert(bookings).values(booking).returning();
      return newBooking;
    } catch (err: any) {
      if (err?.code === "23505") throw new Error("BOOKING_CONFLICT");
      throw err;
    }
  }

  async getBooking(id: number) {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async cancelBooking(id: number) {
    const [updated] = await db
      .update(bookings)
      .set({ status: "cancelled" })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  // ✅ BUFFER TIME ENFORCED HERE
  async checkBookingConflict(
    eventTypeId: number,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const [eventType] = await db
      .select({ bufferTime: eventTypes.bufferTime })
      .from(eventTypes)
      .where(eq(eventTypes.id, eventTypeId));

    const bufferMs = (eventType?.bufferTime ?? 0) * 60 * 1000;

    const bufferedStart = new Date(startTime.getTime() - bufferMs);
    const bufferedEnd = new Date(endTime.getTime() + bufferMs);

    const conflicts = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.eventTypeId, eventTypeId),
          eq(bookings.status, "confirmed"),
          sql`${bookings.startTime} < ${bufferedEnd.toISOString()}`,
          sql`${bookings.endTime} > ${bufferedStart.toISOString()}`
        )
      );

    return conflicts.length > 0;
  }
}

export const storage = new DatabaseStorage();
