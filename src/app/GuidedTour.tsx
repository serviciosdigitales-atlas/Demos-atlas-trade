import { useState } from "react";
import { ArrowLeft, ChevronLeft, RotateCcw, Sparkles } from "lucide-react";
import { Link } from "react-router";

import { getDemo, guidedTour } from "@/demos/registry";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BrandBar } from "@/app/BrandBar";
import { DemoFlowContext } from "@/app/flow";

/**
 * "Probar plataforma": recorrido encadenado de la plataforma. A diferencia de
 * abrir cada componente por separado desde la galería, esta pantalla
 * **encadena** los demos definidos en `guidedTour`: en cada paso, el botón
 * correspondiente de la propia pantalla (Ingresar, Alta de usuario, …) avanza
 * al siguiente, simulando el flujo real de la aplicación.
 */
export function GuidedTour() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const total = guidedTour.length;
  const current = guidedTour[step];

  function advance() {
    if (step < total - 1) setStep((s) => s + 1);
    else setDone(true);
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <BrandBar />
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-atlas-primary/10 text-atlas-primary">
            <Sparkles className="size-7" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold">Recorrido completado</h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Recorriste el flujo Login → Home → ABM → Alta de usuario tal como se encadena en la
              aplicación real.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setStep(0);
                setDone(false);
              }}
            >
              <RotateCcw />
              Reiniciar recorrido
            </Button>
            <Button asChild>
              <Link to="/">Volver a la galería</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;
  const demo = getDemo(current.slug);
  const Component = demo?.component;

  return (
    <DemoFlowContext.Provider
      value={{ stepIndex: step, total, nextLabel: current.nextLabel ?? "", advance }}
    >
      <div className="flex min-h-screen flex-col bg-background">
        <BrandBar
          right={
            <Button asChild variant="secondary" size="sm">
              <Link to="/">
                <ArrowLeft />
                Salir del recorrido
              </Link>
            </Button>
          }
        />

        {/* Barra de control del recorrido */}
        <div className="sticky top-11 z-10 flex flex-wrap items-center gap-3 border-b bg-background/80 px-4 py-2 backdrop-blur">
          <Button
            variant="ghost"
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft />
            Anterior
          </Button>

          <div className="flex items-center gap-1.5">
            {guidedTour.map((s, i) => (
              <span
                key={s.slug}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-6 bg-atlas-primary" : "w-1.5 bg-border",
                  i < step && "bg-atlas-primary/40"
                )}
              />
            ))}
          </div>

          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">
              Paso {step + 1} de {total} · {demo?.title}
            </span>
            {current.nextLabel && (
              <span className="text-xs text-muted-foreground">👉 {current.nextLabel}</span>
            )}
          </div>
        </div>

        <main className="flex-1">{Component ? <Component /> : null}</main>
      </div>
    </DemoFlowContext.Provider>
  );
}
