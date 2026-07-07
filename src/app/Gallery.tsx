import { ArrowRight, PlayCircle } from "lucide-react";
import { Link } from "react-router";

import { demos, type DemoEntry } from "@/demos/registry";
import { Button } from "@/components/ui/button";
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
          <h1 className="mt-1 font-heading text-3xl font-semibold">Prueba de conceptos / Demo (POC-atlas)</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/80">
            Mockups, pruebas de concepto y pantallas de trabajo. Cada tarjeta abre un demo
            interactivo construido con el mismo sistema de diseño que el producto real.
          </p>
          <div className="mt-5">
            <Button asChild variant="secondary" size="lg">
              <Link to="/recorrido">
                <PlayCircle />
                Probar plataforma
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Sección 1: Probar plataforma (recorrido encadenado, reemplaza al
            antiguo "modo demo guiado") */}
        <section className="mb-12">
          <h2 className="font-heading text-xl font-semibold">Probar plataforma</h2>
          <p className="mt-1 mb-4 max-w-2xl text-sm text-muted-foreground">
            Recorré la plataforma de punta a punta: las pantallas se encadenan simulando el
            flujo real de uso. Avanzás con el botón de cada pantalla, como en la app real.
          </p>
          <Link to="/recorrido" className="group block">
            <div className="flex flex-col gap-3 rounded-xl border border-atlas-primary/20 bg-atlas-primary/5 p-5 sm:flex-row sm:items-center">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-atlas-primary text-white">
                <PlayCircle className="size-6" />
              </span>
              <div className="flex-1">
                <p className="font-medium">Iniciar recorrido de la plataforma</p>
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-atlas-primary">
                Empezar
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </section>

        {/* Sección 2: Visualizar / probar componentes individuales (la grilla
            de demos abiertos por separado) */}
        <section>
          <h2 className="font-heading text-xl font-semibold">
            Visualizar componentes individuales
          </h2>
          <p className="mt-1 mb-6 max-w-2xl text-sm text-muted-foreground">
            Abrí cada pantalla por separado para revisarla y probarla en detalle.
          </p>

          {categories.map((category) => {
            const items = demos.filter((d) => (d.category ?? "Otros") === category);
            return (
              <div key={category} className="mb-10">
                <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {category}
                </h3>
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
              </div>
            );
          })}

          {demos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Todavía no hay demos. Agrega uno en <code>src/demos/registry.tsx</code>.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
