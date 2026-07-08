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

const STORAGE_KEY = "atlas-demo-mock-session";

/** Devuelve la sesión mock activa, o `null` si no hay ninguna. */
export function getMockSession(): MockLoginEntry | null {
  try {
    const role = localStorage.getItem(STORAGE_KEY);
    return role ? (mockResponses[role] ?? null) : null;
  } catch {
    return null;
  }
}

/** Inicia una sesión mock con el rol indicado (clave del fixture). */
export function setMockSession(role: string) {
  localStorage.setItem(STORAGE_KEY, role);
}

/** Cierra la sesión mock. */
export function clearMockSession() {
  localStorage.removeItem(STORAGE_KEY);
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
