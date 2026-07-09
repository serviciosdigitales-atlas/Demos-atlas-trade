// Espejo mínimo del sistema de mock login de `atlas-trade-front` para este demo.
// En el front real esto vive repartido en authStore + mockStore + permissions.ts;
// acá solo se persiste el rol elegido en localStorage. Nunca hay conexión real.
import mockLoginResponses from "../../../mock-data/login/mock-respuesta-login.json";

export interface MockUser {
  id: number;
  username: string;
  role: string;
  domain: string;
  permissions: string[];
}

export interface MockLoginEntry {
  token: string;
  user: MockUser;
}

/** Respuesta simulada del BFF por rol (fixture del front real). */
export const mockResponses = mockLoginResponses as Record<string, MockLoginEntry>;

/**
 * Entes de esta demo: al entrar con un rol de dominio egp/proveedor se elige
 * cuál de estos entes "sos"; el dominio banco no tiene ente asociado.
 */
export const DOMAIN_ENTES: Record<string, string[]> = {
  egp: ["Biggie", "Ferrex"],
  proveedor: ["Massei", "Lincoln", "Nestlé"],
};

/** Entes elegibles para un rol según su dominio ([] para banco). */
export function entesForRole(role: string): string[] {
  const domain = mockResponses[role]?.user.domain ?? "";
  return DOMAIN_ENTES[domain] ?? [];
}

const STORAGE_KEY = "atlas-demo-mock-session";
const ENTE_STORAGE_KEY = "atlas-demo-mock-session-ente";

/** Devuelve la sesión mock activa, o `null` si no hay ninguna. */
export function getMockSession(): MockLoginEntry | null {
  try {
    const role = localStorage.getItem(STORAGE_KEY);
    return role ? (mockResponses[role] ?? null) : null;
  } catch {
    return null;
  }
}

/** Ente elegido al iniciar la sesión mock (solo dominios egp/proveedor). */
export function getMockEnte(): string | null {
  try {
    return localStorage.getItem(ENTE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Inicia una sesión mock con el rol indicado (clave del fixture) y su ente. */
export function setMockSession(role: string, ente?: string | null) {
  localStorage.setItem(STORAGE_KEY, role);
  if (ente) {
    localStorage.setItem(ENTE_STORAGE_KEY, ente);
  } else {
    localStorage.removeItem(ENTE_STORAGE_KEY);
  }
}

/** Cierra la sesión mock. */
export function clearMockSession() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ENTE_STORAGE_KEY);
}

/**
 * Igual que `app/common/lib/utils/permissions.ts` del front real:
 * transforma `["cargar:ente-egp", ...]` en `{ "ente-egp": ["cargar"], ... }`.
 */
export function groupPermissionsByResource(permissions: string[]): Record<string, string[]> {
  return permissions.reduce<Record<string, string[]>>((acc, permission) => {
    const colonIndex = permission.indexOf(":");
    if (colonIndex === -1) return acc;

    const action = permission.slice(0, colonIndex);
    const resource = permission.slice(colonIndex + 1);

    if (!action || !resource) return acc;

    (acc[resource] ??= []).push(action);

    return acc;
  }, {});
}
