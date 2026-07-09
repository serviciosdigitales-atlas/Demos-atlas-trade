import { AbmDemo } from "@/demos/abm/AbmDemo";

/**
 * Entrada de galería "Alta de usuario (MAGIA-47)".
 *
 * El alta ya no es una pantalla aparte: es el mismo ABM con el modal de alta
 * abierto sobre la pestaña Usuarios, igual que en el flujo real. Al abrirse
 * fuera del recorrido, el ABM pregunta primero con qué rol verla (solo roles
 * con permiso de carga de usuarios).
 */
export function AltaUsuarioDemo() {
  return <AbmDemo initialAltaUsuario />;
}
