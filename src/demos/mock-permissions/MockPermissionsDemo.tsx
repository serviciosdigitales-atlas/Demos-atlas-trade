import { useState } from "react";
import { ShieldCheckIcon, ShieldOffIcon } from "lucide-react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  clearMockSession,
  entesForRole,
  getMockSession,
  groupPermissionsByResource,
  setMockSession,
  type MockLoginEntry,
} from "@/demos/login/mock-session";
import selectorData from "../../../mock-data/login/mock-selector-dominio-roles.json";

const domainRoles = selectorData as Record<string, string[]>;

/**
 * Réplica de `MockPermissionsPage` (`/mock/permisos`) del front real: muestra
 * los datos de la sesión mock activa, sus permisos y la agrupación por
 * recurso que usa la UI para habilitar secciones y acciones.
 */
export function MockPermissionsDemo() {
  const [session, setSession] = useState<MockLoginEntry | null>(getMockSession);
  const navigate = useNavigate();

  return (
    // key: fuerza el remount del shell para que sidebar y usuario reflejen la sesión
    <PlatformShellDemo
      key={session?.user.role ?? "sin-sesion"}
      activeNav="mock-permisos"
      headerTitle="Mock · Permisos"
    >
      {session ? (
        <SessionView
          session={session}
          onLogout={() => {
            clearMockSession();
            setSession(null);
          }}
        />
      ) : (
        <EmptyState
          onSelectRole={(role) => {
            // Sesión simulada sin pasar por el login: asume el primer ente del dominio.
            setMockSession(role, entesForRole(role)[0] ?? null);
            setSession(getMockSession());
          }}
          onGoLogin={() => void navigate("/demos/login")}
        />
      )}
    </PlatformShellDemo>
  );
}

function EmptyState({
  onSelectRole,
  onGoLogin,
}: {
  onSelectRole: (role: string) => void;
  onGoLogin: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <ShieldOffIcon className="h-12 w-12 text-muted-foreground" />
      <h3 className="font-heading text-lg font-semibold">Sin sesión mock activa</h3>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        Esta página solo está disponible cuando se inicia sesión en modo mock. Ingresá desde el
        login con el Modo Mock activado, o simulá una sesión acá mismo.
      </p>
      <div className="flex w-56 flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Simular sesión con rol</Label>
        <Select onValueChange={onSelectRole}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar rol..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(domainRoles).map(([domain, roles]) => (
              <SelectGroup key={domain}>
                <SelectLabel className="text-[10px] uppercase tracking-wide">{domain}</SelectLabel>
                {roles.map((role) => (
                  <SelectItem key={role} value={role} className="text-xs">
                    {role}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button variant="outline" onClick={onGoLogin}>
        Ir al login
      </Button>
    </div>
  );
}

function SessionView({
  session,
  onLogout,
}: {
  session: MockLoginEntry;
  onLogout: () => void;
}) {
  const { user } = session;
  const permissionsByResource = groupPermissionsByResource(user.permissions);
  const resources = Object.keys(permissionsByResource);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="h-6 w-6 text-amber-500" />
          <h3 className="font-heading text-lg font-semibold">
            Mock: Permisos del usuario actual
          </h3>
        </div>
        <Button variant="outline" size="sm" onClick={onLogout}>
          Cerrar sesión mock
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de sesión mock</CardTitle>
          <CardDescription>
            Información cargada desde{" "}
            <code className="rounded bg-muted px-1 text-xs">mock-respuesta-login.json</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-muted-foreground">Usuario</span>
            <span className="col-span-2">{user.username}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-muted-foreground">Rol</span>
            <span className="col-span-2">{user.role}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-muted-foreground">Dominio</span>
            <span className="col-span-2">{user.domain}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Permisos asignados{" "}
            <span className="ml-1 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {user.permissions.length}
            </span>
          </CardTitle>
          <CardDescription>
            Estos permisos determinan qué componentes y acciones están habilitados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.permissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este rol no tiene permisos asignados.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {user.permissions.map((perm) => (
                <li key={perm}>
                  <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs text-foreground">
                    {perm}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permisos agrupados por recurso</CardTitle>
          <CardDescription>
            Vista normalizada usada por el front real para habilitar secciones y acciones en la
            UI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {resources.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin recursos con permisos asignados.</p>
          ) : (
            resources.map((resource) => (
              <div key={resource} className="rounded-md border border-border p-3">
                <p className="mb-2 font-mono text-xs font-semibold text-foreground">{resource}</p>
                <ul className="flex flex-wrap gap-1">
                  {(permissionsByResource[resource] ?? []).map((action) => (
                    <li key={action}>
                      <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 font-mono text-xs text-amber-800">
                        {action}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
