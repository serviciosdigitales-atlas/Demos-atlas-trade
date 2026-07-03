import type { ComponentType } from "react";

import { LoginDemo } from "@/demos/login/LoginDemo";
import { AltaUsuarioDemo } from "@/demos/alta-usuario/AltaUsuarioDemo";

/**
 * Un demo del catálogo. Para agregar uno nuevo:
 *   1. Crea el componente en `src/demos/<carpeta>/<Nombre>Demo.tsx`.
 *   2. Impórtalo arriba y añade una entrada a este array.
 * La galería y las rutas se generan solas a partir de este registro.
 */
export interface DemoEntry {
  /** Identificador para la URL: #/demos/<slug> */
  slug: string;
  /** Título visible en la tarjeta de la galería */
  title: string;
  /** Descripción corta para la tarjeta */
  description: string;
  /** Categoría para agrupar (opcional) */
  category?: string;
  /** Estado del demo, se muestra como badge (opcional) */
  status?: "borrador" | "en-progreso" | "listo";
  /** El componente de pantalla a renderizar */
  component: ComponentType;
}

export const demos: DemoEntry[] = [
  {
    slug: "login",
    title: "Inicio de sesión",
    description: "Pantalla de acceso con validación de credenciales.",
    category: "Autenticación",
    status: "listo",
    component: LoginDemo,
  },
  {
    slug: "alta-usuario",
    title: "Alta de usuario (ABM)",
    description:
      "MAGIA-47 · Alta de usuarios con permisos por dominio, búsqueda AD, entes bloqueados y validación.",
    category: "Usuarios",
    status: "listo",
    component: AltaUsuarioDemo,
  },
];
