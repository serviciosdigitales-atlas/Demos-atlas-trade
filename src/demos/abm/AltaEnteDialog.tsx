import { useRef, useState } from "react";
import { AlertTriangle, FileText, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ADJUNTO_ERROR,
  adjuntoValido,
  emailValido,
  RUC_MAX,
  rucValido,
  TELEFONO_PREFIJOS,
  telefonoValido,
  type EnteRow,
  type EnteTipo,
} from "./abm-shared";
import { Field } from "./ente-modals";

/* --------------------------- Mock del servicio CORE (MAGIA-38) --------------------------- */

/**
 * La EGP debe existir en CORE como cliente del banco (comentario funcional MAGIA-38):
 * al ingresar el RUC se autocompletan los demás datos. RUC que no figure acá →
 * "no activa como cliente del banco". Datos financieros quedan para otra historia.
 */
const CORE_EGP: Record<string, { razonSocial: string; email?: string; telefono?: string }> = {
  "80099888-7": {
    razonSocial: "Comercial Asunción S.A.",
    email: "contacto@comercialasu.com.py",
    telefono: "+59521555780",
  },
  "80088777-6": {
    razonSocial: "Ganadera del Chaco S.A.",
    email: "administracion@ganaderachaco.com.py",
    telefono: "+59598111222",
  },
  "80077666-5": { razonSocial: "Textil Guaraní S.R.L." },
};

/** RUCs de prueba para mostrar el flujo en la demo. */
export const ALTA_ENTE_SEEDS = {
  egpEnCore: Object.keys(CORE_EGP),
};

/* ------------------------------- Modal de alta (MAGIA-38/39) ------------------------------ */

type Banner = { type: "err" | "warn" | "info"; text: string } | null;

/**
 * Alta de EGP (MAGIA-38) y de Proveedor (MAGIA-39).
 * - EGP: RUC contra CORE mock (autocompleta Razón Social) + error de RUC duplicado.
 * - Proveedor: EGP Padre obligatorio; RUC ya registrado → se reutilizan los datos generales
 *   (comportamiento vigente de la HU, reemplaza al error tachado de duplicado).
 */
export function AltaEnteDialog({
  tipo,
  existingRows,
  egpOptions,
  onClose,
  onSave,
}: {
  tipo: EnteTipo;
  /** Filas actuales de la grilla del tipo: duplicados (EGP) o precarga (Proveedor). */
  existingRows: EnteRow[];
  /** Razones sociales de EGPs vigentes no bloqueados, para el combo EGP Padre. */
  egpOptions: string[];
  onClose: () => void;
  onSave: (row: EnteRow) => void;
}) {
  const esEgp = tipo === "egp";
  const tipoLabel = esEgp ? "EGP" : "Proveedor";

  const [ruc, setRuc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [egpPadre, setEgpPadre] = useState("");
  const [adjuntos, setAdjuntos] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<Banner>(null);
  // Proveedor ya registrado: datos generales recuperados, solo se asocia el nuevo EGP.
  const [reutilizado, setReutilizado] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const clearError = (key: string) =>
    setErrors((e) => {
      const { [key]: _omit, ...rest } = e;
      return rest;
    });

  /** Al cambiar el RUC se descarta lo autocompletado (CORE o proveedor existente). */
  function handleRucChange(value: string) {
    setRuc(value);
    clearError("ruc");
    setBanner(null);
    if (esEgp || reutilizado) {
      setRazonSocial("");
      setEmail("");
      setTelefono("");
      setReutilizado(false);
    }
  }

  /** Lookup al salir del campo RUC: CORE (EGP) o registros existentes (Proveedor). */
  function handleRucBlur() {
    const value = ruc.trim();
    if (!value || !rucValido(value)) return;

    if (esEgp) {
      if (existingRows.some((r) => r.ruc === value)) {
        setErrors((e) => ({ ...e, ruc: "RUC ya registrado para otro EGP" }));
        return;
      }
      const core = CORE_EGP[value];
      if (!core) {
        setBanner({
          type: "warn",
          text: "La EGP no se encuentra activa como cliente del banco. Debe gestionarse el alta como cliente antes de darla de alta en la plataforma.",
        });
        return;
      }
      setRazonSocial(core.razonSocial);
      setEmail(core.email ?? "");
      setTelefono(core.telefono ?? "");
      setBanner({
        type: "info",
        text: `EGP encontrada en CORE: se autocompletaron los datos de ${core.razonSocial}.`,
      });
      return;
    }

    // Proveedor: si ya existe se recuperan los datos generales (HU actualizada, sin error).
    const existente = existingRows.find((r) => r.ruc === value);
    if (existente) {
      setRazonSocial(existente.razonSocial);
      setEmail(existente.email);
      setTelefono(existente.telefono);
      setReutilizado(true);
      setBanner({
        type: "info",
        text: `Proveedor ya registrado (${existente.razonSocial}): se recuperan sus datos generales y solo se asocia el nuevo EGP.`,
      });
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    const rucTrim = ruc.trim();

    if (!esEgp && !egpPadre) e.egpPadre = "Campo obligatorio";
    if (!rucTrim) e.ruc = "Campo obligatorio";
    else if (!rucValido(rucTrim)) e.ruc = `Formato de RUC inválido (solo números, máx. ${RUC_MAX} caracteres)`;
    else if (esEgp && existingRows.some((r) => r.ruc === rucTrim)) {
      e.ruc = "RUC ya registrado para otro EGP";
    }
    if (!razonSocial.trim()) {
      e.razonSocial = esEgp ? "Ingresá un RUC activo en CORE para autocompletar" : "Campo obligatorio";
    }
    // Email y teléfono opcionales, pero con formato válido si se completan.
    // Los datos recuperados de un proveedor existente no se re-validan (vienen bloqueados).
    if (!reutilizado) {
      if (email.trim() && !emailValido(email.trim())) e.email = "Formato de email inválido";
      if (telefono.trim() && !telefonoValido(telefono.trim())) {
        e.telefono = `Prefijos permitidos: ${TELEFONO_PREFIJOS.join(", ")}`;
      }
    }

    setErrors(e);
    if (Object.keys(e).length > 0) {
      setBanner({ type: "err", text: "Revisá los campos resaltados en rojo." });
      return false;
    }
    return true;
  }

  function handleGuardar() {
    setBanner(null);
    if (!validate()) return;
    onSave({
      id: `${tipo}-alta-${ruc.trim()}`,
      ruc: ruc.trim(),
      razonSocial: razonSocial.trim(),
      email: email.trim(),
      telefono: telefono.trim(),
      // EGP viene de CORE (cliente del banco); Proveedor sin dato de API todavía.
      clienteAtlas: esEgp ? true : null,
      // El alta de EGP es directa (no hay acción de aprobación: por eso no existe
      // aprobar-alta:ente-egp). El Proveedor sí queda pendiente hasta que lo
      // apruebe el supervisor-egp (aprobar-alta:ente-proveedor).
      estado: esEgp ? "Activo" : "Pendiente de Autorización",
      facturas: "ninguna",
      // Datos financieros (monedas / línea de crédito) llegan con la historia de obtenerDatosEnte.
      ...(esEgp ? { monedas: [], lineaCredito: null, proveedoresAsociados: 0 } : { egpPadre }),
    });
  }

  function handleAdjunto(file: File) {
    if (!adjuntoValido(file)) {
      toast.error(ADJUNTO_ERROR);
      return;
    }
    setAdjuntos((a) => [...a, file.name]);
  }

  const inputError = "border-red-500 focus-visible:ring-red-500/30";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alta de {tipoLabel}</DialogTitle>
          <DialogDescription>
            {esEgp
              ? "Ingresá el RUC: los demás datos se obtienen del servicio CORE."
              : "El proveedor queda asociado al EGP Padre seleccionado."}
          </DialogDescription>
        </DialogHeader>

        {banner && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm",
              banner.type === "err" && "border-destructive/30 bg-destructive/10 text-destructive",
              banner.type === "warn" &&
                "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
              banner.type === "info" &&
                "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300"
            )}
          >
            <AlertTriangle className="size-4 shrink-0" />
            {banner.text}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo de Ente">
            <Input value={tipoLabel} disabled />
          </Field>

          {/* EGP Padre: solo Proveedor; se listan EGPs vigentes no bloqueados (MAGIA-39). */}
          {!esEgp && (
            <Field label="EGP Padre *" error={errors.egpPadre}>
              <Select
                value={egpPadre}
                onValueChange={(v) => {
                  setEgpPadre(v);
                  clearError("egpPadre");
                }}
              >
                <SelectTrigger
                  className={cn("w-full", errors.egpPadre && inputError)}
                  aria-invalid={!!errors.egpPadre}
                >
                  <SelectValue placeholder="Seleccioná un EGP…" />
                </SelectTrigger>
                <SelectContent>
                  {egpOptions.map((nombre) => (
                    <SelectItem key={nombre} value={nombre}>
                      {nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="RUC *" error={errors.ruc}>
            <Input
              value={ruc}
              maxLength={RUC_MAX}
              placeholder="80012345-6"
              onChange={(e) => handleRucChange(e.target.value)}
              onBlur={handleRucBlur}
              className={cn(errors.ruc && inputError)}
            />
            {esEgp && (
              <span className="text-xs text-muted-foreground">
                Demo: en CORE están {ALTA_ENTE_SEEDS.egpEnCore.join(" · ")}
              </span>
            )}
          </Field>

          <Field label="Razón Social" error={errors.razonSocial}>
            <Input
              value={razonSocial}
              disabled={esEgp || reutilizado}
              placeholder={esEgp ? "Se autocompleta desde CORE" : ""}
              onChange={(e) => {
                setRazonSocial(e.target.value);
                clearError("razonSocial");
              }}
              className={cn(errors.razonSocial && inputError)}
            />
          </Field>

          <Field label="Email de Contacto" error={errors.email}>
            <Input
              type="email"
              value={email}
              disabled={reutilizado}
              placeholder="contacto@empresa.com.py"
              onChange={(e) => {
                setEmail(e.target.value);
                clearError("email");
              }}
              className={cn(errors.email && inputError)}
            />
          </Field>

          <Field label="Teléfono" error={errors.telefono}>
            <Input
              value={telefono}
              disabled={reutilizado}
              placeholder="+59598 xxx xxx"
              maxLength={25}
              onChange={(e) => {
                setTelefono(e.target.value);
                clearError("telefono");
              }}
              className={cn(errors.telefono && inputError)}
            />
          </Field>
        </div>

        {/* Documentación legal al pie del modal (MAGIA-38/39 esc. 1 y 5). */}
        <div className="rounded-lg border p-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground uppercase">
            Documentación legal
          </p>
          <div className="flex flex-col gap-2">
            {adjuntos.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin documentos adjuntos.</p>
            )}
            {adjuntos.map((doc) => (
              <div key={doc} className="flex items-center gap-2 text-sm">
                <FileText className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate">{doc}</span>
                <button
                  type="button"
                  title="Quitar adjunto"
                  onClick={() => setAdjuntos((a) => a.filter((d) => d !== doc))}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAdjunto(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1 w-fit"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip />
              Adjuntar documento
            </Button>
            <p className="text-[11px] text-muted-foreground">Máx. 10 MB; PDF, DOC, JPG.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
