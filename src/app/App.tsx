import { HashRouter, Route, Routes } from "react-router";

import { demos } from "@/demos/registry";
import { DemoLayout } from "@/app/DemoLayout";
import { Gallery } from "@/app/Gallery";
import { GuidedTour } from "@/app/GuidedTour";

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Gallery />} />
        {/* Modo demo guiado: encadena las pantallas (#/recorrido) */}
        <Route path="/recorrido" element={<GuidedTour />} />
        {demos.map((demo) => {
          const Component = demo.component;
          return (
            <Route
              key={demo.slug}
              path={`/demos/${demo.slug}`}
              element={
                <DemoLayout demo={demo}>
                  <Component />
                </DemoLayout>
              }
            />
          );
        })}
        {/* Cualquier ruta desconocida vuelve a la galería */}
        <Route path="*" element={<Gallery />} />
      </Routes>
    </HashRouter>
  );
}
