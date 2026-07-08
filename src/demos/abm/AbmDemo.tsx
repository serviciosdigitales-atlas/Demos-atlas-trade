import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
  Pencil,
  Plus,
  type LucideIcon,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
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
import usuariosData from "../../../mock-data/abm/usuarios.json";
import selectorData from "../../../mock-data/login/mock-selector-dominio-roles.json";

const domainRoles = selectorData as Record<string, string[]>;

type AbmTab = "egp" | "proveedor" | "usuarios" | "notificaciones";

type UsuarioDominio = "banco" | "egp" | "proveedor";

/** Fila de la grilla de Usuarios (MAGIA-30). Un usuario con varios entes aparece una vez por ente. */
type UsuarioRow = {
  nombre: string;
  apellido: string;
  ci: string;
  mail: string;
  telefono: string;
  acceso: string;
  estado: string;
  dominio: UsuarioDominio;
  ente: string;
  rol: string;
};

const usuarios = usuariosData as UsuarioRow[];

/** "operador-proveedor" → "Operador Proveedor" */
function roleLabel(role: string): string {
  return role
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const TAB_CONFIG: {
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
  usuarios: [
    "Nombre",
    "Apellido",
    "CI",
    "Mail",
    "Teléfono",
    "Acceso",
    "Estado",
    "Acciones",
    "Dominio",
    "Ente asociado",
    "Rol",
  ],
  notificaciones: ["Evento", "Canal", "Destinatario", "Estado"],
};

const USUARIOS_PAGE_SIZE = 25;

const ACCESO_OPTIONS = ["Activo", "Bloqueado"];
const ESTADO_OPTIONS = ["Pendiente de Autorización", "Autorizado"];
const DOMINIO_OPTIONS: UsuarioDominio[] = ["banco", "egp", "proveedor"];
const ROL_OPTIONS = [...new Set(usuarios.map((u) => u.rol))];

/**
 * MAGIA-35: acciones habilitadas para una fila según los permisos del rol
 * logueado y el dominio de la fila (no el del usuario logueado).
 */
export function userActionsForRow(permissions: Set<string>, rowDomain: UsuarioDominio) {
  const resource =
    rowDomain === "banco"
      ? "usuario-banco"
      : rowDomain === "egp"
        ? "usuario-egp"
        : "usuario-proveedor";

  return {
    detail: true,
    approve: permissions.has(`aprobar-alta:${resource}`),
    edit: permissions.has(`modificar:${resource}`),
    block: permissions.has(`bloquear:${resource}`),
    delete: permissions.has(`borrar:${resource}`),
  };
}

type AltaOption = {
  id: string;
  label: string;
  permission: string | string[];
};

/** Indica si el usuario tiene acceso a al menos una sección del ABM (usado por el menú lateral). */
export function hasAbmAccess(permissions: Set<string>): boolean {
  return TAB_CONFIG.some((tab) => tab.canView(permissions));
}

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

const PILL_TONES = {
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

function StatusPill({ text, tone }: { text: string; tone: keyof typeof PILL_TONES }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        PILL_TONES[tone]
      )}
    >
      {text}
    </span>
  );
}

function RowActionButton({
  icon: Icon,
  label,
  row,
}: {
  icon: LucideIcon;
  label: string;
  row: UsuarioRow;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={() =>
        toast.info(
          `«${label}» sobre ${row.nombre} ${row.apellido} (${row.ente}) — acción mock, sin backend.`,
          { duration: 4000 }
        )
      }
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Icon className="size-4" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

type UsuariosFilters = {
  nombre: string;
  ci: string;
  ente: string;
  acceso: string;
  estado: string;
  dominio: string;
  rol: string;
};

const USUARIOS_FILTERS_DEFAULT: UsuariosFilters = {
  nombre: "",
  ci: "",
  ente: "",
  acceso: "todos",
  estado: "todos",
  dominio: "todos",
  rol: "todos",
};

/** Grilla de Usuarios: columnas y filtros (MAGIA-30) + columna Acciones por permisos (MAGIA-35). */
function UsuariosGrid({ permissions }: { permissions: Set<string> }) {
  const [filters, setFilters] = useState<UsuariosFilters>(USUARIOS_FILTERS_DEFAULT);

  function setFilter(key: keyof UsuariosFilters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  // Filtrado básico en memoria; el demo no valida mínimos de caracteres ni llama APIs.
  const rows = useMemo(() => {
    return usuarios.filter((u) => {
      const nombreCompleto = `${u.nombre} ${u.apellido}`.toLowerCase();
      if (filters.nombre && !nombreCompleto.includes(filters.nombre.toLowerCase())) return false;
      if (filters.ci && !u.ci.includes(filters.ci)) return false;
      if (filters.ente && !u.ente.toLowerCase().includes(filters.ente.toLowerCase())) return false;
      if (filters.acceso !== "todos" && u.acceso !== filters.acceso) return false;
      if (filters.estado !== "todos" && u.estado !== filters.estado) return false;
      if (filters.dominio !== "todos" && u.dominio !== filters.dominio) return false;
      if (filters.rol !== "todos" && u.rol !== filters.rol) return false;
      return true;
    });
  }, [filters]);

  function filterSelect(key: keyof UsuariosFilters, options: string[]) {
    return (
      <Select value={filters[key]} onValueChange={(v) => setFilter(key, v)}>
        <SelectTrigger size="sm" className="w-full min-w-24 font-normal normal-case">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
            <tr>
              {GRID_COLUMNS.usuarios.map((col) => (
                <th key={col} className="px-4 py-2.5 font-medium whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
            {/* Fila de filtros (MAGIA-30): Nombre/Apellido comparten un solo input. */}
            <tr className="border-t">
              <th colSpan={2} className="px-2 py-2 font-normal">
                <Input
                  placeholder="Nombre - Apellido"
                  value={filters.nombre}
                  onChange={(e) => setFilter("nombre", e.target.value)}
                  className="h-7 min-w-36 text-xs"
                />
              </th>
              <th className="px-2 py-2 font-normal">
                <Input
                  placeholder="Nro. de cédula"
                  value={filters.ci}
                  onChange={(e) => setFilter("ci", e.target.value)}
                  className="h-7 min-w-28 text-xs"
                />
              </th>
              <th />
              <th />
              <th className="px-2 py-2 font-normal">{filterSelect("acceso", ACCESO_OPTIONS)}</th>
              <th className="px-2 py-2 font-normal">{filterSelect("estado", ESTADO_OPTIONS)}</th>
              <th />
              <th className="px-2 py-2 font-normal">{filterSelect("dominio", DOMINIO_OPTIONS)}</th>
              <th className="px-2 py-2 font-normal">
                <Input
                  placeholder="Ente"
                  value={filters.ente}
                  onChange={(e) => setFilter("ente", e.target.value)}
                  className="h-7 min-w-28 text-xs"
                />
              </th>
              <th className="px-2 py-2 font-normal">{filterSelect("rol", ROL_OPTIONS)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={GRID_COLUMNS.usuarios.length}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Sin resultados para los filtros aplicados.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const actions = userActionsForRow(permissions, row.dominio);
                return (
                  <tr key={`${row.ci}-${row.dominio}-${row.ente}`} className="border-t">
                    <td className="px-4 py-2.5 whitespace-nowrap">{row.nombre}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{row.apellido}</td>
                    <td className="px-4 py-2.5">{row.ci}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.mail}</td>
                    <td className="px-4 py-2.5">{row.telefono}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill
                        text={row.acceso}
                        tone={row.acceso === "Activo" ? "green" : "red"}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill
                        text={row.estado}
                        tone={row.estado === "Autorizado" ? "green" : "amber"}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-0.5">
                        <RowActionButton icon={Eye} label="Ver detalle" row={row} />
                        {actions.approve && (
                          <RowActionButton icon={Check} label="Aprobar" row={row} />
                        )}
                        {actions.edit && (
                          <RowActionButton icon={Pencil} label="Modificar" row={row} />
                        )}
                        {actions.block && (
                          <RowActionButton icon={Lock} label="Bloquear" row={row} />
                        )}
                        {/* Eliminar nunca se muestra: ningún rol tiene borrar:usuario-* (MAGIA-35). */}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 capitalize">{row.dominio}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{row.ente}</td>
                    <td className="px-4 py-2.5">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.rol}</code>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginador decorativo (MAGIA-30): una sola página en el mock. */}
      <div className="flex items-center justify-between gap-4 border-t px-4 py-3 text-xs text-muted-foreground">
        <span>
          Mostrando {rows.length} de {usuarios.length} registros · {USUARIOS_PAGE_SIZE} por página
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled
            className="rounded-md border p-1 disabled:opacity-40"
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="px-2">Página 1 de 1</span>
          <button
            type="button"
            disabled
            className="rounded-md border p-1 disabled:opacity-40"
            aria-label="Página siguiente"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </>
  );
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
            MAGIA-25/30/35 · Mock
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

            {activeTab === "usuarios" ? (
              <UsuariosGrid permissions={permissions} />
            ) : (
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
            )}
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
