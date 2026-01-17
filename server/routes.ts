import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

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

  seedDatabase().catch(console.error);

  // === USERS ===

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

  // ✅ ADD THIS: Update timezone (assignment-safe)
  app.patch("/api/users/timezone", async (req, res) => {
    const user = await getCurrentUser();
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { timezone } = req.body;

    if (!timezone || typeof timezone !== "string") {
      return res.status(400).json({ message: "Timezone is required" });
    }

    const updated = await storage.updateUserTimezone(user.id, timezone);
    res.json(updated);
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

    if (!type || type.isHidden) {
      return res.status(404).json({ message: "Event Type not found" });
    }

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
    const input = api.eventTypes.update.input.parse(req.body);
    const updated = await storage.updateEventType(Number(req.params.id), input);
    res.json(updated);
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
      const insertData = schedule.map(s => ({
        userId: user.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isActive: s.isActive,
      }));

      const updated = await storage.updateAvailability(user.id, insertData);
      res.json(updated);
    } catch (err: any) {
      if (err?.message === "INVALID_DAY_OF_WEEK") {
        return res.status(400).json({ message: "Invalid day of week" });
      }
      if (err?.message === "INVALID_TIME_RANGE") {
        return res.status(400).json({ message: "Start time must be before end time" });
      }
      if (err?.message === "OVERLAPPING_AVAILABILITY") {
        return res.status(400).json({ message: "Availability slots cannot overlap" });
      }
      return res.status(500).json({ message: "Failed to update availability" });
    }
  });

  // === DATE OVERRIDES (PUBLIC) ===
app.get("/api/date-overrides/:username", async (req, res) => {
  const { username } = req.params;
  const { date } = req.query;

  if (!date || typeof date !== "string") {
    return res.status(400).json({ message: "Date is required" });
  }

  const user = await storage.getUserByUsername(username);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const override = await storage.getDateOverride(user.id, date);

  // No override → return null (client handles this)
  if (!override) {
    return res.json(null);
  }

  res.json({
    isBlocked: override.isBlocked,
    startTime: override.startTime,
    endTime: override.endTime,
  });
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
      if (!eventType) {
        return res.status(404).json({ message: "Event type not found" });
      }

      const start = new Date(input.startTime);
      const end = new Date(start.getTime() + eventType.duration * 60000);

      const conflict = await storage.checkBookingConflict(
        input.eventTypeId,
        start,
        end
      );

      if (conflict) {
        return res.status(409).json({ message: "This time slot is already booked." });
      }

      const booking = await storage.createBooking({
        ...input,
        userId: eventType.userId,
        startTime: start,
        endTime: end,
      });

      res.status(201).json(booking);
    } catch (err: any) {
      if (err?.message === "BOOKING_CONFLICT") {
        return res.status(409).json({ message: "This time slot is already booked." });
      }
      return res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.patch(api.bookings.cancel.path, async (req, res) => {
    const booking = await storage.cancelBooking(Number(req.params.id));
    res.json(booking);
  });

  return httpServer;
}
