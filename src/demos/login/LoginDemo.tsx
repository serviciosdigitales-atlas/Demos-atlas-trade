import { useEffect, useState } from "react";
import { InfoIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDemoFlow } from "@/app/flow";
import { MockLoginPanel } from "./MockLoginPanel";
import {
  clearMockSession,
  entesForRole,
  mockResponses,
  setMockSession,
} from "./mock-session";

export function LoginDemo() {
  const [loading, setLoading] = useState(false);
  const [mockEnabled, setMockEnabled] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedEnte, setSelectedEnte] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const flow = useDemoFlow();

  const mockActive = mockEnabled && selectedRole !== null;
  // Roles egp/proveedor deben elegir su ente (¿qué EGP/Proveedor sos?) antes de entrar.
  const needsEnte = mockActive && entesForRole(selectedRole!).length > 0;
  const missingEnte = needsEnte && selectedEnte === null;

  // Igual que el front real: al elegir un rol en modo mock se autocompletan
  // usuario = rol y contraseña = "1234".
  useEffect(() => {
    if (mockEnabled && selectedRole) {
      setUsername(selectedRole);
      setPassword("1234");
    } else {
      setUsername("");
      setPassword("");
    }
  }, [mockEnabled, selectedRole]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (mockActive && selectedRole) {
        const entry = mockResponses[selectedRole];
        setMockSession(selectedRole, needsEnte ? selectedEnte : null);
        toast.success(`Sesión mock iniciada · ${selectedRole}`, {
          description: `Dominio ${entry?.user.domain}${
            needsEnte && selectedEnte ? ` · Ente ${selectedEnte}` : ""
          } · ${entry?.user.permissions.length ?? 0} permisos`,
        });
      } else {
        // Login genérico del demo: sin rol mock, no queda sesión simulada.
        clearMockSession();
        if (!flow) toast.success("Sesión iniciada (demo)");
      }
      // En el recorrido guiado, ingresar lleva al dashboard del home.
      if (flow) flow.advance();
    }, 700);
  }

  return (
    <div className="relative flex min-h-[calc(100vh-85px)] items-center justify-center bg-muted/40 p-6">
      <MockLoginPanel
        enabled={mockEnabled}
        role={selectedRole}
        ente={selectedEnte}
        onEnabledChange={setMockEnabled}
        onRoleChange={setSelectedRole}
        onEnteChange={setSelectedEnte}
      />

      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-atlas-primary font-heading text-lg font-semibold text-white">
            AT
          </div>
          <CardTitle className="text-lg">Atlas Trade</CardTitle>
          <CardDescription>Ingresá con tu cuenta corporativa</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            {!mockActive && (
              <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
                <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Demo sin conexión con el BFF. Activá el <strong>Modo Mock</strong> (esquina
                  superior derecha) para ingresar con un rol y sus permisos.
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <button
                  type="button"
                  className="text-xs text-atlas-primary hover:underline"
                  onClick={() => toast.info("Flujo de recuperación (demo)")}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="mt-4 flex-col gap-2">
            <Button type="submit" className="w-full" disabled={loading || missingEnte}>
              {loading ? "Ingresando…" : "Ingresar"}
            </Button>
            {missingEnte && (
              <p className="text-center text-xs text-amber-700">
                Elegí qué {mockResponses[selectedRole!]?.user.domain === "egp" ? "EGP" : "Proveedor"}{" "}
                sos en el panel de Modo Mock para poder ingresar.
              </p>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
