import type { ComponentType } from "react";

import { LoginDemo } from "@/demos/login/LoginDemo";
import { HomeDashboardDemo } from "@/demos/home/HomeDashboardDemo";
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
    slug: "home",
    title: "Home / Dashboard",
    description:
      "Pantalla a la que se ingresa después del login: sidebar, header y accesos, igual que el AppShell real.",
    category: "Inicio",
    status: "listo",
    component: HomeDashboardDemo,
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

/**
 * Pasos de **"Probar plataforma"** (recorrido encadenado). A diferencia de
 * abrir cada componente por separado, el recorrido encadena estas pantallas:
 * en cada una, el botón correspondiente (Ingresar, Alta de usuario, …) lleva a
 * la siguiente.
 *
 * `nextLabel` describe la acción que avanza; se muestra como pista en la barra
 * del recorrido. El último paso no necesita `nextLabel`.
 */
export interface TourStep {
  slug: string;
  /** Pista de la acción que avanza a la siguiente pantalla. */
  nextLabel?: string;
}

export const guidedTour: TourStep[] = [
  { slug: "login", nextLabel: "Ingresá para entrar al home" },
  { slug: "home", nextLabel: "Abrí “Alta de usuario”" },
  { slug: "alta-usuario" },
];

/** Busca un demo por su slug. */
export function getDemo(slug: string): DemoEntry | undefined {
  return demos.find((d) => d.slug === slug);
}
