import { useEffect, useMemo, useState } from "react";
import { Bell, Eye, FolderCheck, Lock, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { useDemoFlow } from "@/app/flow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  entesForRole,
  getMockEnte,
  getMockSession,
  mockResponses,
  setMockSession,
} from "@/demos/login/mock-session";
import {
  AltaUsuarioDialog,
  type Dominio,
  type Usuario,
} from "@/demos/alta-usuario/AltaUsuarioDialog";
import { RolePickerDialog, roleLabel } from "@/demos/shared/RolePickerDialog";
import { cn } from "@/lib/utils";
import selectorData from "../../../mock-data/login/mock-selector-dominio-roles.json";
import {
  canAccessEntity,
  FilterField,
  FilterPanel,
  GridPager,
  HEADER_INPUT_CLASS,
  HEADER_SELECT_CLASS,
  logAuditoria,
  RowIconButton,
  StatusPill,
  type EnteRow,
  type EnteTipo,
} from "./abm-shared";
import {
  sessionCIs,
  sessionMails,
  useAbmSession,
  type UsuarioDominio,
  type UsuarioRow,
} from "./abm-session-store";
import { AltaEnteDialog } from "./AltaEnteDialog";
import { EntesGrid } from "./EntesGrid";
import { NotificacionesGrid } from "./NotificacionesGrid";

const domainRoles = selectorData as Record<string, string[]>;

type AbmTab = "egp" | "proveedor" | "usuarios" | "notificaciones";

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
  "Cargado por",
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

/**
 * Control fino simulado: además del permiso visualizar:<recurso>, el Banco ve
 * todos los usuarios (de todos los dominios); los roles de EGP y Proveedor
 * solo ven los usuarios de su propia entidad (mismo dominio y mismo ente).
 */
export function canViewUsuarioRow(
  permissions: Set<string>,
  viewerDomain: UsuarioDominio,
  viewerEnte: string | null,
  row: UsuarioRow
): boolean {
  if (!permissions.has(`visualizar:usuario-${row.dominio}`)) return false;
  if (viewerDomain === "banco") return true;
  return row.dominio === viewerDomain && row.ente === viewerEnte;
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
  viewerDomain,
  viewerEnte,
  rows: sessionRows,
  onAprobar,
}: {
  permissions: Set<string>;
  /** Dominio del rol logueado: define qué usuarios de otros dominios se ven (filas 20/26). */
  viewerDomain: UsuarioDominio;
  /** Ente del rol logueado (null en banco): acota la grilla a la propia entidad. */
  viewerEnte: string | null;
  /** Todos los usuarios de la sesión de recorrido (semilla + altas en memoria). */
  rows: UsuarioRow[];
  onAprobar: (row: UsuarioRow) => void;
}) {
  const [filters, setFilters] = useState<UsuariosFilters>(USUARIOS_FILTERS_DEFAULT);

  const allRows = useMemo(
    () => sessionRows.filter((u) => canViewUsuarioRow(permissions, viewerDomain, viewerEnte, u)),
    [sessionRows, permissions, viewerDomain, viewerEnte]
  );
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
      {/* Nota para quien presenta la demo: estas reglas simulan el control fino del back-end. */}
      <p className="border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Controles finos simulados (sin backend):</span>{" "}
        el Banco ve todos los usuarios; los roles de EGP y Proveedor solo ven los usuarios de su
        propia entidad (su ente). El primer Admin-EGP / Admin-Proveedor de un ente se carga desde
        el dominio padre solo si no existe otro activo: la campanita junto a «Alta» avisa qué
        entes hijos siguen sin Admin.
      </p>

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
                        {/* Aprobar solo aplica a altas pendientes; el control fino
                            (filas 19/25) se valida en handleAprobarUsuario. */}
                        {actions.approve && row.estado === "Pendiente de Autorización" && (
                          <RowIconButton
                            icon={FolderCheck}
                            label="Aprobar"
                            onClick={() => onAprobar(row)}
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
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {row.cargadoPor.usuario}
                      </code>
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

/**
 * Modal de aprobación de alta de usuario (filas 19/25): muestra el detalle del
 * usuario pendiente y confirma la autorización. El control fino simulado se
 * valida al confirmar (dentro de onAutorizar), igual que en la grilla de entes.
 */
function AprobarUsuarioModal({
  usuario,
  onOpenChange,
  onAutorizar,
}: {
  usuario: UsuarioRow | null;
  onOpenChange: (open: boolean) => void;
  onAutorizar: (row: UsuarioRow) => void;
}) {
  return (
    <Dialog open={usuario !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aprobar alta de usuario</DialogTitle>
          <DialogDescription>
            Autorizá el alta del usuario en estado Pendiente de Autorización.
          </DialogDescription>
        </DialogHeader>

        {usuario && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border p-4 text-sm">
            <dt className="text-muted-foreground">Nombre</dt>
            <dd>
              {usuario.nombre} {usuario.apellido}
            </dd>
            <dt className="text-muted-foreground">CI</dt>
            <dd>{usuario.ci}</dd>
            <dt className="text-muted-foreground">Ente</dt>
            <dd>{usuario.ente}</dd>
            <dt className="text-muted-foreground">Rol</dt>
            <dd>{usuario.rol}</dd>
            <dt className="text-muted-foreground">Cargado por</dt>
            <dd>{usuario.cargadoPor.usuario}</dd>
          </dl>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (usuario) onAutorizar(usuario);
              onOpenChange(false);
            }}
          >
            Autorizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AbmDemo({ initialAltaUsuario = false }: { initialAltaUsuario?: boolean }) {
  const flow = useDemoFlow();
  // Si hay sesión mock iniciada en el login, el ABM arranca con ese rol.
  const [role, setRole] = useState<string>(
    () => getMockSession()?.user.role ?? "admin-banco"
  );
  // Ente del usuario logueado (solo dominios egp/proveedor): viene del login
  // o del role picker; si falta, se asume el primer ente del dominio.
  const [ente, setEnte] = useState<string | null>(() => {
    const initialRole = getMockSession()?.user.role ?? "admin-banco";
    const options = entesForRole(initialRole);
    if (options.length === 0) return null;
    const stored = getMockEnte();
    return stored && options.includes(stored) ? stored : (options[0] ?? null);
  });
  const [activeTab, setActiveTab] = useState<AbmTab>("usuarios");

  // Fuera del recorrido la pantalla pregunta primero con qué rol verla;
  // dentro del recorrido el rol ya viene del paso de login.
  const [rolePickerOpen, setRolePickerOpen] = useState(() => flow === null);
  const [altaUsuarioOpen, setAltaUsuarioOpen] = useState(false);
  // Ente hijo elegido desde la campanita: abre el alta apuntada a cargar su Admin.
  const [altaAdminEnte, setAltaAdminEnte] = useState<string | null>(null);

  // Estado de la "sesión de recorrido" (MAGIA-224): usuarios y entes viven en un
  // store en memoria, así las altas sobreviven a la navegación entre pantallas
  // y un refresh (F5) vuelve todo a la semilla de los JSON.
  const [usuariosRows, setUsuariosRows] = useAbmSession("usuarios");
  const [egpRowsState, setEgpRowsState] = useAbmSession("egpRows");
  const [provRowsState, setProvRowsState] = useAbmSession("provRows");
  const [altaEnte, setAltaEnte] = useState<EnteTipo | null>(null);
  // Usuario pendiente elegido para aprobar: abre el modal de aprobación.
  const [aprobarUsuario, setAprobarUsuario] = useState<UsuarioRow | null>(null);

  const sessionActive = getMockSession() !== null;
  const domain = mockResponses[role]?.user.domain ?? "banco";
  // Entes elegibles como "quién sos": salen del store (semilla + altas de la
  // sesión), así un EGP/Proveedor recién creado también se puede elegir acá.
  const enteOptions = useMemo(() => {
    const rows = domain === "egp" ? egpRowsState : domain === "proveedor" ? provRowsState : [];
    return rows.filter((e) => e.estado !== "Rechazado").map((e) => e.razonSocial);
  }, [domain, egpRowsState, provRowsState]);

  // Control fino simulado (relación EGP↔Proveedor, 1:N): no todos los entes ven
  // a todos. El filtro corre sobre el store de la sesión, así aplica igual a la
  // semilla de los JSON y a las altas en memoria. Banco ve todo; un rol EGP solo
  // ve su propio EGP y los Proveedores cuyo EGP padre es su ente; un rol
  // Proveedor solo se ve a sí mismo.
  const visibleEgpRows = useMemo(() => {
    if (domain === "egp") return egpRowsState.filter((e) => e.razonSocial === ente);
    if (domain === "proveedor") return [];
    return egpRowsState;
  }, [domain, ente, egpRowsState]);
  const visibleProvRows = useMemo(() => {
    if (domain === "egp") return provRowsState.filter((p) => p.egpPadre === ente);
    if (domain === "proveedor") return provRowsState.filter((p) => p.razonSocial === ente);
    return provRowsState;
  }, [domain, ente, provRowsState]);

  function handleRoleChange(newRole: string, newEnte?: string | null) {
    const options = entesForRole(newRole);
    // Si el nuevo dominio necesita ente y no vino uno elegido, se asume el primero.
    const nextEnte =
      options.length === 0
        ? null
        : newEnte && options.includes(newEnte)
          ? newEnte
          : (options[0] ?? null);
    setRole(newRole);
    setEnte(nextEnte);
    // Mantiene la sesión mock alineada con el rol/ente elegido (sidebar incluido).
    if (getMockSession()) setMockSession(newRole, nextEnte);
  }

  function handleEnteChange(newEnte: string) {
    setEnte(newEnte);
    if (getMockSession()) setMockSession(role, newEnte);
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
    sessionMails.add(u.mail.toLowerCase());
    sessionCIs.add(u.ci);
    setUsuariosRows((prev) => [
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
        // Base de los controles finos (filas 19/20/25/26): quién cargó el alta.
        cargadoPor: { usuario: role, dominio: domain as UsuarioDominio, ente },
      },
      ...prev,
    ]);
    setAltaUsuarioOpen(false);
    setAltaAdminEnte(null);
    toast.success("Registro exitoso", {
      description: `${u.nombre} ${u.apellido} fue registrado exitosamente.`,
    });
    // El ABM es el último paso del recorrido y funciona como espacio de trabajo
    // (crear ente → cargar su admin → aprobar), así que guardar un alta NO
    // termina el recorrido; se finaliza explícitamente desde la barra del tour.
  }

  /**
   * Aprobación de alta de usuario (filas 19/25): simula el control fino del
   * back-end. El dominio "padre" (banco→egp, egp→proveedor) solo aprueba
   * usuarios cargados por OTRO usuario de su propio dominio.
   */
  function handleAprobarUsuario(target: UsuarioRow) {
    const parentApproval =
      (domain === "banco" && target.dominio === "egp") ||
      (domain === "egp" && target.dominio === "proveedor");
    if (parentApproval && target.cargadoPor.dominio !== domain) {
      toast.error("Aprobación rechazada (control fino simulado)", {
        description: `Como rol del dominio ${domain} solo podés aprobar usuarios cargados por tu propio dominio; este alta la cargó ${target.cargadoPor.usuario}.`,
      });
      return;
    }
    if (parentApproval && target.cargadoPor.usuario === role) {
      toast.error("Aprobación rechazada (control fino simulado)", {
        description:
          "El alta debe aprobarla otro usuario del dominio: no puede aprobarla quien la cargó.",
      });
      return;
    }
    setUsuariosRows((prev) =>
      prev.map((u) =>
        u.ci === target.ci && u.dominio === target.dominio && u.ente === target.ente
          ? { ...u, estado: "Autorizado" }
          : u
      )
    );
    logAuditoria(
      "aprobar-alta",
      `usuario ${target.nombre} ${target.apellido} (${target.ente}) por ${role}`
    );
    toast.success(`${target.nombre} ${target.apellido} fue autorizado`, {
      description: `El alta cargada por ${target.cargadoPor.usuario} quedó aprobada.`,
    });
  }

  /**
   * Control fino simulado (filas 18/24): el alta inter-dominio de un Admin-EGP /
   * Admin-Proveedor solo procede si el ente aún no tiene un Admin activo.
   */
  function hasActiveAdmin(dominio: "EGP" | "Proveedor", enteNombre: string): boolean {
    const rolAdmin = dominio === "EGP" ? "admin-egp" : "admin-proveedor";
    return usuariosRows.some(
      (u) => u.rol === rolAdmin && u.ente === enteNombre && u.acceso === "Activo"
    );
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
          ? "Quedó Activo en la grilla de EGP (alta directa, sin aprobación)."
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

  // Dominios que este rol puede dar de alta según sus permisos cargar:usuario-*
  // (matriz filas 18/24: p. ej. operador-banco→EGP, operador-egp→Proveedor).
  const altaDomains = useMemo<Dominio[]>(() => {
    const domains: Dominio[] = [];
    if (permissions.has("cargar:usuario-banco")) domains.push("Banco");
    if (permissions.has("cargar:usuario-egp")) domains.push("EGP");
    if (permissions.has("cargar:usuario-proveedor")) domains.push("Proveedor");
    return domains;
  }, [permissions]);

  // Entes reales para el combo de alta de usuario: salen del store (semilla +
  // altas de la sesión), así un EGP/Proveedor recién creado aparece de una.
  // Se excluyen los rechazados; los bloqueados se marcan como tales. Usa las
  // filas visibles: un EGP solo puede cargar usuarios en sus propios Proveedores.
  const entesByDomain = useMemo(() => {
    const toOpcion = (rows: EnteRow[]) =>
      rows
        .filter((e) => e.estado !== "Rechazado")
        .map((e) => ({ nombre: e.razonSocial, bloqueado: e.estado === "Bloqueado" }));
    return { EGP: toOpcion(visibleEgpRows), Proveedor: toOpcion(visibleProvRows) };
  }, [visibleEgpRows, visibleProvRows]);

  // Flujo excepcional (filas 18/24): cuando el dominio padre carga un ente
  // nuevo, ese ente queda sin Admin activo. La campanita se la mostramos al rol
  // que puede cargar ese Admin (admin-banco→Admin-EGP, admin-egp→Admin-Proveedor)
  // con los entes hijos que siguen pendientes.
  const childAdminDomain: "EGP" | "Proveedor" | null =
    domain === "banco" ? "EGP" : domain === "egp" ? "Proveedor" : null;
  const pendingAdminEntes = useMemo(() => {
    if (!childAdminDomain) return [];
    if (!permissions.has(`cargar:usuario-${childAdminDomain.toLowerCase()}`)) return [];
    const rolAdmin = childAdminDomain === "EGP" ? "admin-egp" : "admin-proveedor";
    return entesByDomain[childAdminDomain]
      .filter(
        (e) =>
          !e.bloqueado &&
          !usuariosRows.some(
            (u) => u.rol === rolAdmin && u.ente === e.nombre && u.acceso === "Activo"
          )
      )
      .map((e) => e.nombre);
  }, [childAdminDomain, permissions, entesByDomain, usuariosRows]);

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
                  ? `Sesión mock activa (dominio ${domain}${ente ? ` · ${ente}` : ""})`
                  : `Sesión simulada (dominio ${domain}${ente ? ` · ${ente}` : ""})`}
              </p>
              <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
                {sessionActive
                  ? "El rol viene del Modo Mock del login. Cambialo acá para ver qué pestañas y opciones de alta quedan habilitadas."
                  : "Cambiá el rol para ver qué pestañas y opciones de alta quedan habilitadas según sus permisos."}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:min-w-56">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Rol del usuario logueado</Label>
              <Select value={role} onValueChange={(r) => handleRoleChange(r)}>
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
            {/* Dominios egp/proveedor: qué ente "sos" (define el ente asociado del alta). */}
            {enteOptions.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  {domain === "egp" ? "EGP del usuario logueado" : "Proveedor del usuario logueado"}
                </Label>
                <Select value={ente ?? ""} onValueChange={handleEnteChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {enteOptions.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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

              <div className="flex items-center gap-2">
                {/* Campanita (filas 18/24): entes hijos sin Admin activo. Cada ítem
                    abre el alta apuntada a cargar SOLO ese primer Admin. */}
                {activeTab === "usuarios" && pendingAdminEntes.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="relative"
                        aria-label={`${pendingAdminEntes.length} ente(s) sin Admin activo`}
                      >
                        <Bell />
                        <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                          {pendingAdminEntes.length}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-64">
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">
                        {childAdminDomain} sin Admin activo: cargá su primer Admin-
                        {childAdminDomain}.
                      </p>
                      <DropdownMenuSeparator />
                      {pendingAdminEntes.map((nombre) => (
                        <DropdownMenuItem
                          key={nombre}
                          onSelect={() => {
                            setAltaAdminEnte(nombre);
                            setAltaUsuarioOpen(true);
                          }}
                        >
                          Cargar Admin-{childAdminDomain} · {nombre}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* La pestaña activa ya define qué se da de alta: botón directo, sin menú. */}
                {altaOptions.length > 0 && (
                  <Button onClick={() => handleAltaOption(altaOptions[0])}>
                    <Plus />
                    Alta
                  </Button>
                )}
              </div>
            </div>

            {activeTab === "usuarios" && (
              <UsuariosGrid
                permissions={permissions}
                viewerDomain={domain as UsuarioDominio}
                viewerEnte={ente}
                rows={usuariosRows}
                onAprobar={setAprobarUsuario}
              />
            )}
            {(activeTab === "egp" || activeTab === "proveedor") && (
              // key: resetea filtros al cambiar de pestaña o de rol (las filas viven acá arriba)
              // rows: solo las visibles para el ente logueado; onRowsChange opera
              // por id sobre el store completo, así las acciones no pisan filas ocultas.
              <EntesGrid
                key={activeTab}
                tipo={activeTab}
                permissions={permissions}
                rows={activeTab === "egp" ? visibleEgpRows : visibleProvRows}
                onRowsChange={activeTab === "egp" ? setEgpRowsState : setProvRowsState}
                scopeNote={
                  domain === "egp"
                    ? activeTab === "egp"
                      ? `el rol del dominio EGP solo ve su propio ente (${ente}).`
                      : `el rol del dominio EGP solo ve los Proveedores asociados a ${ente} — aplica igual a la semilla y a las altas de la sesión.`
                    : domain === "proveedor"
                      ? "el rol del dominio Proveedor solo ve su propio ente."
                      : undefined
                }
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
        onPick={(r, pickedEnte) => {
          handleRoleChange(r, pickedEnte);
          if (initialAltaUsuario) setAltaUsuarioOpen(true);
        }}
      />

      {/* Alta de EGP / Proveedor (MAGIA-38/39): modal sobre esta misma pantalla. */}
      {altaEnte && (
        <AltaEnteDialog
          tipo={altaEnte}
          existingRows={altaEnte === "egp" ? egpRowsState : provRowsState}
          // EGP Padre: solo entes vigentes no bloqueados (se excluyen Bloqueado y
          // Rechazado). Filas visibles: un rol EGP solo puede asociar el Proveedor
          // a su propio ente (relación EGP↔Proveedor).
          egpOptions={visibleEgpRows
            .filter((e) => e.estado !== "Bloqueado" && e.estado !== "Rechazado")
            .map((e) => e.razonSocial)}
          onClose={() => setAltaEnte(null)}
          onSave={(row) => handleAltaEnteSave(altaEnte, row)}
        />
      )}

      {/* Alta de usuario (MAGIA-47): modal sobre esta misma pantalla. Desde la
          campanita queda apuntada SOLO a cargar el primer Admin del ente hijo. */}
      {altaUsuarioOpen && (
        <AltaUsuarioDialog
          sessionDomain={DOMINIO_DIALOG[domain] ?? "Banco"}
          sessionEnte={ente}
          allowedDomains={altaAdminEnte && childAdminDomain ? [childAdminDomain] : altaDomains}
          entesByDomain={entesByDomain}
          existingMails={sessionMails}
          existingCIs={sessionCIs}
          hasActiveAdmin={hasActiveAdmin}
          initialSelection={
            altaAdminEnte && childAdminDomain
              ? { dominio: childAdminDomain, ente: altaAdminEnte }
              : null
          }
          onClose={() => {
            setAltaUsuarioOpen(false);
            setAltaAdminEnte(null);
          }}
          onSave={handleAltaUsuarioSave}
        />
      )}

      {/* Aprobación de alta de usuario (filas 19/25): modal sobre esta pantalla. */}
      <AprobarUsuarioModal
        usuario={aprobarUsuario}
        onOpenChange={(open) => {
          if (!open) setAprobarUsuario(null);
        }}
        onAutorizar={handleAprobarUsuario}
      />
    </PlatformShellDemo>
  );
}
