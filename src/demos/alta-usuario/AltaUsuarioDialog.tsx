import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------- Datos mock (MAGIA-47) ----------
export type Dominio = "Banco" | "EGP" | "Proveedor";

interface AdUser {
  user: string;
  nombre: string;
  apellido: string;
  ci: string;
  mail: string;
  tel: string;
}

const AD_USERS: AdUser[] = [
  { user: "jperez", nombre: "Juan", apellido: "Pérez", ci: "1234567", mail: "juan.perez@banco.com", tel: "0981111111" },
  { user: "mlopez", nombre: "María", apellido: "López", ci: "2345678", mail: "maria.lopez@banco.com", tel: "0982222222" },
  { user: "rgomez", nombre: "Roberto", apellido: "Gómez", ci: "3456789", mail: "roberto.gomez@banco.com", tel: "0983333333" },
  { user: "acaballero", nombre: "Ana", apellido: "Caballero", ci: "4567890", mail: "ana.caballero@banco.com", tel: "0984444444" },
];

// Ente para el combo de alta: nombre + si está bloqueado. La lista real llega
// por props desde el store en memoria del ABM (semilla + altas de la sesión),
// así un EGP/Proveedor recién creado aparece acá sin recargar.
export type EnteOpcion = { nombre: string; bloqueado: boolean };

// Alineado con los roles reales del login (mock-selector-dominio-roles.json).
const ROLES: Record<Dominio, string[]> = {
  Banco: ["Admin-Banco", "Operador-Banco", "Supervisor-Banco"],
  EGP: ["Admin-EGP", "Operador-EGP", "Supervisor-EGP", "Aprobador-EGP"],
  Proveedor: ["Admin-Proveedor", "Operador-Proveedor", "Supervisor-Proveedor"],
};

// Dominio "hijo" de cada dominio: base de la excepción de carga inter-dominio.
// El Banco solo carga el primer Admin-EGP de un ente; el EGP solo el primer
// Admin-Proveedor. No pueden cargar ningún otro rol (matriz filas 18/24).
const CHILD_DOMAIN: Record<Dominio, "EGP" | "Proveedor" | null> = {
  Banco: "EGP",
  EGP: "Proveedor",
  Proveedor: null,
};

/** Rol forzado cuando la carga es inter-dominio (Admin del ente hijo), o null. */
function forcedAdminRole(sessionDomain: Dominio, dominio: "" | Dominio): string | null {
  if (!dominio) return null;
  return CHILD_DOMAIN[sessionDomain] === dominio ? `Admin-${dominio}` : null;
}

export interface Usuario {
  nombre: string;
  apellido: string;
  ci: string;
  mail: string;
  tel: string;
  dominio: Dominio;
  ente: string;
  rol: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormValues = {
  dominio: "" | Dominio;
  ente: string;
  rol: string;
  nombre: string;
  apellido: string;
  ci: string;
  telefono: string;
  mail: string;
};

const EMPTY_FORM: FormValues = {
  dominio: "",
  ente: "",
  rol: "",
  nombre: "",
  apellido: "",
  ci: "",
  telefono: "",
  mail: "",
};

/** Datos de prueba para reproducir errores de "backend" en el mock. */
export const ALTA_USUARIO_SEEDS = {
  existingMail: "existente@atlas.com.py",
  existingCI: "5555555",
};

// ---------- Modal de alta (MAGIA-47) ----------
export function AltaUsuarioDialog({
  sessionDomain,
  sessionEnte,
  allowedDomains,
  entesByDomain,
  existingMails,
  existingCIs,
  hasActiveAdmin,
  initialSelection = null,
  onClose,
  onSave,
}: {
  sessionDomain: Dominio;
  /** Ente del usuario logueado (elegido al entrar como EGP/Proveedor); null para Banco. */
  sessionEnte: string | null;
  /**
   * Dominios que el rol logueado puede dar de alta, derivados de sus permisos
   * cargar:usuario-* (matriz filas 18/24: Banco→EGP y EGP→Proveedor inter-dominio).
   */
  allowedDomains: Dominio[];
  /** Entes reales del store del ABM (semilla + altas de la sesión), por dominio. */
  entesByDomain: Record<"EGP" | "Proveedor", EnteOpcion[]>;
  existingMails: Set<string>;
  existingCIs: Set<string>;
  /** Control fino simulado (filas 18/24): ¿el ente ya tiene un Admin activo? */
  hasActiveAdmin: (dominio: "EGP" | "Proveedor", ente: string) => boolean;
  /**
   * Abre el modal ya apuntado a un dominio/ente (campanita del ABM: carga del
   * primer Admin de un ente hijo recién creado). El rol queda forzado al Admin.
   */
  initialSelection?: { dominio: Dominio; ente: string } | null;
  onClose: () => void;
  onSave: (u: Usuario) => void;
}) {
  const dominiosPermitidos = allowedDomains;

  // Con un solo dominio permitido el formulario arranca preseleccionado; el
  // ente queda fijado al de la sesión solo en carga mismo-dominio. En carga
  // inter-dominio el rol arranca forzado al Admin del ente hijo (excepción).
  const [form, setForm] = useState<FormValues>(() => {
    if (initialSelection) {
      return {
        ...EMPTY_FORM,
        dominio: initialSelection.dominio,
        ente: initialSelection.ente,
        rol: forcedAdminRole(sessionDomain, initialSelection.dominio) ?? "",
      };
    }
    const unico = dominiosPermitidos.length === 1 ? dominiosPermitidos[0] : undefined;
    if (!unico) return EMPTY_FORM;
    return {
      ...EMPTY_FORM,
      dominio: unico,
      ente: unico === sessionDomain && sessionEnte ? sessionEnte : "",
      rol: forcedAdminRole(sessionDomain, unico) ?? "",
    };
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [banner, setBanner] = useState<{ type: "err" | "warn"; text: string } | null>(null);

  const showAD = form.dominio === "Banco";
  const showEnte = form.dominio === "EGP" || form.dominio === "Proveedor";
  const personalDisabled = form.dominio === "Banco"; // en Banco los datos vienen del AD
  // Carga mismo-dominio: el ente queda fijo en el ente del usuario logueado.
  const enteLocked = showEnte && form.dominio === sessionDomain && sessionEnte !== null;

  // Excepción de carga inter-dominio (filas 18/24): cuando el dominio elegido es
  // el "hijo" de la sesión, el alta queda restringida a crear el primer Admin de
  // un ente que aún no tenga uno activo — no se puede cargar ningún otro rol.
  const restricted = showEnte && form.dominio !== "" && CHILD_DOMAIN[sessionDomain] === form.dominio;
  const forcedRole = restricted ? forcedAdminRole(sessionDomain, form.dominio) : null;

  // Entes disponibles para el combo: los reales del store. En carga restringida
  // solo se listan los que todavía no tienen un Admin activo (ni están bloqueados).
  const enteOptions = useMemo<EnteOpcion[]>(() => {
    if (!showEnte || form.dominio === "" || form.dominio === "Banco") return [];
    const all = entesByDomain[form.dominio] ?? [];
    if (!restricted) return all;
    const dom = form.dominio as "EGP" | "Proveedor";
    return all.filter((e) => !e.bloqueado && !hasActiveAdmin(dom, e.nombre));
  }, [showEnte, form.dominio, entesByDomain, restricted, hasActiveAdmin]);

  const set = (patch: Partial<FormValues>) => setForm((f) => ({ ...f, ...patch }));
  const clearError = (k: keyof FormValues) =>
    setErrors((e) => {
      const { [k]: _omit, ...rest } = e;
      return rest;
    });

  // Cambiar el dominio reconfigura los campos dependientes; en carga
  // mismo-dominio el ente queda preseteado con el de la sesión.
  function handleDominioChange(value: string) {
    const dom = value as Dominio;
    setForm({
      ...EMPTY_FORM,
      dominio: dom,
      ente: dom === sessionDomain && sessionEnte ? sessionEnte : "",
      // En carga inter-dominio el rol queda forzado al Admin del ente hijo.
      rol: forcedAdminRole(sessionDomain, dom) ?? "",
    });
    setErrors({});
    setBanner(null);
  }

  function validateFront(): boolean {
    const e: Partial<Record<keyof FormValues, string>> = {};
    if (!form.dominio) e.dominio = "Campo obligatorio";
    if (!form.rol) e.rol = "Campo obligatorio";
    if (showEnte && !form.ente) e.ente = "Campo obligatorio";
    if (!form.nombre.trim()) e.nombre = "Campo obligatorio";
    if (!form.apellido.trim()) e.apellido = "Campo obligatorio";
    if (!form.ci.trim()) e.ci = "Campo obligatorio";
    if (!form.telefono.trim()) e.telefono = "Campo obligatorio";
    if (!form.mail.trim()) e.mail = "Campo obligatorio";
    else if (!EMAIL_RE.test(form.mail.trim())) e.mail = "Formato de email inválido";

    setErrors(e);
    if (Object.keys(e).length > 0) {
      setBanner({ type: "err", text: "Revise los campos obligatorios resaltados en rojo." });
      return false;
    }
    return true;
  }

  function validateBack(): boolean {
    // Ente bloqueado
    if (showEnte && (form.dominio === "EGP" || form.dominio === "Proveedor")) {
      const sel = (entesByDomain[form.dominio] ?? []).find((x) => x.nombre === form.ente);
      if (sel?.bloqueado) {
        setBanner({
          type: "warn",
          text: "El ente seleccionado se encuentra bloqueado, comuníquese con su administrador.",
        });
        setErrors((prev) => ({ ...prev, ente: "Ente bloqueado" }));
        return false;
      }
    }
    // Control fino simulado (filas 18/24): el alta inter-dominio de un
    // Admin-EGP / Admin-Proveedor solo procede si el ente NO tiene ya un Admin
    // activo. La carga mismo-dominio (p. ej. un Admin-EGP cargando otro
    // Admin-EGP de su ente) no tiene esta restricción.
    if (
      form.dominio !== sessionDomain &&
      (form.dominio === "EGP" || form.dominio === "Proveedor") &&
      (form.rol === "Admin-EGP" || form.rol === "Admin-Proveedor") &&
      hasActiveAdmin(form.dominio, form.ente)
    ) {
      setBanner({
        type: "err",
        text: `Ya existe un ${form.rol} activo para ${form.ente}: el alta inter-dominio solo permite cargar el primer ${form.rol} del ente.`,
      });
      setErrors((prev) => ({ ...prev, rol: `Ya hay un ${form.rol} activo` }));
      return false;
    }
    // Email duplicado
    if (existingMails.has(form.mail.trim().toLowerCase())) {
      setBanner({ type: "err", text: "Email ya registrado para otro usuario." });
      setErrors((prev) => ({ ...prev, mail: "Email ya registrado" }));
      return false;
    }
    // CI duplicada
    if (existingCIs.has(form.ci.trim())) {
      setBanner({ type: "err", text: "Cédula de Identidad ya registrada para otro usuario." });
      setErrors((prev) => ({ ...prev, ci: "CI ya registrada" }));
      return false;
    }
    return true;
  }

  function guardar() {
    setBanner(null);
    if (!validateFront()) return;
    if (!validateBack()) return;
    onSave({
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      ci: form.ci.trim(),
      mail: form.mail.trim(),
      tel: form.telefono.trim(),
      dominio: form.dominio as Dominio,
      ente: showEnte ? form.ente : "—",
      rol: form.rol,
    });
  }

  const enteHint = useMemo(() => {
    if (!showEnte) return "";
    if (enteLocked)
      return `Carga mismo dominio: el ente queda fijado en ${sessionEnte}, el ente con el que ingresaste.`;
    if (restricted)
      return `Excepción ${sessionDomain}→${form.dominio}: solo se listan los ${form.dominio} que aún no tienen un Admin activo (solo podés cargar el primero).`;
    if (form.dominio === "EGP") return "Inter-dominio Banco→EGP: se listan todos los EGP.";
    return "Se listan los proveedores de la demo.";
  }, [showEnte, enteLocked, restricted, sessionEnte, sessionDomain, form.dominio]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alta de usuario</DialogTitle>
        </DialogHeader>

        {banner && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm",
              banner.type === "warn"
                ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            )}
          >
            <AlertTriangle className="size-4 shrink-0" />
            {banner.text}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Dominio */}
          <Field className="sm:col-span-2" label="Dominio del usuario" required error={errors.dominio}>
            <Select value={form.dominio} onValueChange={handleDominioChange}>
              <SelectTrigger className="w-full" aria-invalid={!!errors.dominio}>
                <SelectValue placeholder="Seleccione un dominio…" />
              </SelectTrigger>
              <SelectContent>
                {dominiosPermitidos.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Hint>Campo clave: define qué campos y roles se muestran (según permisos).</Hint>
          </Field>

          {/* Búsqueda AD (solo Banco) */}
          {showAD && (
            <Field className="sm:col-span-2" label="Búsqueda usuario AD">
              <AdSearch
                onSelect={(u) => {
                  set({
                    nombre: u.nombre,
                    apellido: u.apellido,
                    ci: u.ci,
                    mail: u.mail,
                    telefono: u.tel,
                  });
                  setErrors((e) => {
                    const { nombre, apellido, ci, mail, telefono, ...rest } = e;
                    return rest;
                  });
                }}
              />
              <Hint>Solo usuarios existentes en AD son seleccionables para dominio Banco.</Hint>
            </Field>
          )}

          {/* Ente asociado (EGP / Proveedor). En carga mismo-dominio queda
              fijado al ente de la sesión; solo el Banco elige entre los EGP. */}
          {showEnte && form.dominio !== "" && form.dominio !== "Banco" && (
            <Field className="sm:col-span-2" label="Ente asociado" required error={errors.ente}>
              {restricted && enteOptions.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  Todos los {form.dominio} ya tienen un Admin activo: como {sessionDomain} no hay
                  ningún ente al que cargarle el primer administrador.
                </div>
              ) : (
                <Select
                  value={form.ente}
                  disabled={enteLocked}
                  onValueChange={(v) => {
                    set({ ente: v });
                    clearError("ente");
                    setBanner(null);
                  }}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.ente}>
                    <SelectValue placeholder="Seleccione un ente…" />
                  </SelectTrigger>
                  <SelectContent>
                    {enteOptions.map((e) => (
                      <SelectItem key={e.nombre} value={e.nombre} disabled={e.bloqueado}>
                        {e.nombre}
                        {e.bloqueado ? " (bloqueado)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Hint>{enteHint}</Hint>
            </Field>
          )}

          {/* Rol. En carga inter-dominio queda forzado al Admin del ente hijo. */}
          <Field className="sm:col-span-2" label="Rol" required error={errors.rol}>
            <Select
              value={form.rol}
              onValueChange={(v) => {
                set({ rol: v });
                clearError("rol");
              }}
              disabled={!form.dominio || restricted}
            >
              <SelectTrigger className="w-full" aria-invalid={!!errors.rol}>
                <SelectValue
                  placeholder={form.dominio ? "Seleccione un rol…" : "Seleccione un dominio primero…"}
                />
              </SelectTrigger>
              <SelectContent>
                {(restricted && forcedRole ? [forcedRole] : form.dominio ? ROLES[form.dominio] : []).map(
                  (r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            {restricted && (
              <Hint>
                Excepción {sessionDomain}→{form.dominio}: solo podés cargar el {forcedRole}; ningún
                otro rol está habilitado.
              </Hint>
            )}
          </Field>

          {/* Datos personales */}
          <Field label="Nombre" required error={errors.nombre}>
            <Input
              value={form.nombre}
              disabled={personalDisabled}
              aria-invalid={!!errors.nombre}
              onChange={(e) => {
                set({ nombre: e.target.value });
                clearError("nombre");
              }}
            />
          </Field>
          <Field label="Apellido" required error={errors.apellido}>
            <Input
              value={form.apellido}
              disabled={personalDisabled}
              aria-invalid={!!errors.apellido}
              onChange={(e) => {
                set({ apellido: e.target.value });
                clearError("apellido");
              }}
            />
          </Field>
          <Field label="CI" required error={errors.ci}>
            <Input
              value={form.ci}
              inputMode="numeric"
              placeholder="Solo números"
              disabled={personalDisabled}
              aria-invalid={!!errors.ci}
              onChange={(e) => {
                set({ ci: e.target.value.replace(/\D+/g, "") });
                clearError("ci");
              }}
            />
          </Field>
          <Field label="Teléfono" required error={errors.telefono}>
            <Input
              value={form.telefono}
              inputMode="tel"
              placeholder="09xx xxxxxx"
              disabled={personalDisabled}
              aria-invalid={!!errors.telefono}
              onChange={(e) => {
                set({ telefono: e.target.value });
                clearError("telefono");
              }}
            />
          </Field>
          <Field className="sm:col-span-2" label="Mail" required error={errors.mail}>
            <Input
              type="email"
              value={form.mail}
              placeholder="usuario@dominio.com"
              disabled={personalDisabled}
              aria-invalid={!!errors.mail}
              onChange={(e) => {
                set({ mail: e.target.value });
                clearError("mail");
              }}
            />
          </Field>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={guardar}>Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Búsqueda AD (combobox simple) ----------
function AdSearch({ onSelect }: { onSelect: (u: AdUser) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return AD_USERS;
    return AD_USERS.filter((u) =>
      [u.user, u.nombre, u.apellido, u.ci].some((v) => v.toLowerCase().includes(q))
    );
  }, [query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          className="pl-8"
          placeholder="Buscar por usuario, nombre o CI…"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
      </div>
      {open && (
        <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-20 max-h-52 overflow-y-auto rounded-lg bg-popover shadow-md ring-1 ring-foreground/10">
          {matches.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">Sin coincidencias en AD</div>
          ) : (
            matches.map((u) => (
              <button
                key={u.user}
                type="button"
                className="block w-full border-b border-border/60 px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  onSelect(u);
                  setQuery(`${u.nombre} ${u.apellido} (${u.user})`);
                  setOpen(false);
                }}
              >
                {u.nombre} {u.apellido}
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {u.user} · CI {u.ci} · {u.mail}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Helpers de UI ----------
function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <span className="text-xs font-medium text-destructive">{error}</span>}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <span className="text-xs text-muted-foreground">{children}</span>;
}
