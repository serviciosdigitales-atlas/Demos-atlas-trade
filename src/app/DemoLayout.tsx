import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

import type { DemoEntry } from "@/demos/registry";
import { Button } from "@/components/ui/button";
import { BrandBar } from "@/app/BrandBar";

export function DemoLayout({ demo, children }: { demo: DemoEntry; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Identificación persistente: esto es el catálogo de demos, no la app real */}
      <BrandBar
        right={
          <Button asChild variant="secondary" size="sm">
            <Link to="/">
              <ArrowLeft />
              Galería
            </Link>
          </Button>
        }
      />
      {/* Sub-barra con el nombre del demo actual */}
      <div className="sticky top-11 z-10 flex items-center gap-3 border-b bg-background/80 px-4 py-2 backdrop-blur">
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium">{demo.title}</span>
          {demo.category && (
            <span className="text-xs text-muted-foreground">{demo.category}</span>
          )}
        </div>
      </div>
      <main className="flex-1">{children}</main>
    </div>
  );
}
