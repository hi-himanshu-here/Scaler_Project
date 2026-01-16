import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertEventTypeSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Seed Helper
  async function seedDatabase() {
    const existingUser = await storage.getUserByUsername("demo");
    if (!existingUser) {
      console.log("Seeding database...");
      const user = await storage.createUser({
        username: "demo",
        name: "Demo User",
        email: "demo@example.com",
        bio: "I love scheduling things.",
        timezone: "America/New_York",
      });

      // Event Types
      await storage.createEventType({
        userId: user.id,
        title: "15 Min Meeting",
        slug: "15min",
        description: "A quick catch-up.",
        duration: 15,
        isHidden: false,
      });

      await storage.createEventType({
        userId: user.id,
        title: "30 Min Meeting",
        slug: "30min",
        description: "Standard meeting duration.",
        duration: 30,
        isHidden: false,
      });

      // Availability (Mon-Fri 9-5)
      const availability = [];
      for (let day = 1; day <= 5; day++) {
        availability.push({
          userId: user.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "17:00",
          isActive: true,
        });
      }
      await storage.updateAvailability(user.id, availability);
      console.log("Database seeded!");
    }
  }

  // Ensure seeding runs (simple hack: run on first request or just execute now? 
  // Better to just call it. Since we are in an async function, we can await it slightly or let it float.
  // We'll call it and catch errors.)
  seedDatabase().catch(console.error);

  // === USERS ===
  
  // Helper to get "current" user (simulated auth)
  async function getCurrentUser() {
    return await storage.getUserByUsername("demo");
  }

  app.get(api.users.me.path, async (req, res) => {
    const user = await getCurrentUser();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.get(api.users.getByUsername.path, async (req, res) => {
    const user = await storage.getUserByUsername(req.params.username);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  // === EVENT TYPES ===

  app.get(api.eventTypes.list.path, async (req, res) => {
    const user = await getCurrentUser();
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    const types = await storage.getEventTypes(user.id);
    res.json(types);
  });

  app.get(api.eventTypes.get.path, async (req, res) => {
    const type = await storage.getEventType(Number(req.params.id));
    if (!type) return res.status(404).json({ message: "Event Type not found" });
    res.json(type);
  });

  app.get(api.eventTypes.getBySlug.path, async (req, res) => {
    const { username, slug } = req.params;
    const type = await storage.getEventTypeBySlug(username, slug);
    if (!type) return res.status(404).json({ message: "Event Type not found" });
    res.json(type);
  });

  app.post(api.eventTypes.create.path, async (req, res) => {
    const user = await getCurrentUser();
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const input = api.eventTypes.create.input.parse(req.body);
      const newType = await storage.createEventType({
        ...input,
        userId: user.id,
      });
      res.status(201).json(newType);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.eventTypes.update.path, async (req, res) => {
    try {
      const input = api.eventTypes.update.input.parse(req.body);
      const updated = await storage.updateEventType(Number(req.params.id), input);
      res.json(updated);
    } catch (err) {
       // Handle not found/zod
       res.status(500).json({message: "Error updating"});
    }
  });

  app.delete(api.eventTypes.delete.path, async (req, res) => {
    await storage.deleteEventType(Number(req.params.id));
    res.status(204).send();
  });

  // === AVAILABILITY ===

  app.get(api.availability.list.path, async (req, res) => {
    const user = await getCurrentUser();
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    const availability = await storage.getAvailability(user.id);
    res.json(availability);
  });

  app.get(api.availability.getUserAvailability.path, async (req, res) => {
    const user = await storage.getUserByUsername(req.params.username);
    if (!user) return res.status(404).json({ message: "User not found" });
    const availability = await storage.getAvailability(user.id);
    res.json(availability);
  });

  app.put(api.availability.update.path, async (req, res) => {
    const user = await getCurrentUser();
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    try {
      const { schedule } = api.availability.update.input.parse(req.body);
      // Map to InsertAvailability
      const insertData = schedule.map(s => ({
        userId: user.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isActive: s.isActive,
      }));
      
      const updated = await storage.updateAvailability(user.id, insertData);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // === BOOKINGS ===

  app.get(api.bookings.list.path, async (req, res) => {
    const user = await getCurrentUser();
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    const bookings = await storage.getBookings(user.id);
    res.json(bookings);
  });

  app.post(api.bookings.create.path, async (req, res) => {
    try {
      const input = api.bookings.create.input.parse(req.body);
      const eventType = await storage.getEventType(input.eventTypeId);
      if (!eventType) return res.status(404).json({ message: "Event type not found" });

      // Calculate end time
      const start = new Date(input.startTime);
      const end = new Date(start.getTime() + eventType.duration * 60000);

      // Check conflict
      const conflict = await storage.checkBookingConflict(input.eventTypeId, start, end);
      if (conflict) {
        return res.status(409).json({ message: "This time slot is already booked." });
      }

      const booking = await storage.createBooking({
        ...input,
        userId: eventType.userId, // The host
        endTime: end,
        startTime: start, // Ensure it's a Date object
      });

      res.status(201).json(booking);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.patch(api.bookings.cancel.path, async (req, res) => {
    const booking = await storage.cancelBooking(Number(req.params.id));
    res.json(booking);
  });

  return httpServer;
}
