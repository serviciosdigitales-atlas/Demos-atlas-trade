import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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

const schema = z.object({
  cedente: z.string().min(1, "Requerido"),
  deudor: z.string().min(1, "Requerido"),
  nroFactura: z.string().min(1, "Requerido"),
  monto: z.coerce.number().positive("Debe ser mayor a 0"),
  vencimiento: z.string().min(1, "Requerido"),
});

type FormValues = z.infer<typeof schema>;

export function FormularioCesionDemo() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { cedente: "", deudor: "", nroFactura: "", monto: 0, vencimiento: "" },
  });

  function onSubmit(values: FormValues) {
    toast.success("Cesión registrada (demo)", {
      description: `${values.nroFactura} · ${values.monto.toLocaleString("es-PY")} Gs.`,
    });
    reset();
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Nueva cesión de factura</CardTitle>
          <CardDescription>
            Completá los datos de la operación. Todos los campos son obligatorios.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Cedente" error={errors.cedente?.message}>
              <Input {...register("cedente")} placeholder="Empresa A S.A." />
            </Field>
            <Field label="Deudor" error={errors.deudor?.message}>
              <Input {...register("deudor")} placeholder="Empresa B S.A." />
            </Field>
            <Field label="N° de factura" error={errors.nroFactura?.message}>
              <Input {...register("nroFactura")} placeholder="001-001-0000123" />
            </Field>
            <Field label="Monto (Gs.)" error={errors.monto?.message}>
              <Input type="number" step="1" {...register("monto")} placeholder="0" />
            </Field>
            <Field label="Vencimiento" error={errors.vencimiento?.message}>
              <Input type="date" {...register("vencimiento")} />
            </Field>
          </CardContent>
          <CardFooter className="mt-4 justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => reset()}>
              Limpiar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Registrar cesión
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
