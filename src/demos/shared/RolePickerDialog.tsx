import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mockResponses } from "@/demos/login/mock-session";
import { cn } from "@/lib/utils";

/** "operador-proveedor" → "Operador Proveedor" */
export function roleLabel(role: string): string {
  return role
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Al abrir una pantalla desde la galería (fuera del recorrido), pregunta con qué
 * rol verla. Solo lista los roles que tienen acceso a esa pantalla en particular;
 * dentro del recorrido no se usa (el rol viene del login).
 */
export function RolePickerDialog({
  open,
  onOpenChange,
  roles,
  currentRole,
  onPick,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Roles habilitados para esta pantalla (claves del fixture de login). */
  roles: string[];
  currentRole: string;
  onPick: (role: string) => void;
  description: string;
}) {
  // Agrupa los roles elegibles por dominio para que se lea como el selector del login.
  const byDomain = roles.reduce<Record<string, string[]>>((acc, role) => {
    const domain = mockResponses[role]?.user.domain ?? "otros";
    (acc[domain] ??= []).push(role);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>¿Con qué rol querés ver esta pantalla?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {Object.entries(byDomain).map(([domain, domainRoles]) => (
            <div key={domain}>
              <p className="mb-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                {domain}
              </p>
              <div className="flex flex-col gap-1">
                {domainRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      onPick(role);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                      role === currentRole && "border-atlas-primary/50 bg-atlas-primary/5"
                    )}
                  >
                    <span className="font-medium">{roleLabel(role)}</span>
                    {role === currentRole && (
                      <span className="text-[10px] font-medium text-atlas-primary uppercase">
                        actual
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Solo se listan los roles con permisos para esta pantalla. Podés cambiarlo después desde
          la barra de simulación.
        </p>
      </DialogContent>
    </Dialog>
  );
}
