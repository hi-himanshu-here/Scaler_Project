import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Dashboard Pages
import EventTypesPage from "@/pages/Dashboard/EventTypes";
import BookingsPage from "@/pages/Dashboard/Bookings";
import AvailabilityPage from "@/pages/Dashboard/Availability";
import SettingsPage from "@/pages/Dashboard/Settings";

// Public Pages
import BookingPage from "@/pages/Public/BookingPage";
import BookingFormPage from "@/pages/Public/BookingForm";
import ConfirmationPage from "@/pages/Public/Confirmation";

function Router() {
  return (
    <Switch>
      {/* Root redirects to dashboard for now since we have a single user */}
      <Route path="/" component={() => <Redirect to="/events" />} />
      
      {/* Dashboard Routes */}
      <Route path="/events" component={EventTypesPage} />
      <Route path="/bookings" component={BookingsPage} />
      <Route path="/availability" component={AvailabilityPage} />
      <Route path="/settings" component={SettingsPage} />

      {/* Public Booking Routes */}
      <Route path="/:username/:slug" component={BookingPage} />
      <Route path="/:username/:slug/book" component={BookingFormPage} />
      <Route path="/booking/confirmation/:id" component={ConfirmationPage} />

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
