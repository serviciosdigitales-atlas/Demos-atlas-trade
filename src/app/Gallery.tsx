import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { demos, type DemoEntry } from "@/demos/registry";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<NonNullable<DemoEntry["status"]>, string> = {
  borrador: "Borrador",
  "en-progreso": "En progreso",
  listo: "Listo",
};

const STATUS_STYLES: Record<NonNullable<DemoEntry["status"]>, string> = {
  borrador: "bg-muted text-muted-foreground",
  "en-progreso": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  listo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

export function Gallery() {
  const categories = [...new Set(demos.map((d) => d.category ?? "Otros"))];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-atlas-primary text-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <p className="text-sm font-medium tracking-wide text-white/70 uppercase">
            Atlas Trade
          </p>
          <h1 className="mt-1 font-heading text-3xl font-semibold">Catálogo de demos</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/80">
            Mockups, pruebas de concepto y pantallas de trabajo. Cada tarjeta abre un demo
            interactivo construido con el mismo sistema de diseño que el producto real.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {categories.map((category) => {
          const items = demos.filter((d) => (d.category ?? "Otros") === category);
          return (
            <section key={category} className="mb-10">
              <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {category}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((demo) => (
                  <Link key={demo.slug} to={`/demos/${demo.slug}`} className="group">
                    <Card className="h-full transition-shadow hover:ring-atlas-primary/30 hover:shadow-md">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle>{demo.title}</CardTitle>
                          {demo.status && (
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                STATUS_STYLES[demo.status]
                              )}
                            >
                              {STATUS_LABEL[demo.status]}
                            </span>
                          )}
                        </div>
                        <CardDescription>{demo.description}</CardDescription>
                        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-atlas-primary">
                          Abrir demo
                          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        {demos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavía no hay demos. Agrega uno en <code>src/demos/registry.tsx</code>.
          </p>
        )}
      </div>
    </div>
  );
}
