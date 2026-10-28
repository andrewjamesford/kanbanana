import { useId, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import { errorMessage } from "../lib/api";

export function EntityDialog({
  title,
  description,
  label = "Name",
  name = "",
  text,
  children,
  submitLabel = "Save changes",
  onSave,
  onClose,
  onDelete,
}: {
  title: string;
  description: string;
  label?: string;
  name?: string;
  text?: string | null;
  children?: ReactNode;
  submitLabel?: string;
  onSave: (name: string, description: string) => Promise<void>;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const id = useId();
  const [value, setValue] = useState(name);
  const [details, setDetails] = useState(text ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const returnFocus = useRef(document.activeElement as HTMLElement | null);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (returnFocus.current?.isConnected) returnFocus.current.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <div className="space-y-2 pr-5">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </div>
        <form
          className="grid gap-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!value.trim() || pending) return;
            setPending(true);
            setError("");
            try {
              await onSave(value.trim(), details.trim());
              onClose();
            } catch (failure) {
              setError(errorMessage(failure));
            } finally {
              setPending(false);
            }
          }}
        >
          <fieldset disabled={pending} className="grid gap-5">
            <div className="grid gap-2">
              <label htmlFor={`${id}-name`} className="text-sm font-medium">
                {label}
              </label>
              <Input
                id={`${id}-name`}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                required
                maxLength={200}
                autoFocus
              />
            </div>
            {text !== undefined && (
              <div className="grid gap-2">
                <label
                  htmlFor={`${id}-description`}
                  className="text-sm font-medium"
                >
                  Description{" "}
                  <span className="font-normal text-muted-foreground">
                    optional
                  </span>
                </label>
                <Textarea
                  id={`${id}-description`}
                  value={details}
                  maxLength={10000}
                  onChange={(event) => setDetails(event.target.value)}
                />
              </div>
            )}
            {children}
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            {onDelete && (
              <Button
                variant="ghost"
                className="mr-auto text-destructive"
                disabled={pending}
                onClick={onDelete}
              >
                Delete
              </Button>
            )}
            <Button variant="secondary" disabled={pending} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !value.trim()}>
              {pending && <Loader2 className="animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDialog({
  name,
  detail,
  onConfirm,
  onClose,
}: {
  name: string;
  detail: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const returnFocus = useRef(document.activeElement as HTMLElement | null);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (returnFocus.current?.isConnected) returnFocus.current.focus();
        }}
      >
        <DialogTitle className="pr-5 text-xl font-semibold">
          Delete {name}?
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {detail}
        </DialogDescription>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError("");
              try {
                await onConfirm();
                onClose();
              } catch (failure) {
                setError(errorMessage(failure));
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
