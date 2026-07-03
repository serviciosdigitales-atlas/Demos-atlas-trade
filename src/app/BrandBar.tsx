import type { ReactNode } from "react";
import { Link } from "react-router";

/**
 * Barra de identificación persistente que va arriba de TODAS las pantallas
 * de demo. Deja en claro que lo que se ve es el **catálogo de demos** de Atlas
 * Trade (mockups / pruebas de concepto), no la aplicación real, para que no
 * preste a confusión. El monograma "AT" vuelve a la galería.
 *
 * `right` permite inyectar contenido contextual (título del demo, controles
 * del recorrido, etc.) alineado a la derecha.
 */
export function BrandBar({ right }: { right?: ReactNode }) {
  return (
    <div className="sticky top-0 z-20 flex h-11 shrink-0 items-center gap-3 border-b bg-atlas-primary px-4 text-white">
      <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
        <span className="flex size-7 items-center justify-center rounded-md bg-white/15 font-heading text-xs font-semibold">
          AT
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-sm font-semibold">Atlas Trade</span>
          <span className="text-[10px] font-medium tracking-wide text-white/70 uppercase">
            Catálogo de demos
          </span>
        </span>
      </Link>
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  );
}
