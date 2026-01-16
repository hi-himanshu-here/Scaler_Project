import { useEffect, useState } from "react";
import { useAvailability, useUpdateAvailability } from "@/hooks/use-availability";
import { DashboardLayout } from "@/components/Layout";
import { LoadingScreen, LoadingSpinner } from "@/components/ui/Loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type ScheduleItem = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

export default function AvailabilityPage() {
  const { data: availability, isLoading } = useAvailability();
  const updateMutation = useUpdateAvailability();
  const { toast } = useToast();
  
  // Local state for form
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (availability) {
      // Initialize with backend data or defaults
      const initialSchedule = DAYS.map((_, index) => {
        const existing = availability.find(a => a.dayOfWeek === index);
        return existing ? {
          dayOfWeek: existing.dayOfWeek,
          startTime: existing.startTime,
          endTime: existing.endTime,
          isActive: existing.isActive ?? true
        } : {
          dayOfWeek: index,
          startTime: "09:00",
          endTime: "17:00",
          isActive: index !== 0 && index !== 6 // Default weekends off
        };
      });
      setSchedule(initialSchedule);
    }
  }, [availability]);

  const handleUpdate = (dayIndex: number, field: keyof ScheduleItem, value: any) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex] = { ...newSchedule[dayIndex], [field]: value };
    setSchedule(newSchedule);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate({ schedule }, {
      onSuccess: () => {
        toast({ title: "Saved", description: "Your availability has been updated." });
        setHasChanges(false);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Availability</h1>
          <p className="text-muted-foreground mt-1">Configure the times when you are available for bookings.</p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
          {updateMutation.isPending && <LoadingSpinner className="mr-2" />}
          {hasChanges ? "Save Changes" : "Saved"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Hours</CardTitle>
          <CardDescription>
            Set your standard weekly availability.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {schedule.map((day, index) => (
            <div key={index}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-4 w-32 shrink-0">
                  <Switch 
                    checked={day.isActive}
                    onCheckedChange={(checked) => handleUpdate(index, "isActive", checked)}
                  />
                  <span className={`font-medium ${!day.isActive ? "text-muted-foreground" : ""}`}>
                    {DAYS[index]}
                  </span>
                </div>

                <div className="flex-1 flex items-center gap-2 sm:gap-4">
                  {day.isActive ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="time" 
                          className="w-32" 
                          value={day.startTime}
                          onChange={(e) => handleUpdate(index, "startTime", e.target.value)}
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input 
                          type="time" 
                          className="w-32" 
                          value={day.endTime}
                          onChange={(e) => handleUpdate(index, "endTime", e.target.value)}
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        {/* Placeholder for "Add split hours" or "Delete" */}
                      </Button>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm italic py-2.5">Unavailable</span>
                  )}
                </div>
              </div>
              {index < 6 && <Separator className="my-2" />}
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
