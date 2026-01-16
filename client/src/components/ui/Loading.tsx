import { Loader2 } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
    </div>
  );
}

export function LoadingSpinner() {
  return <Loader2 className="h-4 w-4 animate-spin" />;
}
