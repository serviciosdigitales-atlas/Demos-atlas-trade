import { Database } from "lucide-react";

import { useDemoFlow } from "@/app/flow";
import { PlatformAccessCard, PlatformShellDemo } from "@/demos/shared/PlatformShellDemo";

/**
 * Dashboard del home al que se ingresa después del login. Replica el AppShell
 * real de `atlas-trade-front` (sidebar colapsable + header + contenido) de
 * forma autocontenida.
 */
export function HomeDashboardDemo() {
  const flow = useDemoFlow();
  const goAbm = flow ? { onClick: flow.advance } : { to: "/demos/abm" };

  return (
    <PlatformShellDemo activeNav="home" headerTitle="Inicio">
      <div className="flex flex-1 flex-col gap-10 p-4">
        <div className="flex flex-col items-center justify-center gap-6 py-12">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-atlas-primary font-heading text-2xl font-semibold text-white">
            AT
          </div>
          <div className="text-center">
            <h1 className="font-heading text-3xl font-bold text-atlas-primary">Atlas Trade</h1>
            <p className="mt-2 text-muted-foreground">Portal de Confirming · Banco Atlas</p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Accesos directos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <PlatformAccessCard
              icon={<Database className="size-5 text-atlas-primary" />}
              title="ABM"
              description="Gestión de entes, usuarios y notificaciones."
              {...goAbm}
            />
          </div>
        </div>
      </div>
    </PlatformShellDemo>
  );
}
