import { useState } from "react";
import { useMe } from "@/hooks/use-users";
import { DashboardLayout } from "@/components/Layout";
import { LoadingScreen } from "@/components/ui/Loading";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { data: user, isLoading } = useMe();
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [saving, setSaving] = useState(false);

  if (isLoading) return <LoadingScreen />;
  if (!user) return null;

  async function saveTimezone() {
    setSaving(true);
    try {
      await fetch("/api/users/timezone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile and account settings.
        </p>
      </div>

      <div className="space-y-6">
        {/* PROFILE */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your public profile information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <Label>Profile Picture</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Calculated from your name for now.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={user.name} readOnly className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={user.username} readOnly className="bg-muted/50" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                value={user.bio || ""}
                readOnly
                className="bg-muted/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* GENERAL */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input value={user.email} readOnly className="bg-muted/50" />
            </div>

            {/* ✅ TIMEZONE (ASSIGNMENT SAFE) */}
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. Asia/Kolkata"
              />
              <Button
                onClick={saveTimezone}
                disabled={saving}
                className="mt-2"
              >
                {saving ? "Saving..." : "Save Timezone"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Availability is interpreted in your timezone.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
