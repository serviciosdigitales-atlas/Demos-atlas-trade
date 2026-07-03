import { cn } from "@/lib/utils";

type Estado = "Vigente" | "Vencida" | "Cancelada";

interface Operation {
  id: string;
  cedente: string;
  monto: number;
  estado: Estado;
  fecha: string;
}

const ESTADOS: Estado[] = ["Vigente", "Vencida", "Cancelada"];

const MOCK_DATA: Operation[] = Array.from({ length: 12 }, (_, i) => ({
  id: `OP-${String(i + 1).padStart(4, "0")}`,
  cedente: `Empresa ${String.fromCharCode(65 + (i % 26))} S.A.`,
  monto: Math.round((10_000_000 + i * 3_750_500) * 100) / 100,
  estado: ESTADOS[i % ESTADOS.length]!,
  fecha: new Date(2025, i % 12, (i % 28) + 1).toLocaleDateString("es-PY"),
}));

const STATUS_STYLES: Record<Estado, string> = {
  Vigente: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Vencida: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  Cancelada: "bg-muted text-muted-foreground",
};

export function TablaOperacionesDemo() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="font-heading text-xl font-semibold">Operaciones</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Listado de operaciones de cesión con su estado actual.
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-2.5 font-medium">N° Operación</th>
              <th className="px-4 py-2.5 font-medium">Cedente</th>
              <th className="px-4 py-2.5 text-right font-medium">Monto (Gs.)</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {MOCK_DATA.map((op) => (
              <tr key={op.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{op.id}</td>
                <td className="px-4 py-2.5">{op.cedente}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {op.monto.toLocaleString("es-PY")}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_STYLES[op.estado]
                    )}
                  >
                    {op.estado}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{op.fecha}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
