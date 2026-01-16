import { Link } from "wouter";
import { PublicLayout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar } from "lucide-react";

export default function ConfirmationPage() {
  return (
    <PublicLayout>
      <Card className="p-12 text-center shadow-xl border-0 ring-1 ring-black/5">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight mb-2">Booking Confirmed!</h1>
        <p className="text-muted-foreground max-w-sm mx-auto mb-8">
          You are scheduled for a meeting. A calendar invitation has been sent to your email address.
        </p>

        <div className="flex justify-center gap-4">
          <Link href="/">
             <Button variant="outline">
               Back to Home
             </Button>
          </Link>
          <Button variant="default">
             <Calendar className="mr-2 h-4 w-4" /> Add to Calendar
          </Button>
        </div>
      </Card>
    </PublicLayout>
  );
}
