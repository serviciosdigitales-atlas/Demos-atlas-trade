import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  FilterField,
  FilterPanel,
  GridPager,
  HEADER_INPUT_CLASS,
  HEADER_SELECT_CLASS,
  StatusPill,
  logAuditoria,
  notificacionRows,
  type NotificacionRow,
} from "./abm-shared";

const COLUMNS = ["Nombre", "Evento disparador", "Dominio", "Rol", "Emails", "Mensaje", "Estado"];

const EVENTOS = [...new Set(notificacionRows.map((n) => n.evento))];
const DOMINIOS = ["banco", "egp", "proveedor"];
const ROLES = [...new Set(notificacionRows.map((n) => n.rol))];

/** Switch de activación (MAGIA-118); solo interactivo con permiso activar/desactivar. */
function EstadoSwitch({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      title={active ? "Desactivar notificación" : "Activar notificación"}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        active ? "bg-emerald-500" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform",
          active && "translate-x-4"
        )}
      />
    </button>
  );
}

/**
 * Grilla de Notificaciones: columnas y filtros (MAGIA-111/37) + switch de
 * activación por permiso (MAGIA-118). Sin columna Acciones: la única acción es el switch.
 */
export function NotificacionesGrid({ permissions }: { permissions: Set<string> }) {
  const canToggle = permissions.has("activar/desactivar:notificaciones");

  const [rows, setRows] = useState<NotificacionRow[]>(() => [...notificacionRows]);
  const [busqueda, setBusqueda] = useState("");
  // Multi-select de eventos (MAGIA-111): vacío = "Ver todos".
  const [eventos, setEventos] = useState<Set<string>>(new Set());
  const [dominio, setDominio] = useState("todos");
  const [rol, setRol] = useState("todos");
  const [estado, setEstado] = useState("todos");

  const filtered = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return rows.filter((n) => {
      // Búsqueda por nombre con mínimo de 3 caracteres (MAGIA-111).
      if (q.length >= 3 && !n.nombre.toLowerCase().includes(q)) return false;
      if (eventos.size > 0 && !eventos.has(n.evento)) return false;
      if (dominio !== "todos" && n.dominio !== dominio) return false;
      if (rol !== "todos" && n.rol !== rol) return false;
      if (estado !== "todos" && n.estado !== estado) return false;
      return true;
    });
  }, [rows, busqueda, eventos, dominio, rol, estado]);

  function toggleEvento(evento: string) {
    setEventos((prev) => {
      const next = new Set(prev);
      if (next.has(evento)) next.delete(evento);
      else next.add(evento);
      return next;
    });
  }

  function toggleEstado(n: NotificacionRow) {
    const nuevoEstado = n.estado === "Activa" ? "Inactiva" : "Activa";
    setRows((rs) => rs.map((r) => (r.id === n.id ? { ...r, estado: nuevoEstado } : r)));
    logAuditoria("activar/desactivar", `Notificación ${n.nombre} → ${nuevoEstado}`);
    toast.success(
      nuevoEstado === "Activa"
        ? `La notificación «${n.nombre}» fue activada`
        : `La notificación «${n.nombre}» fue desactivada`
    );
  }

  // Select full-size del panel de cabecera.
  function filtroSelect(value: string, onChange: (v: string) => void, options: string[]) {
    return (
      <Select value={value} onValueChange={onChange}>
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
  function headerSelect(
    value: string,
    onChange: (v: string) => void,
    options: string[],
    placeholder: string
  ) {
    return (
      <Select value={value === "todos" ? "" : value} onValueChange={(v) => onChange(v || "todos")}>
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

  // Multiselect de eventos: mode "panel" (botón outline) o "header" (borderless, como título).
  function eventoFilter(mode: "panel" | "header" = "panel") {
    const header = mode === "header";
    const label =
      eventos.size === 0
        ? header
          ? "Evento disparador"
          : "Ver todos"
        : eventos.size === 1
          ? [...eventos][0]
          : `${eventos.size} eventos`;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={header ? "ghost" : "outline"}
            size={header ? "sm" : undefined}
            className={cn(
              "w-full justify-between font-normal",
              header
                ? "gap-1 border-transparent bg-transparent px-0 text-xs font-medium text-muted-foreground uppercase shadow-none hover:bg-transparent"
                : "normal-case"
            )}
          >
            {label}
            <ChevronDown className="opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setEventos(new Set());
            }}
          >
            <Check className={cn("size-4", eventos.size > 0 && "invisible")} />
            Ver todos
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {EVENTOS.map((evento) => (
            <DropdownMenuItem
              key={evento}
              onSelect={(e) => {
                e.preventDefault();
                toggleEvento(evento);
              }}
            >
              <Check className={cn("size-4", !eventos.has(evento) && "invisible")} />
              {evento}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      {/* Filtros de cabecera (MAGIA-111), estilo Fenix (Central de Gestión). */}
      <FilterPanel
        onClear={() => {
          setBusqueda("");
          setEventos(new Set());
          setDominio("todos");
          setRol("todos");
          setEstado("todos");
        }}
      >
        <FilterField label="Buscar por nombre">
          <Input
            placeholder="Nombre de la notificación"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda.trim().length > 0 && busqueda.trim().length < 3 && (
            <p className="text-xs text-muted-foreground">
              Ingresá al menos 3 caracteres para buscar.
            </p>
          )}
        </FilterField>
        <FilterField label="Evento">{eventoFilter()}</FilterField>
        <FilterField label="Dominio">{filtroSelect(dominio, setDominio, DOMINIOS)}</FilterField>
        <FilterField label="Rol">{filtroSelect(rol, setRol, ROLES)}</FilterField>
        <FilterField label="Estado">
          {filtroSelect(estado, setEstado, ["Activa", "Inactiva"])}
        </FilterField>
      </FilterPanel>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
            {/* Filtro DENTRO del header (MAGIA-111), estilo Fenix / T. Innominada:
                el control es el propio título de la columna. Mismo estado que el panel. */}
            <tr>
              <th className="px-4 py-2 align-middle font-medium whitespace-nowrap">
                <Input
                  placeholder="Nombre"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className={cn(HEADER_INPUT_CLASS, "min-w-32")}
                />
              </th>
              <th className="px-4 py-2 align-middle font-medium whitespace-nowrap">
                {eventoFilter("header")}
              </th>
              <th className="px-4 py-2 align-middle font-medium whitespace-nowrap">
                {headerSelect(dominio, setDominio, DOMINIOS, "Dominio")}
              </th>
              <th className="px-4 py-2 align-middle font-medium whitespace-nowrap">
                {headerSelect(rol, setRol, ROLES, "Rol")}
              </th>
              <th className="px-4 py-2 align-middle font-medium whitespace-nowrap">Emails</th>
              <th className="px-4 py-2 align-middle font-medium whitespace-nowrap">Mensaje</th>
              <th className="px-4 py-2 align-middle font-medium whitespace-nowrap">
                {headerSelect(estado, setEstado, ["Activa", "Inactiva"], "Estado")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-muted-foreground">
                  Sin resultados para los filtros aplicados.
                </td>
              </tr>
            ) : (
              filtered.map((n) => (
                <tr key={n.id} className="border-t">
                  <td className="px-4 py-2.5 whitespace-nowrap">{n.nombre}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill text={n.evento} tone="blue" />
                  </td>
                  <td className="px-4 py-2.5 capitalize">{n.dominio}</td>
                  <td className="px-4 py-2.5 capitalize">{n.rol}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {/* MAGIA-37: solo las notificaciones de tipo Mail muestran destinatarios. */}
                    {n.tipo === "mail" ? n.emails.join(", ") : ""}
                  </td>
                  <td className="max-w-60 truncate px-4 py-2.5 text-muted-foreground" title={n.mensaje}>
                    {n.mensaje}
                  </td>
                  <td className="px-4 py-2.5">
                    {canToggle ? (
                      <div className="flex items-center gap-2">
                        <EstadoSwitch active={n.estado === "Activa"} onToggle={() => toggleEstado(n)} />
                        <span className="text-xs text-muted-foreground">{n.estado}</span>
                      </div>
                    ) : (
                      <StatusPill text={n.estado} tone={n.estado === "Activa" ? "green" : "gray"} />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <GridPager shown={filtered.length} total={rows.length} />
    </>
  );
}
