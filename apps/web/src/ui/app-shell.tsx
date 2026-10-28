import { useEffect, useState, type PropsWithChildren } from "react";
import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { Button } from "../components/ui/button";

export function AppShell({ children }: PropsWithChildren) {
  const [dark, setDark] = useState(() => {
    try {
      return (
        (localStorage.getItem("kanbanana-theme") ??
          (matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light")) === "dark"
      );
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("kanbanana-theme", dark ? "dark" : "light");
    } catch {
      /* Storage may be disabled. */
    }
  }, [dark]);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-5 sm:px-8">
          <Link
            to="/boards"
            className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Kanbanana home"
          >
            <img
              src="/kanbanana-ken.png"
              alt=""
              className="size-12 object-contain"
            />
            <span className="text-xl font-semibold tracking-tight">
              kanbanana<span className="text-primary-foreground">.</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs tracking-wide text-muted-foreground sm:block">
              A little order. A lot more headspace.
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
