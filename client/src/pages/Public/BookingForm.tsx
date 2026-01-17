import { useLocation, useParams } from "wouter";
import { useEventTypeBySlug } from "@/hooks/use-event-types";
import { useCreateBooking } from "@/hooks/use-bookings";
import { PublicLayout } from "@/components/Layout";
import { LoadingScreen, LoadingSpinner } from "@/components/ui/Loading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import { format, parse } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  guestName: z.string().min(1, "Name is required"),
  guestEmail: z.string().email("Invalid email"),
  guestNotes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function BookingFormPage() {
  const { username, slug } = useParams();
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const dateParam = searchParams.get("date");
  const timeParam = searchParams.get("time");

  const { data: eventType, isLoading } = useEventTypeBySlug(username!, slug!);
  const createBookingMutation = useCreateBooking();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  if (isLoading) return <LoadingScreen />;
  if (!eventType || !dateParam || !timeParam) return <div>Invalid booking details</div>;

  const date = new Date(`${dateParam}T00:00:00`);
  // Parse time and combine with date for start time
  const timeDate = parse(timeParam, "HH:mm", date);
  // const startTimeISO = timeDate.toISOString(); 
  // IMPORTANT: Backend expects ISO string. We need to respect the fact that `date-fns` `parse` creates a local date object. 
  // The backend might interpret this as UTC or local depending on implementation. 
  // Notes said "Timezone handling: Display times in local time, but send ISO strings to backend."
  
  const onSubmit = (data: FormValues) => {
    createBookingMutation.mutate({
      eventTypeId: eventType.id,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestNotes: data.guestNotes,
      startTime: timeDate.toISOString(),
    }, {
      onSuccess: (booking) => {
        setLocation(`/booking/confirmation/${booking.id}`);
      },
      onError: (error) => {
        toast({ title: "Booking Failed", description: error.message, variant: "destructive" });
      }
    });
  };

  return (
    <PublicLayout>
      <Card className="overflow-hidden shadow-xl border-0 ring-1 ring-black/5">
        <div className="flex flex-col md:flex-row">
          {/* Left Panel: Summary */}
          <div className="p-6 md:p-8 md:w-1/3 bg-muted/10 border-r border-border/50">
             <Button variant="ghost" className="mb-6 -ml-2 pl-0 hover:bg-transparent text-muted-foreground" onClick={() => window.history.back()}>
               <ArrowLeft className="h-4 w-4 mr-1" /> Back
             </Button>
             
             <h2 className="text-muted-foreground font-medium mb-1">Demo User</h2>
             <h1 className="text-xl font-bold tracking-tight mb-6">{eventType.title}</h1>

             <div className="space-y-4">
               <div className="flex items-center gap-3 text-muted-foreground">
                 <Calendar className="h-4 w-4" />
                 <span className="font-medium text-foreground">{format(date, "EEEE, MMMM d, yyyy")}</span>
               </div>
               <div className="flex items-center gap-3 text-muted-foreground">
                 <Clock className="h-4 w-4" />
                 <span className="font-medium text-foreground">{timeParam}</span>
                 <span>({eventType.duration} min)</span>
               </div>
             </div>
          </div>

          {/* Right Panel: Form */}
          <div className="p-6 md:p-8 md:flex-1 bg-background">
            <h2 className="text-lg font-semibold mb-6">Enter Details</h2>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...form.register("guestName")} />
                {form.formState.errors.guestName && <p className="text-xs text-destructive">{form.formState.errors.guestName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register("guestEmail")} />
                {form.formState.errors.guestEmail && <p className="text-xs text-destructive">{form.formState.errors.guestEmail.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea id="notes" {...form.register("guestNotes")} />
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full" disabled={createBookingMutation.isPending}>
                  {createBookingMutation.isPending && <LoadingSpinner className="mr-2" />}
                  Confirm Booking
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Card>
    </PublicLayout>
  );
}
