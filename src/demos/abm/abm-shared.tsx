import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, FilterX, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import egpData from "../../../mock-data/abm/egp.json";
import notificacionesData from "../../../mock-data/abm/notificaciones.json";
import proveedoresData from "../../../mock-data/abm/proveedores.json";

/* ---------------------------------- Tipos ---------------------------------- */

export type EnteTipo = "egp" | "proveedor";

export type EnteEstado =
  | "Pendiente de Autorización"
  | "Autorizado"
  | "Activo"
  | "Bloqueado"
  | "Rechazado";

/** Estado de las facturas del ente; define el escenario de borrado (MAGIA-44/45). */
export type FacturasEstado = "ninguna" | "pendientes" | "en-curso";

export type DatosBancarios = {
  cuentaCredito: string;
  banco: string;
  moneda: "PYG" | "USD";
  tipoDocumento: string;
  numeroDocumento: string;
  nombreApellido: string;
};

/** Fila de las grillas EGP y Proveedor (MAGIA-29). */
export type EnteRow = {
  id: string;
  ruc: string;
  razonSocial: string;
  email: string;
  telefono: string;
  clienteAtlas: boolean | null;
  estado: EnteEstado;
  facturas: FacturasEstado;
  // Solo EGP
  monedas?: string[];
  lineaCredito?: { currencyCode: "PYG" | "USD"; amount: number } | null;
  /** Derivado (no se persiste): AbmDemo lo calcula contando los Proveedores con este EGP como padre. */
  proveedoresAsociados?: number;
  // Solo Proveedor
  egpPadre?: string;
  datosBancarios?: DatosBancarios;
};

/** Fila de la grilla de Notificaciones (MAGIA-111/37). */
export type NotificacionRow = {
  id: string;
  nombre: string;
  evento: string;
  dominio: "banco" | "egp" | "proveedor";
  rol: string;
  tipo: "dominio-rol" | "mail";
  emails: string[];
  mensaje: string;
  estado: "Activa" | "Inactiva";
};

export const egpRows = egpData as EnteRow[];
export const proveedorRows = proveedoresData as EnteRow[];
export const notificacionRows = notificacionesData as NotificacionRow[];

/* -------------------------------- Permisos --------------------------------- */

export function enteResource(tipo: EnteTipo): string {
  return tipo === "egp" ? "ente-egp" : "ente-proveedor";
}

const ENTE_ACTION_SCOPES = [
  "visualizar",
  "cargar",
  "aprobar-alta",
  "modificar",
  "bloquear",
  "borrar",
];

/**
 * Regla de visibilidad de pestaña acordada con funcional: un rol ve la grilla
 * de una entidad si tiene visualizar:<entidad> o cualquier permiso de acción
 * sobre ella (el Maestro de Permisos no siempre otorga visualizar a quien acciona).
 */
export function canAccessEntity(permissions: Set<string>, resource: string): boolean {
  return ENTE_ACTION_SCOPES.some((scope) => permissions.has(`${scope}:${resource}`));
}

/** Botonera por fila según permisos del rol logueado (MAGIA-33/34). Ver siempre visible. */
export function enteActions(permissions: Set<string>, tipo: EnteTipo) {
  const resource = enteResource(tipo);
  return {
    ver: true,
    gestionar: permissions.has(`aprobar-alta:${resource}`),
    editar: permissions.has(`modificar:${resource}`),
    bloquear: permissions.has(`bloquear:${resource}`),
    borrar: permissions.has(`borrar:${resource}`),
  };
}

/* -------------------------------- Formatos --------------------------------- */

const nf = new Intl.NumberFormat("es-PY");

/** MAGIA-29: sin centavos; PYG → "10.000.000 Gs." / USD → "10.000 USD". Vacío si la API no devolvió dato. */
export function formatLineaCredito(lc: EnteRow["lineaCredito"]): string {
  if (!lc) return "";
  return lc.currencyCode === "PYG" ? `${nf.format(lc.amount)} Gs.` : `${nf.format(lc.amount)} USD`;
}

/** Mock del "registro de auditoría" que piden todas las historias. */
export function logAuditoria(operacion: string, detalle: string) {
  console.info(`[auditoría mock] ${operacion}: ${detalle}`);
}

/* ----------------------- Validaciones compartidas (MAGIA-38/39) ----------------------- */

export const RUC_MAX = 12;
export const EMAIL_MAX = 1000;
export const TELEFONO_MAX = 25;
/** Prefijos telefónicos permitidos según las HUs de alta (MAGIA-38/39). */
export const TELEFONO_PREFIJOS = ["+59598", "+59597", "+59599", "+59596", "+59521"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** La HU solo pide "validación de formato" + máx. 12: números con dígito verificador opcional. */
export function rucValido(ruc: string): boolean {
  return ruc.length <= RUC_MAX && /^\d{3,11}(-\d)?$/.test(ruc);
}

export function emailValido(email: string): boolean {
  return email.length <= EMAIL_MAX && EMAIL_RE.test(email);
}

export function telefonoValido(telefono: string): boolean {
  return telefono.length <= TELEFONO_MAX && TELEFONO_PREFIJOS.some((p) => telefono.startsWith(p));
}

/* ------------------------------- UI compartida ----------------------------- */

export const PILL_TONES = {
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  blue: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  gray: "bg-muted text-muted-foreground",
};

export function StatusPill({ text, tone }: { text: string; tone: keyof typeof PILL_TONES }) {
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

export function enteEstadoTone(estado: EnteEstado): keyof typeof PILL_TONES {
  switch (estado) {
    case "Activo":
      return "green";
    case "Autorizado":
      return "blue";
    case "Pendiente de Autorización":
      return "amber";
    case "Bloqueado":
    case "Rechazado":
      return "red";
  }
}

export function RowIconButton({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className
      )}
    >
      <Icon className="size-4" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

/**
 * Panel de filtros de cabecera estilo Fenix (Central de Gestión › Evaluación in-app):
 * recuadro con los campos en grilla + botón "Limpiar filtros". Cada campo va en un
 * FilterField (label arriba del control). El botón Limpiar es la última celda de la grilla.
 */
export function FilterPanel({
  children,
  onClear,
}: {
  children: ReactNode;
  onClear: () => void;
}) {
  return (
    <div className="border-b p-4">
      <div className="grid grid-cols-1 items-end gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
        {children}
        <div className="flex items-end">
          {/* Rojo sólido para igualar el "Limpiar filtros" de Fenix (Central de Gestión). */}
          <Button
            className="w-full bg-destructive text-white hover:bg-destructive/90"
            onClick={onClear}
          >
            <FilterX className="size-4" />
            Limpiar filtros
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Clases para controles que viven DENTRO del header de una columna (estilo Fenix /
 * T. Innominada): borderless, sin sombra, se ven como el propio título de la columna.
 */
export const HEADER_INPUT_CLASS =
  "h-7 border-transparent bg-transparent px-0 text-xs font-medium normal-case shadow-none placeholder:text-muted-foreground focus-visible:ring-0 dark:bg-transparent";
export const HEADER_SELECT_CLASS =
  "w-full gap-1 border-transparent bg-transparent px-0 text-xs font-medium text-muted-foreground uppercase shadow-none focus-visible:ring-0 data-placeholder:text-muted-foreground dark:bg-transparent dark:hover:bg-transparent";

/** Campo del FilterPanel: label + control (Input/Select) apilados. */
export function FilterField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/** Paginador decorativo: los mocks entran en una sola página de 25. */
export function GridPager({ shown, total }: { shown: number; total: number }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t px-4 py-3 text-xs text-muted-foreground">
      <span>
        Mostrando {shown} de {total} registros · 25 por página
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
  );
}
