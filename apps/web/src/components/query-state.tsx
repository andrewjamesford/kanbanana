import { AlertCircle, Loader2 } from "lucide-react";
import { errorMessage } from "../lib/api";
import { Button } from "./ui/button";
export function LoadingState() {
  return (
    <div
      role="status"
      className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-foreground"
    >
      <Loader2 className="size-5 animate-spin" />
      Loading your workspace...
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto my-12 grid max-w-md justify-items-center gap-4 rounded-xl border border-border bg-card p-8 text-center"
    >
      <AlertCircle className="size-7 text-destructive" />
      <h2 className="font-semibold">We couldn't load this page</h2>
      <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
      <Button variant="secondary" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}
