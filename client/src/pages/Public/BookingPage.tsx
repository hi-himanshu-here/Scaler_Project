import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useEventTypeBySlug } from "@/hooks/use-event-types";
import { useUserAvailability } from "@/hooks/use-availability";
import { PublicLayout } from "@/components/Layout";
import { LoadingScreen } from "@/components/ui/Loading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Clock, ChevronLeft } from "lucide-react";
import { format, addMinutes, isBefore, startOfDay, parse } from "date-fns";

export default function BookingPage() {
  const { username, slug } = useParams();
  const [, setLocation] = useLocation();

  const { data: eventType, isLoading: isLoadingEvent } =
    useEventTypeBySlug(username!, slug!);

  const { data: availability, isLoading: isLoadingAvailability } =
    useUserAvailability(username!);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [dateOverride, setDateOverride] = useState<any | null>(null);

  // 🔹 Fetch date override when date changes
  useEffect(() => {
    if (!selectedDate) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    fetch(`/api/date-overrides/${username}?date=${dateStr}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setDateOverride)
      .catch(() => setDateOverride(null));
  }, [selectedDate, username]);

  // 🔹 Slot generation (availability + overrides)
  useEffect(() => {
    if (!selectedDate || !availability || !eventType) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // ❌ Fully blocked date
    if (dateOverride?.isBlocked) {
      setAvailableSlots([]);
      return;
    }

    let startTime: string | null = null;
    let endTime: string | null = null;

    // 🟡 Date override hours
    if (dateOverride?.startTime && dateOverride?.endTime) {
      startTime = dateOverride.startTime;
      endTime = dateOverride.endTime;
    } else {
      // 🟢 Weekly availability
      const rule = availability.find(
        (r) => r.dayOfWeek === selectedDate.getDay() && r.isActive
      );

      if (!rule) {
        setAvailableSlots([]);
        return;
      }

      startTime = rule.startTime;
      endTime = rule.endTime;
    }

    const slots: string[] = [];
    let current = parse(startTime, "HH:mm", selectedDate);
    const end = parse(endTime, "HH:mm", selectedDate);

    const totalDuration =
      eventType.duration + (eventType.bufferTime || 0);

    while (isBefore(addMinutes(current, totalDuration), end)) {
      slots.push(format(current, "HH:mm"));
      current = addMinutes(current, totalDuration);
    }

    setAvailableSlots(slots);
  }, [selectedDate, availability, eventType, dateOverride]);

  if (isLoadingEvent || isLoadingAvailability) return <LoadingScreen />;
  if (!eventType) return <div className="p-12 text-center">Event not found</div>;

  return (
    <PublicLayout>
      <Card className="p-6">
        {selectedDate && (
          <Button
            variant="ghost"
            onClick={() => setSelectedDate(undefined)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}

        <h1 className="text-2xl font-bold mt-4">{eventType.title}</h1>
        <p className="text-muted-foreground mt-2">
          <Clock className="inline h-4 w-4 mr-1" />
          {eventType.duration} min
        </p>

        <div className="mt-6 flex gap-8">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => isBefore(date, startOfDay(new Date()))}
          />

          {selectedDate && (
            <div className="flex flex-col gap-2 w-40">
              {availableSlots.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No slots available
                </p>
              )}

              {availableSlots.map((time) => (
                <Button
                  key={time}
                  variant="outline"
                  onClick={() =>
                    setLocation(
                      `/${username}/${slug}/book?date=${format(
                        selectedDate,
                        "yyyy-MM-dd"
                      )}&time=${time}`
                    )
                  }
                >
                  {time}
                </Button>
              ))}
            </div>
          )}
        </div>
      </Card>
    </PublicLayout>
  );
}
