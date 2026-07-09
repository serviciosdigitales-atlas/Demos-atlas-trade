// Estado en memoria de la "sesión de recorrido" del ABM (MAGIA-224).
// Todo lo que se da de alta o se aprueba durante el recorrido sobrevive a la
// navegación entre pantallas (hash router, sin recarga de página) y vuelve a
// cero con un refresh (F5). A propósito NO se usa localStorage/sessionStorage:
// la demo debe arrancar siempre desde los JSON de semilla.
import { useCallback, useState, type SetStateAction } from "react";

import { ALTA_USUARIO_SEEDS } from "@/demos/alta-usuario/AltaUsuarioDialog";
import usuariosData from "../../../mock-data/abm/usuarios.json";
import { egpRows, proveedorRows, type EnteRow } from "./abm-shared";

export type UsuarioDominio = "banco" | "egp" | "proveedor";

/** Quién cargó al usuario: base de los controles finos simulados (matriz filas 18-26). */
export type CargadoPor = { usuario: string; dominio: UsuarioDominio };

/** Fila de la grilla de Usuarios (MAGIA-30). Un usuario con varios entes aparece una vez por ente. */
export type UsuarioRow = {
  nombre: string;
  apellido: string;
  ci: string;
  mail: string;
  telefono: string;
  acceso: string;
  estado: string;
  dominio: UsuarioDominio;
  ente: string;
  rol: string;
  cargadoPor: CargadoPor;
};

type AbmSessionState = {
  usuarios: UsuarioRow[];
  egpRows: EnteRow[];
  provRows: EnteRow[];
};

const session: AbmSessionState = {
  usuarios: (usuariosData as UsuarioRow[]).map((u) => ({ ...u })),
  egpRows: egpRows.map((r) => ({ ...r })),
  provRows: proveedorRows.map((r) => ({ ...r })),
};

/** Mails/CIs "ya registrados" para las validaciones de duplicados del alta (MAGIA-47). */
export const sessionMails = new Set([ALTA_USUARIO_SEEDS.existingMail]);
export const sessionCIs = new Set([ALTA_USUARIO_SEEDS.existingCI]);

/**
 * useState respaldado por el store en memoria: el componente se monta con lo
 * que dejó la última visita y cada cambio queda guardado para la próxima.
 */
export function useAbmSession<K extends keyof AbmSessionState>(key: K) {
  const [value, setValue] = useState<AbmSessionState[K]>(session[key]);
  const set = useCallback(
    (updater: SetStateAction<AbmSessionState[K]>) => {
      setValue((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (p: AbmSessionState[K]) => AbmSessionState[K])(prev)
            : updater;
        session[key] = next;
        return next;
      });
    },
    [key]
  );
  return [value, set] as const;
}
