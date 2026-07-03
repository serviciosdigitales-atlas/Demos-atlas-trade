import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

// ---------- Datos mock ----------
type Dominio = "Banco" | "EGP" | "Proveedor";

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

const ENTES: Record<"EGP" | "Proveedor", { nombre: string; bloqueado: boolean }[]> = {
  EGP: [
    { nombre: "EGP Central", bloqueado: false },
    { nombre: "EGP Norte", bloqueado: false },
    { nombre: "EGP Sur", bloqueado: false },
  ],
  Proveedor: [
    { nombre: "Biggie", bloqueado: false },
    { nombre: "Ferrex", bloqueado: true },
    { nombre: "Stock", bloqueado: false },
    { nombre: "Nicolás", bloqueado: false },
  ],
};

const ROLES: Record<Dominio, string[]> = {
  Banco: ["Admin-Banco", "Operador-Banco", "Consulta-Banco"],
  EGP: ["Admin-EGP", "Operador-EGP", "Consulta-EGP"],
  Proveedor: ["Admin-Proveedor", "Operador-Proveedor"],
};

// Dominios habilitados para dar de alta según el dominio del usuario logueado.
// Incluye carga mismo-dominio + inter-dominio (Banco→EGP, EGP→Proveedor).
const DOMAIN_PERMISSIONS: Record<Dominio, Dominio[]> = {
  Banco: ["Banco", "EGP"],
  EGP: ["EGP", "Proveedor"],
  Proveedor: ["Proveedor"],
};

interface Usuario {
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

const DOMINIO_TAG: Record<Dominio, string> = {
  Banco: "bg-atlas-primary/10 text-atlas-primary",
  EGP: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  Proveedor: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
};

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

export function AltaUsuarioDemo() {
  const [sessionDomain, setSessionDomain] = useState<Dominio>("Banco");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [open, setOpen] = useState(false);

  // Registros existentes para simular validación back-end (persisten en la sesión)
  const existingMails = useRef(new Set(["existente@atlas.com.py"]));
  const existingCIs = useRef(new Set(["5555555"]));

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-semibold">Gestión ABM · Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Marco de Automatización y Gestión Inteligente con Agentes IA
          </p>
        </div>
        <span className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
          MAGIA-47 · Mock
        </span>
      </div>

      {/* Barra de simulación de login (solo mock, no existe en la app real) */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-dashed border-atlas-primary/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-800 uppercase dark:bg-amber-950 dark:text-amber-300">
            Simulación
          </span>
          <div>
            <p className="text-sm font-medium">Sesión simulada (login)</p>
            <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
              En la aplicación real esto se determina por el login. Define el dominio del usuario
              logueado; los dominios disponibles para dar de alta se ajustan según sus permisos
              (mismo dominio e inter-dominio).
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 sm:min-w-56">
          <Label className="text-xs text-muted-foreground">Estoy logueado como dominio</Label>
          <Select value={sessionDomain} onValueChange={(v) => setSessionDomain(v as Dominio)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Banco">Banco</SelectItem>
              <SelectItem value="EGP">EGP</SelectItem>
              <SelectItem value="Proveedor">Proveedor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="flex items-center justify-between gap-4 border-b p-4">
          <div>
            <h2 className="font-heading text-base font-medium">Usuarios</h2>
            <p className="text-xs text-muted-foreground">
              Listado de usuarios registrados en la plataforma
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus />
            Nuevo usuario
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2.5 font-medium">Nombre</th>
                <th className="px-4 py-2.5 font-medium">CI</th>
                <th className="px-4 py-2.5 font-medium">Mail</th>
                <th className="px-4 py-2.5 font-medium">Teléfono</th>
                <th className="px-4 py-2.5 font-medium">Dominio</th>
                <th className="px-4 py-2.5 font-medium">Ente</th>
                <th className="px-4 py-2.5 font-medium">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usuarios.map((u, i) => (
                <tr key={i} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">
                    {u.nombre} {u.apellido}
                  </td>
                  <td className="px-4 py-2.5">{u.ci}</td>
                  <td className="px-4 py-2.5">{u.mail}</td>
                  <td className="px-4 py-2.5">{u.tel}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        DOMINIO_TAG[u.dominio]
                      )}
                    >
                      {u.dominio}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{u.ente}</td>
                  <td className="px-4 py-2.5">{u.rol}</td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No hay usuarios cargados todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3.5 px-1 text-xs text-muted-foreground">
        Datos de prueba para reproducir escenarios — Email duplicado:{" "}
        <code className="rounded bg-muted px-1.5 py-0.5">existente@atlas.com.py</code> · CI
        duplicada: <code className="rounded bg-muted px-1.5 py-0.5">5555555</code> · Ente bloqueado:{" "}
        <code className="rounded bg-muted px-1.5 py-0.5">Ferrex</code> (dominio Proveedor).
      </p>

      {open && (
        <AltaUsuarioDialog
          sessionDomain={sessionDomain}
          existingMails={existingMails.current}
          existingCIs={existingCIs.current}
          onClose={() => setOpen(false)}
          onSave={(u) => {
            existingMails.current.add(u.mail.toLowerCase());
            existingCIs.current.add(u.ci);
            setUsuarios((prev) => [u, ...prev]);
            setOpen(false);
            toast.success("Registro exitoso", {
              description: `${u.nombre} ${u.apellido} fue registrado exitosamente.`,
            });
          }}
        />
      )}
    </div>
  );
}

// ---------- Modal de alta ----------
function AltaUsuarioDialog({
  sessionDomain,
  existingMails,
  existingCIs,
  onClose,
  onSave,
}: {
  sessionDomain: Dominio;
  existingMails: Set<string>;
  existingCIs: Set<string>;
  onClose: () => void;
  onSave: (u: Usuario) => void;
}) {
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [banner, setBanner] = useState<{ type: "err" | "warn"; text: string } | null>(null);

  const dominiosPermitidos = DOMAIN_PERMISSIONS[sessionDomain];
  const showAD = form.dominio === "Banco";
  const showEnte = form.dominio === "EGP" || form.dominio === "Proveedor";
  const personalDisabled = form.dominio === "Banco"; // en Banco los datos vienen del AD

  const set = (patch: Partial<FormValues>) => setForm((f) => ({ ...f, ...patch }));
  const clearError = (k: keyof FormValues) =>
    setErrors((e) => {
      const { [k]: _omit, ...rest } = e;
      return rest;
    });

  // Cambiar el dominio reconfigura los campos dependientes
  function handleDominioChange(value: string) {
    const dom = value as Dominio;
    setForm({ ...EMPTY_FORM, dominio: dom });
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
      const sel = ENTES[form.dominio].find((x) => x.nombre === form.ente);
      if (sel?.bloqueado) {
        setBanner({
          type: "warn",
          text: "El ente seleccionado se encuentra bloqueado, comuníquese con su administrador.",
        });
        setErrors((prev) => ({ ...prev, ente: "Ente bloqueado" }));
        return false;
      }
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
    if (sessionDomain === form.dominio)
      return "Carga mismo dominio: el ente queda preseteado según el ente del usuario logueado.";
    if (form.dominio === "EGP") return "Inter-dominio Banco→EGP: se listan todos los EGP.";
    return "Inter-dominio EGP→Proveedor: se listan los proveedores asociados.";
  }, [showEnte, sessionDomain, form.dominio]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
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

          {/* Ente asociado (EGP / Proveedor) */}
          {showEnte && form.dominio !== "" && form.dominio !== "Banco" && (
            <Field className="sm:col-span-2" label="Ente asociado" required error={errors.ente}>
              <Select
                value={form.ente}
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
                  {ENTES[form.dominio].map((e) => (
                    <SelectItem key={e.nombre} value={e.nombre}>
                      {e.nombre}
                      {e.bloqueado ? " (bloqueado)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Hint>{enteHint}</Hint>
            </Field>
          )}

          {/* Rol */}
          <Field className="sm:col-span-2" label="Rol" required error={errors.rol}>
            <Select
              value={form.rol}
              onValueChange={(v) => {
                set({ rol: v });
                clearError("rol");
              }}
              disabled={!form.dominio}
            >
              <SelectTrigger className="w-full" aria-invalid={!!errors.rol}>
                <SelectValue
                  placeholder={form.dominio ? "Seleccione un rol…" : "Seleccione un dominio primero…"}
                />
              </SelectTrigger>
              <SelectContent>
                {(form.dominio ? ROLES[form.dominio] : []).map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
  children: React.ReactNode;
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

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-muted-foreground">{children}</span>;
}
