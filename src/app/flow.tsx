import { createContext, useContext } from "react";

/**
 * Contexto del "modo demo guiado" (recorrido).
 *
 * Cuando un demo se renderiza dentro del recorrido encadenado
 * (`GuidedTour`), este contexto está presente y expone `advance()` para
 * pasar a la siguiente pantalla. Cuando el mismo demo se abre de forma
 * individual desde la galería, el contexto es `null` y el demo conserva su
 * comportamiento aislado (por ejemplo, mostrar un toast).
 *
 * Uso dentro de un demo:
 *   const flow = useDemoFlow();
 *   if (flow) flow.advance();   // en recorrido → siguiente pantalla
 *   else toast.success(...);    // individual → comportamiento aislado
 */
export interface DemoFlowValue {
  /** Índice del paso actual (0-based). */
  stepIndex: number;
  /** Cantidad total de pasos del recorrido. */
  total: number;
  /** Etiqueta de la acción que avanza (ej. "Ir al inicio"). */
  nextLabel: string;
  /** Avanza a la siguiente pantalla del recorrido. */
  advance: () => void;
}

export const DemoFlowContext = createContext<DemoFlowValue | null>(null);

/** Devuelve el contexto del recorrido, o `null` si el demo está aislado. */
export function useDemoFlow(): DemoFlowValue | null {
  return useContext(DemoFlowContext);
}
