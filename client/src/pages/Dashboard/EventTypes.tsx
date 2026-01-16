import { useState } from "react";
import { Link } from "wouter";
import { useEventTypes, useCreateEventType, useDeleteEventType, useUpdateEventType } from "@/hooks/use-event-types";
import { useMe } from "@/hooks/use-users";
import { DashboardLayout } from "@/components/Layout";
import { LoadingScreen, LoadingSpinner } from "@/components/ui/Loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Copy, Trash2, Clock, ExternalLink, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEventTypeSchema } from "@shared/schema";

// Schema for the form - ensuring proper types
const formSchema = insertEventTypeSchema.pick({
  title: true,
  slug: true,
  description: true,
  duration: true,
  isHidden: true
}).extend({
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute"),
});

type FormValues = z.infer<typeof formSchema>;

export default function EventTypesPage() {
  const { data: user } = useMe();
  const { data: eventTypes, isLoading } = useEventTypes();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  if (isLoading || !user) return <LoadingScreen />;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Event Types</h1>
          <p className="text-muted-foreground mt-1">Create and manage your booking links.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="mr-2 h-4 w-4" /> New Event Type
            </Button>
          </DialogTrigger>
          <CreateEventTypeDialog onClose={() => setIsCreateOpen(false)} />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {eventTypes?.map((eventType) => (
          <EventTypeCard key={eventType.id} eventType={eventType} username={user.username} />
        ))}
        {eventTypes?.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-muted/5">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">No event types yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mt-2 mb-6">
              Create your first event type to start accepting bookings.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>Create Event Type</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function EventTypeCard({ eventType, username }: { eventType: any, username: string }) {
  const { toast } = useToast();
  const deleteMutation = useDeleteEventType();
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const publicUrl = `${window.location.origin}/${username}/${eventType.slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast({ title: "Copied to clipboard", description: "Booking link copied." });
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-semibold">{eventType.title}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-8 w-8 text-muted-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditOpen(true)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={copyLink}>Copy Link</DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this event type?")) {
                      deleteMutation.mutate(eventType.id);
                    }
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription className="flex items-center gap-1">
             <span className="text-sm font-medium">/{username}/{eventType.slug}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-center text-sm text-muted-foreground mb-4">
            <Clock className="mr-2 h-4 w-4 opacity-70" />
            {eventType.duration} mins
          </div>
          {eventType.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5em]">
              {eventType.description}
            </p>
          )}
        </CardContent>
        <CardFooter className="pt-3 border-t flex justify-between">
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="mr-2 h-3 w-3" /> Copy Link
          </Button>
          <a href={`/${username}/${eventType.slug}`} target="_blank" rel="noopener noreferrer">
             <Button variant="ghost" size="sm">
               <ExternalLink className="h-4 w-4" />
             </Button>
          </a>
        </CardFooter>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <EditEventTypeDialog eventType={eventType} onClose={() => setIsEditOpen(false)} />
      </Dialog>
    </>
  );
}

function CreateEventTypeDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const createMutation = useCreateEventType();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      duration: 30,
      isHidden: false,
    },
  });

  // Auto-generate slug from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    form.setValue('title', title);
    if (!form.formState.dirtyFields.slug) {
      form.setValue('slug', slug);
    }
  };

  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast({ title: "Event Type Created", description: "Your new event type is ready." });
        onClose();
      },
      onError: (error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    });
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Create Event Type</DialogTitle>
        <DialogDescription>Define the details for your new booking link.</DialogDescription>
      </DialogHeader>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" {...form.register("title")} onChange={handleTitleChange} placeholder="e.g. Quick Chat" />
          {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <div className="flex items-center">
              <span className="text-muted-foreground text-sm mr-2">/</span>
              <Input id="slug" {...form.register("slug")} placeholder="quick-chat" />
            </div>
            {form.formState.errors.slug && <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input id="duration" type="number" {...form.register("duration")} />
            {form.formState.errors.duration && <p className="text-xs text-destructive">{form.formState.errors.duration.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea id="description" {...form.register("description")} placeholder="Add a description..." />
        </div>

        <div className="flex items-center space-x-2">
          <Switch 
            id="hidden" 
            checked={form.watch("isHidden")} 
            onCheckedChange={(checked) => form.setValue("isHidden", checked)} 
          />
          <Label htmlFor="hidden">Hide from public profile</Label>
        </div>

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <LoadingSpinner />}
            {createMutation.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function EditEventTypeDialog({ eventType, onClose }: { eventType: any, onClose: () => void }) {
  const { toast } = useToast();
  const updateMutation = useUpdateEventType();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: eventType.title,
      slug: eventType.slug,
      description: eventType.description || "",
      duration: eventType.duration,
      isHidden: eventType.isHidden || false,
    },
  });

  const onSubmit = (data: FormValues) => {
    updateMutation.mutate({ id: eventType.id, ...data }, {
      onSuccess: () => {
        toast({ title: "Updated", description: "Event type updated successfully." });
        onClose();
      },
      onError: (error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    });
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Edit Event Type</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="edit-title">Title</Label>
          <Input id="edit-title" {...form.register("title")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-slug">URL Slug</Label>
            <Input id="edit-slug" {...form.register("slug")} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-duration">Duration (mins)</Label>
            <Input id="edit-duration" type="number" {...form.register("duration")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-description">Description</Label>
          <Textarea id="edit-description" {...form.register("description")} />
        </div>

        <div className="flex items-center space-x-2">
          <Switch 
            id="edit-hidden" 
            checked={form.watch("isHidden")} 
            onCheckedChange={(checked) => form.setValue("isHidden", checked)} 
          />
          <Label htmlFor="edit-hidden">Hide from public profile</Label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={updateMutation.isPending}>
             {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
