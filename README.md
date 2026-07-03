# Demos · Atlas Trade

Catálogo de **demos, mockups y pruebas de concepto** de Atlas Trade. Cada demo es una
pantalla o formulario interactivo construido con el **mismo sistema de diseño** que el
front real ([`atlas-trade-front`](../atlas-trade-front)): React 19 + Tailwind v4 + shadcn
(estilo `radix-nova`) y los colores de marca Atlas.

El objetivo es que sea **fácil de editar**: agregar una pantalla o cambiar un formulario
debería tomar minutos, y el sitio se publica solo en GitHub Pages en cada push a `main`.

## 🌐 Sitio publicado

<https://serviciosdigitales-atlas.github.io/Demos-atlas-trade/>

## 🚀 Desarrollo local

```bash
pnpm install
pnpm dev          # http://localhost:3001
pnpm build        # genera ./dist (lo mismo que se publica)
pnpm preview      # sirve el build de producción
pnpm typecheck    # chequeo de tipos
```

## ➕ Cómo agregar un demo

1. Creá el componente en `src/demos/<carpeta>/<Nombre>Demo.tsx`. Podés **pegar casi tal
   cual** una pantalla del front real: los componentes `@/components/ui/*`, el alias `@/`
   y los tokens de color (`bg-atlas-primary`, etc.) funcionan igual.
2. Registralo en `src/demos/registry.tsx` agregando una línea al array `demos`:

   ```tsx
   {
     slug: "mi-demo",              // URL: #/demos/mi-demo
     title: "Mi demo",
     description: "Qué muestra este demo.",
     category: "Operaciones",      // agrupa en la galería
     status: "en-progreso",        // borrador | en-progreso | listo
     component: MiDemo,
   }
   ```

La galería (home) y las rutas se generan automáticamente desde ese registro. No hay que
tocar el router.

## 🧭 Enrutamiento

Se usa **HashRouter** (`#/demos/...`) para que los deep links y los refrescos de página
funcionen en GitHub Pages sin configuración de servidor.

## 📁 Estructura

```
src/
  app/
    App.tsx          # router: galería + una ruta por demo (desde el registry)
    Gallery.tsx      # home con las tarjetas de demos
    DemoLayout.tsx   # barra superior "← Galería" que envuelve cada demo
  components/ui/     # componentes shadcn espejados del front real
                     # (button, card, input, label, select, dialog)
  demos/
    registry.tsx     # ← el array de demos (fuente de verdad)
    login/
    alta-usuario/    # ABM usuarios (MAGIA-47): permisos por dominio, AD, validación
  lib/utils.ts       # cn()
  app.css            # tokens de marca Atlas (espejo de atlas-trade-front)
```

## ☁️ Publicación

`.github/workflows/deploy.yml` compila y publica `./dist` en GitHub Pages en cada push a
`main`. Requiere activar **Settings → Pages → Source: GitHub Actions** una sola vez en el
repositorio.
