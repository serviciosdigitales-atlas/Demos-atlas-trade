import { HashRouter, Route, Routes } from "react-router";

import { demos } from "@/demos/registry";
import { DemoLayout } from "@/app/DemoLayout";
import { Gallery } from "@/app/Gallery";

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Gallery />} />
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
