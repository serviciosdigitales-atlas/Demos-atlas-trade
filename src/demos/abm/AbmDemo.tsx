import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { useDemoFlow } from "@/app/flow";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlatformShellDemo } from "@/demos/shared/PlatformShellDemo";
import {
  getMockSession,
  mockResponses,
  setMockSession,
} from "@/demos/login/mock-session";
import { cn } from "@/lib/utils";
import selectorData from "../../../mock-data/login/mock-selector-dominio-roles.json";

const domainRoles = selectorData as Record<string, string[]>;

type AbmTab = "egp" | "proveedor" | "usuarios" | "notificaciones";

/** "operador-proveedor" → "Operador Proveedor" */
function roleLabel(role: string): string {
  return role
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const TAB_CONFIG: {
  id: AbmTab;
  label: string;
  canView: (permissions: Set<string>) => boolean;
}[] = [
  {
    id: "egp",
    label: "EGP",
    canView: (p) => p.has("visualizar:ente-egp"),
  },
  {
    id: "proveedor",
    label: "Proveedor",
    canView: (p) => p.has("visualizar:ente-proveedor"),
  },
  {
    id: "usuarios",
    label: "Usuarios",
    canView: (p) =>
      p.has("visualizar:usuario-banco") ||
      p.has("visualizar:usuario-egp") ||
      p.has("visualizar:usuario-proveedor"),
  },
  {
    id: "notificaciones",
    label: "Notificaciones",
    canView: (p) => p.has("visualizar:notificaciones"),
  },
];

const GRID_COLUMNS: Record<AbmTab, string[]> = {
  egp: ["Nombre", "RUC", "Estado", "Fecha alta"],
  proveedor: ["Razón social", "RUC", "Estado", "EGP vinculado"],
  usuarios: ["Nombre", "CI", "Mail", "Dominio", "Rol", "Estado"],
  notificaciones: ["Evento", "Canal", "Destinatario", "Estado"],
};

type AltaOption = {
  id: string;
  label: string;
  permission: string | string[];
};

function hasPermission(permissions: Set<string>, permission: string | string[]) {
  if (Array.isArray(permission)) {
    return permission.some((p) => permissions.has(p));
  }
  return permissions.has(permission);
}

function getAltaOptions(activeTab: AbmTab): AltaOption[] {
  switch (activeTab) {
    case "egp":
      return [{ id: "egp", label: "EGP", permission: "cargar:ente-egp" }];
    case "proveedor":
      return [{ id: "proveedor", label: "Proveedor", permission: "cargar:ente-proveedor" }];
    case "usuarios":
      return [
        {
          id: "usuario",
          label: "Nuevo usuario",
          permission: ["cargar:usuario-banco", "cargar:usuario-egp", "cargar:usuario-proveedor"],
        },
      ];
    default:
      return [];
  }
}

export function AbmDemo() {
  const flow = useDemoFlow();
  const navigate = useNavigate();
  // Si hay sesión mock iniciada en el login, el ABM arranca con ese rol.
  const [role, setRole] = useState<string>(
    () => getMockSession()?.user.role ?? "admin-banco"
  );
  const [activeTab, setActiveTab] = useState<AbmTab>("usuarios");

  const sessionActive = getMockSession() !== null;
  const domain = mockResponses[role]?.user.domain ?? "banco";

  function handleRoleChange(newRole: string) {
    setRole(newRole);
    // Mantiene la sesión mock alineada con el rol elegido (sidebar incluido).
    if (getMockSession()) setMockSession(newRole);
  }

  const permissions = useMemo(
    () => new Set(mockResponses[role]?.user.permissions ?? []),
    [role]
  );

  const visibleTabs = useMemo(
    () => TAB_CONFIG.filter((tab) => tab.canView(permissions)),
    [permissions]
  );

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id ?? "usuarios");
    }
  }, [activeTab, visibleTabs]);

  const altaOptions = useMemo(() => {
    return getAltaOptions(activeTab).filter((opt) => hasPermission(permissions, opt.permission));
  }, [activeTab, permissions]);

  const columns = GRID_COLUMNS[activeTab];

  function handleAltaOption(option: AltaOption) {
    if (option.id === "usuario") {
      if (flow) flow.advance();
      else navigate("/demos/alta-usuario");
      return;
    }

    toast.info(
      `Alta de “${option.label}” — el modal se implementará en una historia posterior.`,
      { duration: 4000 }
    );
  }

  return (
    // key: refresca el sidebar (usuario e ítem mock) cuando cambia el rol
    <PlatformShellDemo key={role} activeNav="abm" headerTitle="ABM">
      <div className="mx-auto w-full max-w-6xl p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-semibold">Gestión ABM</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Alta, baja y modificación de entes, usuarios y notificaciones
            </p>
          </div>
          <span className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
            MAGIA-25 · Mock
          </span>
        </div>

        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-dashed border-atlas-primary/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-800 uppercase dark:bg-amber-950 dark:text-amber-300">
              Simulación
            </span>
            <div>
              <p className="text-sm font-medium">
                {sessionActive
                  ? `Sesión mock activa (dominio ${domain})`
                  : `Sesión simulada (dominio ${domain})`}
              </p>
              <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
                {sessionActive
                  ? "El rol viene del Modo Mock del login. Cambialo acá para ver qué pestañas y opciones de alta quedan habilitadas."
                  : "Cambiá el rol para ver qué pestañas y opciones de alta quedan habilitadas según sus permisos."}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:min-w-56">
            <Label className="text-xs text-muted-foreground">Rol del usuario logueado</Label>
            <Select value={role} onValueChange={handleRoleChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(domainRoles).map(([dom, roles]) => (
                  <SelectGroup key={dom}>
                    <SelectLabel className="text-[10px] uppercase tracking-wide">
                      {dom}
                    </SelectLabel>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {visibleTabs.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Este rol no tiene permisos para visualizar ninguna sección del ABM.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      activeTab === tab.id
                        ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {altaOptions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <Plus />
                      Alta
                      <ChevronDown className="opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44">
                    {altaOptions.map((opt, index) => (
                      <div key={opt.id}>
                        {index > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuItem onSelect={() => handleAltaOption(opt)}>
                          {opt.label}
                        </DropdownMenuItem>
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="px-4 py-2.5 font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      Grilla de {TAB_CONFIG.find((t) => t.id === activeTab)?.label} — contenido
                      pendiente de historias futuras.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="mt-4 px-1 text-xs text-muted-foreground">
          Permisos activos:{" "}
          {[...permissions].length > 0 ? (
            [...permissions].map((p) => (
              <code key={p} className="mr-1.5 inline-block rounded bg-muted px-1.5 py-0.5">
                {p}
              </code>
            ))
          ) : (
            "ninguno"
          )}
        </p>
      </div>
    </PlatformShellDemo>
  );
}
