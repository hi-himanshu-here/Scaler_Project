import { db } from "./db";
import {
  users, eventTypes, availabilities, bookings,
  type User, type InsertUser,
  type EventType, type InsertEventType, type UpdateEventTypeRequest,
  type Availability, type InsertAvailability,
  type Booking, type InsertBooking,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Event Types
  getEventTypes(userId: number): Promise<EventType[]>;
  getEventType(id: number): Promise<EventType | undefined>;
  getEventTypeBySlug(username: string, slug: string): Promise<EventType | undefined>;
  createEventType(eventType: InsertEventType): Promise<EventType>;
  updateEventType(id: number, updates: UpdateEventTypeRequest): Promise<EventType>;
  deleteEventType(id: number): Promise<void>;

  // Availability
  getAvailability(userId: number): Promise<Availability[]>;
  updateAvailability(userId: number, schedule: InsertAvailability[]): Promise<Availability[]>;

  // Bookings
  getBookings(userId: number): Promise<(Booking & { eventType?: EventType })[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBooking(id: number): Promise<Booking | undefined>;
  cancelBooking(id: number): Promise<Booking>;
  checkBookingConflict(eventTypeId: number, startTime: Date, endTime: Date): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getEventTypes(userId: number): Promise<EventType[]> {
    return await db.select().from(eventTypes).where(eq(eventTypes.userId, userId));
  }

  async getEventType(id: number): Promise<EventType | undefined> {
    const [eventType] = await db.select().from(eventTypes).where(eq(eventTypes.id, id));
    return eventType;
  }

  async getEventTypeBySlug(username: string, slug: string): Promise<EventType | undefined> {
    // Join users to find userId by username, then match slug
    const result = await db
      .select({ eventType: eventTypes })
      .from(eventTypes)
      .innerJoin(users, eq(eventTypes.userId, users.id))
      .where(and(eq(users.username, username), eq(eventTypes.slug, slug)));
    
    return result[0]?.eventType;
  }

  async createEventType(eventType: InsertEventType): Promise<EventType> {
    const [newType] = await db.insert(eventTypes).values(eventType).returning();
    return newType;
  }

  async updateEventType(id: number, updates: UpdateEventTypeRequest): Promise<EventType> {
    const [updated] = await db
      .update(eventTypes)
      .set(updates)
      .where(eq(eventTypes.id, id))
      .returning();
    return updated;
  }

  async deleteEventType(id: number): Promise<void> {
    await db.delete(eventTypes).where(eq(eventTypes.id, id));
  }

  async getAvailability(userId: number): Promise<Availability[]> {
    return await db.select().from(availabilities).where(eq(availabilities.userId, userId));
  }

  async updateAvailability(userId: number, schedule: InsertAvailability[]): Promise<Availability[]> {
    // Transaction: Delete all for user, then insert new
    return await db.transaction(async (tx) => {
      await tx.delete(availabilities).where(eq(availabilities.userId, userId));
      if (schedule.length > 0) {
        return await tx.insert(availabilities).values(schedule).returning();
      }
      return [];
    });
  }

  async getBookings(userId: number): Promise<(Booking & { eventType?: EventType })[]> {
    // Return bookings where user is host
    const rows = await db
      .select({
        booking: bookings,
        eventType: eventTypes,
      })
      .from(bookings)
      .innerJoin(eventTypes, eq(bookings.eventTypeId, eventTypes.id))
      .where(eq(eventTypes.userId, userId))
      .orderBy(sql`${bookings.startTime} asc`);
      
    return rows.map(r => ({ ...r.booking, eventType: r.eventType }));
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async cancelBooking(id: number): Promise<Booking> {
    const [updated] = await db
      .update(bookings)
      .set({ status: "cancelled" })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async checkBookingConflict(eventTypeId: number, startTime: Date, endTime: Date): Promise<boolean> {
    // Check if any confirmed booking overlaps
    // Overlap logic: (StartA < EndB) and (EndA > StartB)
    const existing = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.eventTypeId, eventTypeId),
          eq(bookings.status, "confirmed"),
          sql`${bookings.startTime} < ${endTime.toISOString()}`,
          sql`${bookings.endTime} > ${startTime.toISOString()}`
        )
      );
    
    return existing.length > 0;
  }
}

export const storage = new DatabaseStorage();
