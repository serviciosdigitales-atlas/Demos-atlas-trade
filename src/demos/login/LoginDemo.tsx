import { useState } from "react";
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

export function LoginDemo() {
  const [loading, setLoading] = useState(false);
  const flow = useDemoFlow();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // En el recorrido guiado, ingresar lleva al dashboard del home.
      // Individual: solo confirma con un toast.
      if (flow) flow.advance();
      else toast.success("Sesión iniciada (demo)");
    }, 700);
  }

  return (
    <div className="flex min-h-[calc(100vh-85px)] items-center justify-center bg-muted/40 p-6">
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" placeholder="usuario@atlas.com" required />
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
              <Input id="password" type="password" placeholder="••••••••" required />
            </div>
          </CardContent>
          <CardFooter className="mt-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Ingresando…" : "Ingresar"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
