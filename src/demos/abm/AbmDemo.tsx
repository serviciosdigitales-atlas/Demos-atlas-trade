import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Eye, Lock, Pencil, Plus } from "lucide-react";
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
import {
  ALTA_USUARIO_SEEDS,
  AltaUsuarioDialog,
  type Dominio,
  type Usuario,
} from "@/demos/alta-usuario/AltaUsuarioDialog";
import { RolePickerDialog, roleLabel } from "@/demos/shared/RolePickerDialog";
import { cn } from "@/lib/utils";
import usuariosData from "../../../mock-data/abm/usuarios.json";
import selectorData from "../../../mock-data/login/mock-selector-dominio-roles.json";
import {
  canAccessEntity,
  egpRows,
  FilterField,
  FilterPanel,
  GridPager,
  HEADER_INPUT_CLASS,
  HEADER_SELECT_CLASS,
  logAuditoria,
  proveedorRows,
  RowIconButton,
  StatusPill,
  type EnteRow,
  type EnteTipo,
} from "./abm-shared";
import { AltaEnteDialog } from "./AltaEnteDialog";
import { EntesGrid } from "./EntesGrid";
import { NotificacionesGrid } from "./NotificacionesGrid";

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

/** Dominio de la sesión mock → dominio del modal de alta de usuario. */
const DOMINIO_DIALOG: Record<string, Dominio> = {
  banco: "Banco",
  egp: "EGP",
  proveedor: "Proveedor",
};

const CARGAR_USUARIO_PERMISOS = [
  "cargar:usuario-banco",
  "cargar:usuario-egp",
  "cargar:usuario-proveedor",
];

export const TAB_CONFIG: {
  id: AbmTab;
  label: string;
  canView: (permissions: Set<string>) => boolean;
}[] = [
  // Regla acordada con funcional: la pestaña se ve con visualizar:<entidad>
  // o con cualquier permiso de acción sobre la entidad (ver abm-shared).
  {
    id: "egp",
    label: "EGP",
    canView: (p) => canAccessEntity(p, "ente-egp"),
  },
  {
    id: "proveedor",
    label: "Proveedor",
    canView: (p) => canAccessEntity(p, "ente-proveedor"),
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
    canView: (p) =>
      p.has("visualizar:notificaciones") || p.has("activar/desactivar:notificaciones"),
  },
];

const USUARIOS_COLUMNS = [
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
];

const ACCESO_OPTIONS = ["Activo", "Bloqueado"];
const ESTADO_OPTIONS = ["Pendiente de Autorización", "Autorizado"];
const DOMINIO_OPTIONS: UsuarioDominio[] = ["banco", "egp", "proveedor"];

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

/** Las acciones de la grilla de Usuarios siguen siendo mock sin backend (MAGIA-35). */
function usuarioActionToast(label: string, row: UsuarioRow) {
  toast.info(
    `«${label}» sobre ${row.nombre} ${row.apellido} (${row.ente}) — acción mock, sin backend.`,
    { duration: 4000 }
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
function UsuariosGrid({
  permissions,
  extraRows = [],
}: {
  permissions: Set<string>;
  /** Usuarios dados de alta en la sesión (MAGIA-47): se muestran arriba de los del mock. */
  extraRows?: UsuarioRow[];
}) {
  const [filters, setFilters] = useState<UsuariosFilters>(USUARIOS_FILTERS_DEFAULT);

  const allRows = useMemo(() => [...extraRows, ...usuarios], [extraRows]);
  const rolOptions = useMemo(() => [...new Set(allRows.map((u) => u.rol))], [allRows]);

  function setFilter(key: keyof UsuariosFilters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  // Filtrado básico en memoria; el demo no valida mínimos de caracteres ni llama APIs.
  const rows = useMemo(() => {
    return allRows.filter((u) => {
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
  }, [allRows, filters]);

  // Select full-size del panel de cabecera.
  function filterSelect(key: keyof UsuariosFilters, options: string[]) {
    return (
      <Select value={filters[key]} onValueChange={(v) => setFilter(key, v)}>
        <SelectTrigger className="w-full">
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

  // Select "borderless" que se muestra COMO el título de la columna (estilo Fenix).
  // value="" cuando el filtro es "todos" → el trigger muestra el nombre de la columna (placeholder).
  function headerFilterSelect(key: keyof UsuariosFilters, options: string[], placeholder: string) {
    return (
      <Select
        value={filters[key] === "todos" ? "" : filters[key]}
        onValueChange={(v) => setFilter(key, v || "todos")}
      >
        <SelectTrigger size="sm" className={HEADER_SELECT_CLASS}>
          <SelectValue placeholder={placeholder} />
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
      {/* Filtros de cabecera (MAGIA-30), estilo Fenix (Central de Gestión). */}
      <FilterPanel onClear={() => setFilters(USUARIOS_FILTERS_DEFAULT)}>
        <FilterField label="Nombre y Apellido">
          <Input
            placeholder="Nombre - Apellido"
            value={filters.nombre}
            onChange={(e) => setFilter("nombre", e.target.value)}
          />
        </FilterField>
        <FilterField label="Cédula">
          <Input
            placeholder="Nro. de cédula"
            value={filters.ci}
            onChange={(e) => setFilter("ci", e.target.value)}
          />
        </FilterField>
        <FilterField label="Ente asociado">
          <Input
            placeholder="Ente"
            value={filters.ente}
            onChange={(e) => setFilter("ente", e.target.value)}
          />
        </FilterField>
        <FilterField label="Acceso">{filterSelect("acceso", ACCESO_OPTIONS)}</FilterField>
        <FilterField label="Estado">{filterSelect("estado", ESTADO_OPTIONS)}</FilterField>
        <FilterField label="Dominio">{filterSelect("dominio", DOMINIO_OPTIONS)}</FilterField>
        <FilterField label="Rol">{filterSelect("rol", rolOptions)}</FilterField>
      </FilterPanel>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
            {/* Filtro DENTRO del header (MAGIA-30), estilo Fenix / T. Innominada:
                el control es el propio título de la columna. Mismo estado que el panel. */}
            <tr>
              {USUARIOS_COLUMNS.map((col) => (
                <th key={col} className="px-4 py-2 align-middle font-medium whitespace-nowrap">
                  {col === "Nombre" ? (
                    <Input
                      placeholder="Nombre - Apellido"
                      value={filters.nombre}
                      onChange={(e) => setFilter("nombre", e.target.value)}
                      className={cn(HEADER_INPUT_CLASS, "min-w-36")}
                    />
                  ) : col === "CI" ? (
                    <Input
                      placeholder="Nro. de cédula"
                      value={filters.ci}
                      onChange={(e) => setFilter("ci", e.target.value)}
                      className={cn(HEADER_INPUT_CLASS, "min-w-28")}
                    />
                  ) : col === "Ente asociado" ? (
                    <Input
                      placeholder="Ente"
                      value={filters.ente}
                      onChange={(e) => setFilter("ente", e.target.value)}
                      className={cn(HEADER_INPUT_CLASS, "min-w-28")}
                    />
                  ) : col === "Acceso" ? (
                    headerFilterSelect("acceso", ACCESO_OPTIONS, "Acceso")
                  ) : col === "Estado" ? (
                    headerFilterSelect("estado", ESTADO_OPTIONS, "Estado")
                  ) : col === "Dominio" ? (
                    headerFilterSelect("dominio", DOMINIO_OPTIONS, "Dominio")
                  ) : col === "Rol" ? (
                    headerFilterSelect("rol", rolOptions, "Rol")
                  ) : (
                    col
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={USUARIOS_COLUMNS.length}
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
                        <RowIconButton
                          icon={Eye}
                          label="Ver detalle"
                          onClick={() => usuarioActionToast("Ver detalle", row)}
                        />
                        {actions.approve && (
                          <RowIconButton
                            icon={Check}
                            label="Aprobar"
                            onClick={() => usuarioActionToast("Aprobar", row)}
                          />
                        )}
                        {actions.edit && (
                          <RowIconButton
                            icon={Pencil}
                            label="Modificar"
                            onClick={() => usuarioActionToast("Modificar", row)}
                          />
                        )}
                        {actions.block && (
                          <RowIconButton
                            icon={Lock}
                            label="Bloquear"
                            onClick={() => usuarioActionToast("Bloquear", row)}
                          />
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
      <GridPager shown={rows.length} total={allRows.length} />
    </>
  );
}

export function AbmDemo({ initialAltaUsuario = false }: { initialAltaUsuario?: boolean }) {
  const flow = useDemoFlow();
  // Si hay sesión mock iniciada en el login, el ABM arranca con ese rol.
  const [role, setRole] = useState<string>(
    () => getMockSession()?.user.role ?? "admin-banco"
  );
  const [activeTab, setActiveTab] = useState<AbmTab>("usuarios");

  // Fuera del recorrido la pantalla pregunta primero con qué rol verla;
  // dentro del recorrido el rol ya viene del paso de login.
  const [rolePickerOpen, setRolePickerOpen] = useState(() => flow === null);
  const [altaUsuarioOpen, setAltaUsuarioOpen] = useState(false);
  const [nuevosUsuarios, setNuevosUsuarios] = useState<UsuarioRow[]>([]);

  // Filas de entes elevadas de EntesGrid (MAGIA-38/39): el alta desde "+" inserta acá
  // y la relación Proveedor→EGP puede actualizar ambas pestañas.
  const [egpRowsState, setEgpRowsState] = useState<EnteRow[]>(() => [...egpRows]);
  const [provRowsState, setProvRowsState] = useState<EnteRow[]>(() => [...proveedorRows]);
  const [altaEnte, setAltaEnte] = useState<EnteTipo | null>(null);

  // Registros existentes para simular validaciones back-end del alta (MAGIA-47).
  const existingMails = useRef(new Set([ALTA_USUARIO_SEEDS.existingMail]));
  const existingCIs = useRef(new Set([ALTA_USUARIO_SEEDS.existingCI]));

  const sessionActive = getMockSession() !== null;
  const domain = mockResponses[role]?.user.domain ?? "banco";

  function handleRoleChange(newRole: string) {
    setRole(newRole);
    // Mantiene la sesión mock alineada con el rol elegido (sidebar incluido).
    if (getMockSession()) setMockSession(newRole);
  }

  // Roles que pueden ver esta pantalla en particular (para el selector inicial).
  const eligibleRoles = useMemo(() => {
    return Object.entries(mockResponses)
      .filter(([, entry]) => {
        const perms = new Set(entry.user.permissions);
        return initialAltaUsuario
          ? CARGAR_USUARIO_PERMISOS.some((p) => perms.has(p))
          : hasAbmAccess(perms);
      })
      .map(([r]) => r);
  }, [initialAltaUsuario]);

  /** Alta de usuario guardada: entra a la grilla como Pendiente de Autorización. */
  function handleAltaUsuarioSave(u: Usuario) {
    existingMails.current.add(u.mail.toLowerCase());
    existingCIs.current.add(u.ci);
    setNuevosUsuarios((prev) => [
      {
        nombre: u.nombre,
        apellido: u.apellido,
        ci: u.ci,
        mail: u.mail,
        telefono: u.tel,
        acceso: "Activo",
        estado: "Pendiente de Autorización",
        dominio: u.dominio.toLowerCase() as UsuarioDominio,
        ente: u.ente,
        rol: u.rol.toLowerCase(),
      },
      ...prev,
    ]);
    setAltaUsuarioOpen(false);
    toast.success("Registro exitoso", {
      description: `${u.nombre} ${u.apellido} fue registrado exitosamente.`,
    });
    // En el recorrido, guardar el alta completa el último paso.
    if (flow) flow.advance();
  }

  /**
   * Alta de EGP (MAGIA-38) / Proveedor (MAGIA-39) guardada: entra a la grilla como
   * Pendiente de Autorización. En Proveedor además se actualiza el EGP padre
   * (relación padre-hijo). APIs de datos financieros y notificación: fuera de alcance.
   */
  function handleAltaEnteSave(tipo: EnteTipo, row: EnteRow) {
    if (tipo === "egp") {
      setEgpRowsState((prev) => [row, ...prev]);
    } else {
      setProvRowsState((prev) => [row, ...prev]);
      setEgpRowsState((prev) =>
        prev.map((e) =>
          e.razonSocial === row.egpPadre
            ? { ...e, proveedoresAsociados: (e.proveedoresAsociados ?? 0) + 1 }
            : e
        )
      );
    }
    logAuditoria("alta", `${tipo === "egp" ? "EGP" : "Proveedor"} ${row.razonSocial} (${row.ruc})`);
    setAltaEnte(null);
    toast.success(`El ${row.razonSocial} fue registrado exitosamente`, {
      description:
        tipo === "egp"
          ? "Quedó Pendiente de Autorización en la grilla de EGP."
          : `Quedó Pendiente de Autorización, asociado al EGP ${row.egpPadre}.`,
    });
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

  function handleAltaOption(option: AltaOption) {
    if (option.id === "usuario") {
      // Seamless: el alta abre su modal sobre esta misma pantalla (MAGIA-47).
      setAltaUsuarioOpen(true);
      return;
    }
    // Alta de EGP (MAGIA-38) / Proveedor (MAGIA-39): modal sobre esta misma pantalla.
    setAltaEnte(option.id as EnteTipo);
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
            Épica MAGIA-5 · Mock
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

            {activeTab === "usuarios" && (
              <UsuariosGrid permissions={permissions} extraRows={nuevosUsuarios} />
            )}
            {(activeTab === "egp" || activeTab === "proveedor") && (
              // key: resetea filtros al cambiar de pestaña o de rol (las filas viven acá arriba)
              <EntesGrid
                key={activeTab}
                tipo={activeTab}
                permissions={permissions}
                rows={activeTab === "egp" ? egpRowsState : provRowsState}
                onRowsChange={activeTab === "egp" ? setEgpRowsState : setProvRowsState}
              />
            )}
            {activeTab === "notificaciones" && <NotificacionesGrid permissions={permissions} />}
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

      {/* Fuera del recorrido: elegir con qué rol ver esta pantalla (solo roles con acceso). */}
      <RolePickerDialog
        open={rolePickerOpen}
        onOpenChange={setRolePickerOpen}
        roles={eligibleRoles}
        currentRole={role}
        description={
          initialAltaUsuario
            ? "Elegí el rol para probar el alta de usuario. El modal se abre sobre la pantalla de Gestión ABM."
            : "Elegí el rol con el que se carga la pantalla de Gestión ABM."
        }
        onPick={(r) => {
          handleRoleChange(r);
          if (initialAltaUsuario) setAltaUsuarioOpen(true);
        }}
      />

      {/* Alta de EGP / Proveedor (MAGIA-38/39): modal sobre esta misma pantalla. */}
      {altaEnte && (
        <AltaEnteDialog
          tipo={altaEnte}
          existingRows={altaEnte === "egp" ? egpRowsState : provRowsState}
          // EGP Padre: solo entes vigentes no bloqueados (se excluyen Bloqueado y Rechazado).
          egpOptions={egpRowsState
            .filter((e) => e.estado !== "Bloqueado" && e.estado !== "Rechazado")
            .map((e) => e.razonSocial)}
          onClose={() => setAltaEnte(null)}
          onSave={(row) => handleAltaEnteSave(altaEnte, row)}
        />
      )}

      {/* Alta de usuario (MAGIA-47): modal sobre esta misma pantalla. */}
      {altaUsuarioOpen && (
        <AltaUsuarioDialog
          sessionDomain={DOMINIO_DIALOG[domain] ?? "Banco"}
          existingMails={existingMails.current}
          existingCIs={existingCIs.current}
          onClose={() => setAltaUsuarioOpen(false)}
          onSave={handleAltaUsuarioSave}
        />
      )}
    </PlatformShellDemo>
  );
}
