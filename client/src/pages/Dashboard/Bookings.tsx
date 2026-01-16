import { useBookings, useCancelBooking } from "@/hooks/use-bookings";
import { DashboardLayout } from "@/components/Layout";
import { LoadingScreen } from "@/components/ui/Loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, isPast, isFuture, parseISO } from "date-fns";
import { CalendarX, Video, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BookingsPage() {
  const { data: bookings, isLoading } = useBookings();
  const cancelMutation = useCancelBooking();
  const { toast } = useToast();

  if (isLoading) return <LoadingScreen />;

  const upcomingBookings = bookings?.filter(b => b.status !== 'cancelled' && isFuture(parseISO(b.startTime as unknown as string))) || [];
  const pastBookings = bookings?.filter(b => b.status !== 'cancelled' && isPast(parseISO(b.startTime as unknown as string))) || [];
  const cancelledBookings = bookings?.filter(b => b.status === 'cancelled') || [];

  const handleCancel = (id: number) => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      cancelMutation.mutate(id, {
        onSuccess: () => {
          toast({ title: "Booking Cancelled", description: "The booking has been cancelled successfully." });
        }
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
        <p className="text-muted-foreground mt-1">See upcoming and past events.</p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming">
          <BookingList 
            bookings={upcomingBookings} 
            type="upcoming" 
            onCancel={handleCancel}
            isCancelling={cancelMutation.isPending}
          />
        </TabsContent>
        <TabsContent value="past">
          <BookingList bookings={pastBookings} type="past" />
        </TabsContent>
        <TabsContent value="cancelled">
          <BookingList bookings={cancelledBookings} type="cancelled" />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

function BookingList({ bookings, type, onCancel, isCancelling }: { bookings: any[], type: string, onCancel?: (id: number) => void, isCancelling?: boolean }) {
  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-muted/5">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <CalendarX className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg">No bookings found</h3>
        <p className="text-muted-foreground">You don't have any {type} bookings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => {
        const start = parseISO(booking.startTime);
        const end = parseISO(booking.endTime);
        
        return (
          <Card key={booking.id} className="overflow-hidden">
            <div className="flex flex-col md:flex-row border-l-4 border-primary">
              <div className="bg-muted/30 p-4 md:w-48 flex flex-col justify-center items-center md:items-start border-b md:border-b-0 md:border-r">
                <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {format(start, "EEE, MMM d")}
                </span>
                <span className="text-2xl font-bold text-foreground">
                  {format(start, "HH:mm")}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  to {format(end, "HH:mm")}
                </span>
              </div>
              
              <div className="p-4 md:p-6 flex-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{booking.eventType?.title || "Meeting"}</h3>
                  <div className="text-sm text-muted-foreground mt-1 flex flex-col gap-1">
                     <p className="font-medium text-foreground">{booking.guestName}</p>
                     <p>{booking.guestEmail}</p>
                     {booking.guestNotes && (
                       <p className="italic mt-1">"{booking.guestNotes}"</p>
                     )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Video className="h-3 w-3" /> Video Call
                  </Badge>
                  {type === 'upcoming' && onCancel && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                      onClick={() => onCancel(booking.id)}
                      disabled={isCancelling}
                    >
                      Cancel
                    </Button>
                  )}
                  {type === 'cancelled' && <Badge variant="destructive">Cancelled</Badge>}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
