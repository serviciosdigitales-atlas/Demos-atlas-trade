import { useMemo, useState } from "react";
import { Check, Eye, FolderCheck, Lock, LockOpen, Pencil, X } from "lucide-react";
import { toast } from "sonner";

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
  RowIconButton,
  StatusPill,
  enteActions,
  enteEstadoTone,
  formatLineaCredito,
  logAuditoria,
  type EnteRow,
  type EnteTipo,
} from "./abm-shared";
import { ConfirmDialog, EnteFormModal, GestionarModal } from "./ente-modals";

const ESTADO_OPTIONS = [
  "Pendiente de Autorización",
  "Autorizado",
  "Activo",
  "Bloqueado",
  "Rechazado",
];

const COLUMNS: Record<EnteTipo, string[]> = {
  egp: ["RUC", "Razón Social", "Email", "Monedas", "Línea de crédito", "Cliente Atlas", "Estado", "Acciones"],
  proveedor: ["RUC", "Razón Social", "EGP", "Email", "Cliente Atlas", "Estado", "Acciones"],
};

type ModalState =
  | { kind: "ver" | "editar" | "gestionar"; ente: EnteRow }
  | {
      kind: "confirm";
      ente: EnteRow;
      title: string;
      message: string;
      confirmLabel?: string;
      destructive?: boolean;
      warningOnly?: boolean;
      onConfirm?: () => void;
    }
  | null;

/** MAGIA-29: tilde verde cliente Atlas / gris no cliente / vacío sin dato de API. */
function ClienteAtlasCheck({ value }: { value: boolean | null }) {
  if (value === null) return null;
  return (
    <Check
      className={value ? "size-4 text-emerald-600" : "size-4 text-muted-foreground/50"}
      aria-label={value ? "Cliente Atlas" : "No cliente Atlas"}
    />
  );
}

/**
 * Grilla compartida de EGP y Proveedor (MAGIA-29) con filtros de búsqueda,
 * botonera por permisos (MAGIA-33/34) y modales de acción (MAGIA-40..45/202).
 * Las filas viven en AbmDemo (MAGIA-38/39): así el alta desde el botón "+"
 * entra a la grilla y la relación Proveedor→EGP actualiza ambas pestañas.
 */
export function EntesGrid({
  tipo,
  permissions,
  rows,
  onRowsChange,
  scopeNote,
}: {
  tipo: EnteTipo;
  permissions: Set<string>;
  rows: EnteRow[];
  onRowsChange: (updater: (rows: EnteRow[]) => EnteRow[]) => void;
  /** Nota "control fino simulado" (relación EGP↔Proveedor): qué filas ve este dominio. */
  scopeNote?: string;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [clienteAtlas, setClienteAtlas] = useState("ambos");
  const [estado, setEstado] = useState("todos");
  const [modal, setModal] = useState<ModalState>(null);

  const actions = enteActions(permissions, tipo);
  const enteLabel = tipo === "egp" ? "EGP" : "Proveedor";
  const columns = COLUMNS[tipo];

  const filtered = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return rows.filter((r) => {
      // MAGIA-29: la búsqueda solo se ejecuta con 3+ caracteres, sobre RUC y Razón Social.
      if (q.length >= 3 && !r.ruc.includes(q) && !r.razonSocial.toLowerCase().includes(q)) {
        return false;
      }
      if (clienteAtlas === "si" && r.clienteAtlas !== true) return false;
      if (clienteAtlas === "no" && r.clienteAtlas !== false) return false;
      if (estado !== "todos" && r.estado !== estado) return false;
      return true;
    });
  }, [rows, busqueda, clienteAtlas, estado]);

  function updateEnte(id: string, patch: Partial<EnteRow>) {
    onRowsChange((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  /* ----------------------------- Bloquear / Desbloquear (MAGIA-42/43) ----------------------------- */

  function abrirBloqueo(ente: EnteRow) {
    const bloqueado = ente.estado === "Bloqueado";
    setModal({
      kind: "confirm",
      ente,
      title: bloqueado ? `Desbloquear ${enteLabel}` : `Bloquear ${enteLabel}`,
      message: bloqueado
        ? `¿Confirma desbloquear el ente ${ente.razonSocial}? Volverá a poder operar con normalidad.`
        : `¿Confirma bloquear el ente ${ente.razonSocial}? No podrá ejecutar acciones en la plataforma hasta ser desbloqueado.`,
      confirmLabel: bloqueado ? "Desbloquear" : "Bloquear",
      destructive: !bloqueado,
      onConfirm: () => {
        updateEnte(ente.id, { estado: bloqueado ? "Activo" : "Bloqueado" });
        logAuditoria(bloqueado ? "desbloquear" : "bloquear", `${enteLabel} ${ente.razonSocial}`);
        toast.success(
          bloqueado
            ? `El ente ${ente.razonSocial} fue desbloqueado correctamente`
            : `El ente ${ente.razonSocial} fue bloqueado correctamente`
        );
      },
    });
  }

  /* ---------------------------------- Borrar (MAGIA-44/45) ---------------------------------- */

  function abrirBorrado(ente: EnteRow) {
    const base = { kind: "confirm" as const, ente, title: `Eliminar ${enteLabel}` };

    // Facturas en curso/finalizadas: el borrado no está permitido (EGP y Proveedor).
    if (ente.facturas === "en-curso") {
      setModal({
        ...base,
        warningOnly: true,
        message: `No es posible eliminar a ${ente.razonSocial} debido a que tiene simulaciones de adelanto en curso o finalizadas. Puede optar por bloquear el ${enteLabel} para futuras operaciones.`,
      });
      return;
    }

    // Solo EGP: con proveedores asociados tampoco se puede borrar.
    if (tipo === "egp" && (ente.proveedoresAsociados ?? 0) > 0) {
      setModal({
        ...base,
        warningOnly: true,
        message: `No es posible eliminar a ${ente.razonSocial} debido a que tiene proveedores asociados. Primero desasocie al Proveedor asignando un nuevo EGP o bien elimine al Proveedor y luego vuelva a intentar.`,
      });
      return;
    }

    const conFacturasPendientes = ente.facturas === "pendientes";
    const message =
      tipo === "egp"
        ? conFacturasPendientes
          ? `¿Desea eliminar al ente ${ente.razonSocial}? Este ente posee usuarios asociados y facturas pendientes las cuales también serán eliminadas. Esta acción no tiene marcha atrás.`
          : `¿Desea eliminar al EGP ${ente.razonSocial}? Esta acción eliminará los usuarios que el EGP tenga cargados y no tiene marcha atrás.`
        : conFacturasPendientes
          ? `¿Desea eliminar al Proveedor ${ente.razonSocial}? Este ente posee facturas pendientes las cuales también serán eliminadas. Esta acción no tiene marcha atrás.`
          : `¿Desea eliminar al Proveedor ${ente.razonSocial}? Esta acción eliminará los usuarios que el proveedor tenga cargados y no tiene marcha atrás.`;

    setModal({
      ...base,
      message,
      confirmLabel: "Eliminar",
      destructive: true,
      onConfirm: () => {
        onRowsChange((rs) => rs.filter((r) => r.id !== ente.id));
        logAuditoria("borrar", `${enteLabel} ${ente.razonSocial}`);
        toast.success(
          conFacturasPendientes
            ? `El ente ${ente.razonSocial}, sus usuarios y sus facturas asociadas, fueron eliminados correctamente`
            : `El ente ${ente.razonSocial} fue eliminado correctamente`
        );
      },
    });
  }

  /* ------------------------------------------------------------------------------------------ */

  return (
    <>
      {/* Nota para quien presenta la demo: simula el control fino del back-end. */}
      {scopeNote && (
        <p className="border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            Control fino simulado (sin backend):
          </span>{" "}
          {scopeNote}
        </p>
      )}

      {/* Filtros de cabecera (MAGIA-29), estilo Fenix (Central de Gestión). */}
      <FilterPanel
        onClear={() => {
          setBusqueda("");
          setClienteAtlas("ambos");
          setEstado("todos");
        }}
      >
        <FilterField label="Buscar">
          <Input
            placeholder="RUC o razón social"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda.trim().length > 0 && busqueda.trim().length < 3 && (
            <p className="text-xs text-muted-foreground">
              Ingresá al menos 3 caracteres para buscar.
            </p>
          )}
        </FilterField>
        <FilterField label="Cliente Atlas">
          <Select value={clienteAtlas} onValueChange={setClienteAtlas}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ambos">Ambos</SelectItem>
              <SelectItem value="si">Sí</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Estado">
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {ESTADO_OPTIONS.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </FilterPanel>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
            {/* Filtro DENTRO del header (MAGIA-29), estilo Fenix / T. Innominada:
                el control es el propio título de la columna. Mismo estado que el panel. */}
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-4 py-2 align-middle font-medium whitespace-nowrap">
                  {col === "RUC" ? (
                    <Input
                      placeholder="RUC o razón social"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className={cn(HEADER_INPUT_CLASS, "min-w-40")}
                    />
                  ) : col === "Cliente Atlas" ? (
                    <Select
                      value={clienteAtlas === "ambos" ? "" : clienteAtlas}
                      onValueChange={(v) => setClienteAtlas(v || "ambos")}
                    >
                      <SelectTrigger size="sm" className={HEADER_SELECT_CLASS}>
                        <SelectValue placeholder="Cliente Atlas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ambos">Ambos</SelectItem>
                        <SelectItem value="si">Sí</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : col === "Estado" ? (
                    <Select
                      value={estado === "todos" ? "" : estado}
                      onValueChange={(v) => setEstado(v || "todos")}
                    >
                      <SelectTrigger size="sm" className={HEADER_SELECT_CLASS}>
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {ESTADO_OPTIONS.map((e) => (
                          <SelectItem key={e} value={e}>
                            {e}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    col
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Sin resultados para los filtros aplicados.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-2.5 whitespace-nowrap">{row.ruc}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{row.razonSocial}</td>
                  {tipo === "proveedor" && (
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {row.egpPadre}
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-muted-foreground">{row.email}</td>
                  {tipo === "egp" && (
                    <>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {(row.monedas ?? []).join(", ")}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {formatLineaCredito(row.lineaCredito)}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-2.5">
                    <ClienteAtlasCheck value={row.clienteAtlas} />
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill text={row.estado} tone={enteEstadoTone(row.estado)} />
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-0.5">
                      <RowIconButton
                        icon={Eye}
                        label="Ver detalle"
                        onClick={() => setModal({ kind: "ver", ente: row })}
                      />
                      {actions.gestionar && row.estado === "Pendiente de Autorización" && (
                        <RowIconButton
                          icon={FolderCheck}
                          label="Gestionar"
                          onClick={() => setModal({ kind: "gestionar", ente: row })}
                        />
                      )}
                      {actions.editar && (
                        <RowIconButton
                          icon={Pencil}
                          label="Editar"
                          onClick={() => setModal({ kind: "editar", ente: row })}
                        />
                      )}
                      {actions.bloquear &&
                        (row.estado === "Bloqueado" ? (
                          <RowIconButton
                            icon={LockOpen}
                            label="Desbloquear"
                            onClick={() => abrirBloqueo(row)}
                            className="text-emerald-600 hover:text-emerald-700"
                          />
                        ) : (
                          <RowIconButton
                            icon={Lock}
                            label="Bloquear"
                            onClick={() => abrirBloqueo(row)}
                            className="text-red-500 hover:text-red-600"
                          />
                        ))}
                      {actions.borrar && (
                        <RowIconButton icon={X} label="Borrar" onClick={() => abrirBorrado(row)} />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <GridPager shown={filtered.length} total={rows.length} />

      {/* Ver / Editar (MAGIA-40/41) + Confirmar y Autorizar de rechazados (MAGIA-202) */}
      {(modal?.kind === "ver" || modal?.kind === "editar") && (
        <EnteFormModal
          key={`${modal.kind}-${modal.ente.id}`}
          open
          onOpenChange={(open) => !open && setModal(null)}
          tipo={tipo}
          ente={modal.ente}
          mode={modal.kind}
          otherRucs={rows.filter((r) => r.id !== modal.ente.id).map((r) => r.ruc)}
          onSave={(patch) => {
            updateEnte(modal.ente.id, patch);
            logAuditoria("modificar", `${enteLabel} ${modal.ente.razonSocial}`);
            toast.success(
              `El ${patch.razonSocial ?? modal.ente.razonSocial} fue actualizado exitosamente`
            );
          }}
          onAutorizarRechazado={(patch, sinCambios) => {
            if (sinCambios) {
              toast.warning(
                "Se autoriza la activación del ente, con la misma información provista anteriormente"
              );
            }
            updateEnte(modal.ente.id, { ...patch, estado: "Autorizado" });
            logAuditoria("autorizar-rechazado", `${enteLabel} ${modal.ente.razonSocial}`);
            toast.success(
              `El ${patch.razonSocial ?? modal.ente.razonSocial} fue registrado exitosamente`
            );
          }}
        />
      )}

      {/* Gestionar: autorizar / rechazar alta pendiente (MAGIA-202) */}
      {modal?.kind === "gestionar" && (
        <GestionarModal
          key={modal.ente.id}
          open
          onOpenChange={(open) => !open && setModal(null)}
          ente={modal.ente}
          tipo={tipo}
          onAutorizar={() => {
            updateEnte(modal.ente.id, { estado: "Autorizado" });
            logAuditoria("autorizar-alta", `${enteLabel} ${modal.ente.razonSocial}`);
            toast.success(`El ${modal.ente.razonSocial} fue registrado exitosamente`);
          }}
          onRechazar={(motivo) => {
            updateEnte(modal.ente.id, { estado: "Rechazado" });
            logAuditoria("rechazar-alta", `${enteLabel} ${modal.ente.razonSocial} — ${motivo}`);
            toast.success(`El ${modal.ente.razonSocial} fue rechazado exitosamente`);
          }}
        />
      )}

      {/* Bloqueo / desbloqueo y borrado (MAGIA-42/43/44/45) */}
      {modal?.kind === "confirm" && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setModal(null)}
          title={modal.title}
          message={modal.message}
          confirmLabel={modal.confirmLabel}
          destructive={modal.destructive}
          warningOnly={modal.warningOnly}
          onConfirm={modal.onConfirm}
        />
      )}
    </>
  );
}
