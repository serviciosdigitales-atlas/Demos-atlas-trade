import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

import type { DemoEntry } from "@/demos/registry";
import { Button } from "@/components/ui/button";

export function DemoLayout({ demo, children }: { demo: DemoEntry; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/80 px-4 py-2.5 backdrop-blur">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft />
            Galería
          </Link>
        </Button>
        <div className="h-4 w-px bg-border" />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium">{demo.title}</span>
          {demo.category && (
            <span className="text-xs text-muted-foreground">{demo.category}</span>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
