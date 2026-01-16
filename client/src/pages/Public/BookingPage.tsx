import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useEventTypeBySlug } from "@/hooks/use-event-types";
import { useUserAvailability } from "@/hooks/use-availability";
import { PublicLayout } from "@/components/Layout";
import { LoadingScreen } from "@/components/ui/Loading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Clock, Calendar as CalendarIcon, ChevronLeft } from "lucide-react";
import { format, addMinutes, isBefore, startOfDay, parse } from "date-fns";
import { Separator } from "@/components/ui/separator";

export default function BookingPage() {
  const { username, slug } = useParams();
  const [location, setLocation] = useLocation();
  const { data: eventType, isLoading: isLoadingEvent } = useEventTypeBySlug(username!, slug!);
  const { data: availability, isLoading: isLoadingAvailability } = useUserAvailability(username!);
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  useEffect(() => {
    if (selectedDate && availability && eventType) {
      // Logic to generate slots
      const dayOfWeek = selectedDate.getDay();
      const rule = availability.find(r => r.dayOfWeek === dayOfWeek);
      
      if (!rule || !rule.isActive) {
        setAvailableSlots([]);
        return;
      }

      const slots: string[] = [];
      let current = parse(rule.startTime, "HH:mm", selectedDate);
      const end = parse(rule.endTime, "HH:mm", selectedDate);
      
      // Safety: ensure infinite loop protection if duration is 0 (schema validation handles this but safe to be sure)
      const duration = Math.max(eventType.duration, 1); 

      while (isBefore(addMinutes(current, duration), end) || current.getTime() === end.getTime() - duration * 60000) {
        slots.push(format(current, "HH:mm"));
        current = addMinutes(current, duration);
      }
      
      setAvailableSlots(slots);
    }
  }, [selectedDate, availability, eventType]);

  if (isLoadingEvent || isLoadingAvailability) return <LoadingScreen />;
  if (!eventType) return <div className="text-center p-12">Event not found</div>;

  const handleSlotClick = (time: string) => {
    if (selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      setLocation(`/${username}/${slug}/book?date=${dateStr}&time=${time}`);
    }
  };

  return (
    <PublicLayout>
      <Card className="overflow-hidden shadow-xl border-0 ring-1 ring-black/5">
        <div className="flex flex-col md:flex-row min-h-[500px]">
          {/* Left Panel: Event Details */}
          <div className="p-6 md:p-8 md:w-1/3 bg-muted/10 border-r border-border/50">
            {selectedDate && (
               <Button variant="ghost" className="mb-4 -ml-2 pl-0 hover:bg-transparent text-muted-foreground" onClick={() => setSelectedDate(undefined)}>
                 <ChevronLeft className="h-4 w-4 mr-1" /> Back
               </Button>
            )}
            <h2 className="text-muted-foreground font-medium mb-1">Demo User</h2>
            <h1 className="text-2xl font-bold tracking-tight mb-4">{eventType.title}</h1>
            
            <div className="space-y-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{eventType.duration} min</span>
              </div>
              <div className="flex items-center gap-2">
                <VideoIcon className="h-4 w-4" />
                <span>Video Call</span>
              </div>
            </div>
            
            {eventType.description && (
              <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
                {eventType.description}
              </p>
            )}
          </div>

          {/* Right Panel: Calendar & Slots */}
          <div className="p-6 md:p-8 md:flex-1 bg-background">
            <div className="h-full flex flex-col items-center justify-start">
              <h3 className="text-lg font-semibold mb-6 w-full text-left">
                {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a Date & Time"}
              </h3>
              
              <div className="flex flex-col md:flex-row gap-8 w-full">
                <div className={`transition-all duration-300 ${selectedDate ? 'hidden md:block' : 'w-full flex justify-center'}`}>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => isBefore(date, startOfDay(new Date()))}
                    className="p-3 border rounded-md"
                  />
                </div>

                {selectedDate && (
                  <div className="flex-1 min-w-[200px] animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="h-[360px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                      {availableSlots.length > 0 ? (
                        availableSlots.map((time) => (
                          <Button
                            key={time}
                            variant="outline"
                            className="w-full justify-center font-normal hover:border-primary hover:bg-primary/5 transition-all"
                            onClick={() => handleSlotClick(time)}
                          >
                            {time}
                          </Button>
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground py-12">
                          No slots available for this day.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </PublicLayout>
  );
}

function VideoIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 8-6 4 6 4V8Z" />
      <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
    </svg>
  );
}
