import { useState, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  type DatosBancarios,
  type EnteRow,
  type EnteTipo,
} from "./abm-shared";

/* ------------------------- Confirmación / warning genérico ------------------------- */

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = "Confirmar",
  destructive = false,
  warningOnly = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  /** Cartel informativo sin acción: un solo botón "Entendido" (escenarios de borrado no permitido). */
  warningOnly?: boolean;
  onConfirm?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {warningOnly && <TriangleAlert className="size-5 text-amber-500" />}
            {title}
          </DialogTitle>
          <DialogDescription className="pt-1 text-sm leading-relaxed">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {warningOnly ? (
            <Button onClick={() => onOpenChange(false)}>Entendido</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                variant={destructive ? "destructive" : "default"}
                onClick={() => {
                  onConfirm?.();
                  onOpenChange(false);
                }}
              >
                {confirmLabel}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------- Formulario Ver / Editar ente (MAGIA-40/41) ----------------------- */

type EnteFormValues = {
  ruc: string;
  razonSocial: string;
  email: string;
  telefono: string;
  datosBancarios: DatosBancarios;
};

const DATOS_BANCARIOS_VACIOS: DatosBancarios = {
  cuentaCredito: "",
  banco: "",
  moneda: "PYG",
  tipoDocumento: "",
  numeroDocumento: "",
  nombreApellido: "",
};

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

/**
 * Modal de Ver detalle / Edición de EGP y Proveedor.
 * - mode "ver": todos los campos bloqueados, sin Guardar.
 * - Proveedor NO cliente Atlas: campos extra de datos bancarios (MAGIA-41 esc. 2).
 * - Proveedor Rechazado: etiqueta en cabecera + botón "Confirmar y Autorizar" (MAGIA-202 esc. 2).
 */
export function EnteFormModal({
  open,
  onOpenChange,
  tipo,
  ente,
  mode,
  otherRucs,
  onSave,
  onAutorizarRechazado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: EnteTipo;
  ente: EnteRow;
  mode: "ver" | "editar";
  /** RUC del resto de las filas, para simular el error de RUC duplicado. */
  otherRucs: string[];
  onSave: (patch: Partial<EnteRow>) => void;
  onAutorizarRechazado?: (patch: Partial<EnteRow>, sinCambios: boolean) => void;
}) {
  const tipoLabel = tipo === "egp" ? "EGP" : "Proveedor";
  const readOnly = mode === "ver";
  const esRechazado = mode === "editar" && ente.estado === "Rechazado";
  // MAGIA-41 esc. 2: los datos bancarios solo se editan si el proveedor NO es cliente Atlas.
  const conDatosBancarios = tipo === "proveedor" && ente.clienteAtlas === false;

  const [values, setValues] = useState<EnteFormValues>({
    ruc: ente.ruc,
    razonSocial: ente.razonSocial,
    email: ente.email,
    telefono: ente.telefono,
    datosBancarios: ente.datosBancarios ?? DATOS_BANCARIOS_VACIOS,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(key: keyof Omit<EnteFormValues, "datosBancarios">, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setBancario<K extends keyof DatosBancarios>(key: K, value: DatosBancarios[K]) {
    setValues((v) => ({ ...v, datosBancarios: { ...v.datosBancarios, [key]: value } }));
  }

  function hayCambios(): boolean {
    return (
      values.ruc !== ente.ruc ||
      values.razonSocial !== ente.razonSocial ||
      values.email !== ente.email ||
      values.telefono !== ente.telefono ||
      (conDatosBancarios &&
        JSON.stringify(values.datosBancarios) !==
          JSON.stringify(ente.datosBancarios ?? DATOS_BANCARIOS_VACIOS))
    );
  }

  /** MAGIA-40/41: obligatorios vacíos en rojo + error de RUC duplicado. Devuelve null si hay errores. */
  function validate(): Partial<EnteRow> | null {
    const next: Record<string, string> = {};
    if (!values.ruc.trim()) next.ruc = "Campo obligatorio";
    if (!values.razonSocial.trim()) next.razonSocial = "Campo obligatorio";
    if (!values.email.trim()) next.email = "Campo obligatorio";
    if (!values.telefono.trim()) next.telefono = "Campo obligatorio";
    if (conDatosBancarios) {
      if (!values.datosBancarios.cuentaCredito.trim()) next.cuentaCredito = "Campo obligatorio";
      if (!values.datosBancarios.banco.trim()) next.banco = "Campo obligatorio";
      if (!values.datosBancarios.tipoDocumento.trim()) next.tipoDocumento = "Campo obligatorio";
      if (!values.datosBancarios.numeroDocumento.trim()) next.numeroDocumento = "Campo obligatorio";
      if (!values.datosBancarios.nombreApellido.trim()) next.nombreApellido = "Campo obligatorio";
    }
    if (!next.ruc && otherRucs.includes(values.ruc.trim())) {
      next.ruc = `RUC ya registrado para otro ${tipoLabel.toUpperCase()}`;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return null;

    return {
      ruc: values.ruc.trim(),
      razonSocial: values.razonSocial.trim(),
      email: values.email.trim(),
      telefono: values.telefono.trim(),
      ...(conDatosBancarios ? { datosBancarios: values.datosBancarios } : {}),
    };
  }

  function handleGuardar() {
    // MAGIA-40 esc. 1: sin cambios y confirma → solo se cierra el modal.
    if (!hayCambios()) {
      onOpenChange(false);
      return;
    }
    const patch = validate();
    if (!patch) return;
    onSave(patch);
    onOpenChange(false);
  }

  function handleConfirmarYAutorizar() {
    const patch = validate();
    if (!patch) return;
    onAutorizarRechazado?.(patch, !hayCambios());
    onOpenChange(false);
  }

  const inputError = "border-red-500 focus-visible:ring-red-500/30";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "ver" ? `Detalle de ${tipoLabel}` : `Editar ${tipoLabel}`}
            {esRechazado && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
                Ente Rechazado
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "ver"
              ? "Información del ente. Solo lectura."
              : "Los campos de solo visualización permanecen bloqueados."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo de Ente">
            <Input value={tipoLabel} disabled />
          </Field>
          {tipo === "proveedor" && (
            <Field label="EGP Padre">
              <Input value={ente.egpPadre ?? ""} disabled />
            </Field>
          )}
          <Field label="RUC" error={errors.ruc}>
            <Input
              value={values.ruc}
              disabled={readOnly}
              onChange={(e) => set("ruc", e.target.value)}
              className={cn(errors.ruc && inputError)}
            />
          </Field>
          <Field label="Razón Social" error={errors.razonSocial}>
            <Input
              value={values.razonSocial}
              disabled={readOnly}
              onChange={(e) => set("razonSocial", e.target.value)}
              className={cn(errors.razonSocial && inputError)}
            />
          </Field>
          <Field label="Email de Contacto" error={errors.email}>
            <Input
              value={values.email}
              disabled={readOnly}
              onChange={(e) => set("email", e.target.value)}
              className={cn(errors.email && inputError)}
            />
          </Field>
          <Field label="Teléfono" error={errors.telefono}>
            <Input
              value={values.telefono}
              disabled={readOnly}
              onChange={(e) => set("telefono", e.target.value)}
              className={cn(errors.telefono && inputError)}
            />
          </Field>
        </div>

        {conDatosBancarios && (
          <div className="rounded-lg border p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground uppercase">
              Datos bancarios (no cliente Atlas)
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cuenta crédito" error={errors.cuentaCredito}>
                <Input
                  value={values.datosBancarios.cuentaCredito}
                  disabled={readOnly}
                  onChange={(e) => setBancario("cuentaCredito", e.target.value)}
                  className={cn(errors.cuentaCredito && inputError)}
                />
              </Field>
              <Field label="Banco" error={errors.banco}>
                <Input
                  value={values.datosBancarios.banco}
                  disabled={readOnly}
                  onChange={(e) => setBancario("banco", e.target.value)}
                  className={cn(errors.banco && inputError)}
                />
              </Field>
              <Field label="Moneda">
                <div className="flex items-center gap-4 py-1.5">
                  {(["PYG", "USD"] as const).map((m) => (
                    <label key={m} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="radio"
                        name="moneda"
                        checked={values.datosBancarios.moneda === m}
                        disabled={readOnly}
                        onChange={() => setBancario("moneda", m)}
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Tipo de documento" error={errors.tipoDocumento}>
                <Input
                  value={values.datosBancarios.tipoDocumento}
                  disabled={readOnly}
                  onChange={(e) => setBancario("tipoDocumento", e.target.value)}
                  className={cn(errors.tipoDocumento && inputError)}
                />
              </Field>
              <Field label="Número de documento" error={errors.numeroDocumento}>
                <Input
                  value={values.datosBancarios.numeroDocumento}
                  disabled={readOnly}
                  onChange={(e) => setBancario("numeroDocumento", e.target.value)}
                  className={cn(errors.numeroDocumento && inputError)}
                />
              </Field>
              <Field label="Nombre y Apellido" error={errors.nombreApellido}>
                <Input
                  value={values.datosBancarios.nombreApellido}
                  disabled={readOnly}
                  onChange={(e) => setBancario("nombreApellido", e.target.value)}
                  className={cn(errors.nombreApellido && inputError)}
                />
              </Field>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "Cerrar" : "Cancelar"}
          </Button>
          {!readOnly &&
            (esRechazado ? (
              <Button onClick={handleConfirmarYAutorizar}>Confirmar y Autorizar</Button>
            ) : (
              <Button onClick={handleGuardar}>Guardar</Button>
            ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------- Gestionar: autorizar / rechazar alta (MAGIA-202) --------------------- */

export function GestionarModal({
  open,
  onOpenChange,
  ente,
  tipo,
  onAutorizar,
  onRechazar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ente: EnteRow;
  tipo: EnteTipo;
  onAutorizar: () => void;
  onRechazar: (motivo: string) => void;
}) {
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState(false);

  function handleRechazar() {
    if (!rechazando) {
      setRechazando(true);
      return;
    }
    if (!motivo.trim()) {
      setMotivoError(true);
      return;
    }
    onRechazar(motivo.trim());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gestionar alta pendiente</DialogTitle>
          <DialogDescription>
            Autorizá o rechazá el alta del ente en estado Pendiente de Autorización.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border p-4 text-sm">
          <dt className="text-muted-foreground">RUC</dt>
          <dd>{ente.ruc}</dd>
          <dt className="text-muted-foreground">Razón Social</dt>
          <dd>{ente.razonSocial}</dd>
          <dt className="text-muted-foreground">Tipo de Ente</dt>
          <dd>{tipo === "egp" ? "EGP" : "Proveedor"}</dd>
        </dl>

        {rechazando && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Motivo del rechazo</Label>
            <textarea
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setMotivoError(false);
              }}
              rows={3}
              placeholder="Ingresá el motivo del rechazo"
              className={cn(
                "rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                motivoError && "border-red-500 focus-visible:ring-red-500/30"
              )}
            />
            {motivoError && (
              <p className="text-xs text-red-600 dark:text-red-400">Campo obligatorio</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleRechazar}>
            {rechazando ? "Confirmar rechazo" : "Rechazar"}
          </Button>
          {!rechazando && (
            <Button
              onClick={() => {
                onAutorizar();
                onOpenChange(false);
              }}
            >
              Autorizar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
