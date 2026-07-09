import type { ComponentType } from "react";

import { LoginDemo } from "@/demos/login/LoginDemo";
import { HomeDashboardDemo } from "@/demos/home/HomeDashboardDemo";
import { AltaUsuarioDemo } from "@/demos/alta-usuario/AltaUsuarioDemo";
import { AbmDemo } from "@/demos/abm/AbmDemo";
import { MockPermissionsDemo } from "@/demos/mock-permissions/MockPermissionsDemo";

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
    description:
      "Pantalla de acceso con Modo Mock: selector dominio/rol y autocompletado de credenciales, igual que el front real.",
    category: "Autenticación",
    status: "listo",
    component: LoginDemo,
  },
  {
    slug: "mock-permisos",
    title: "Mock · Permisos del usuario",
    description:
      "Página de debug del modo mock: datos de la sesión simulada, permisos del rol y agrupación por recurso.",
    category: "Autenticación",
    status: "listo",
    component: MockPermissionsDemo,
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
      "MAGIA-47 · El modal de alta abierto sobre la pantalla ABM: permisos por dominio, búsqueda AD, ente preseteado según la sesión y validación.",
    category: "Usuarios",
    status: "listo",
    component: AltaUsuarioDemo,
  },
  {
    slug: "abm",
    title: "ABM · Pantalla base",
    description:
      "MAGIA-25/30/35/38/39 · Pestañas con permisos por rol, grillas con filtros y acciones por fila, y alta de EGP / Proveedor con validaciones.",
    category: "ABM",
    status: "listo",
    component: AbmDemo,
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
  { slug: "home", nextLabel: "Abrí “ABM” en el menú lateral" },
  // El ABM es el último paso y funciona como espacio de trabajo libre (dar de
  // alta entes/usuarios, aprobar, etc.); se finaliza con "Finalizar recorrido".
  { slug: "abm", nextLabel: "Explorá el ABM: dá de alta entes y usuarios; finalizá cuando quieras" },
];

/** Busca un demo por su slug. */
export function getDemo(slug: string): DemoEntry | undefined {
  return demos.find((d) => d.slug === slug);
}
