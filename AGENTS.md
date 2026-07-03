# Demos · Atlas Trade — Instrucciones del agente

Catálogo de **demos, mockups y pruebas de concepto** de Atlas Trade. Cada demo es una
pantalla interactiva construida con el **mismo sistema de diseño** que el front real.
Stack: React 19 + Vite + Tailwind v4 + shadcn (estilo del front) + React Router
(`HashRouter`), publicado en GitHub Pages.

## ⭐ Referencia obligatoria: `atlas-trade-front`

**Siempre** tomá como referencia el estado actual del proyecto real en
[`C:\repo\atlas-trade-front`](file:///C:/repo/atlas-trade-front) al crear o ajustar un
demo. Ese repo es la fuente de verdad de:

- **Pantallas y flujos reales** (ej. login → home/dashboard → módulos). Antes de recrear
  una pantalla acá, leé su equivalente en `atlas-trade-front/app/modules/*` y
  `app/components/layout/*` (`AppShell`, `AppSidebar`, `Header`, `UserNav`).
- **Sistema de diseño**: tokens de marca (`app/app.css`), componentes `components/ui/*`,
  y convenciones de Tailwind. Copiá lo más fiel posible.
- **Colores de marca Atlas** (`--color-atlas-primary`, etc.) — ya espejados en
  `src/app.css`.

Si una pantalla del front real cambió, actualizá el demo correspondiente para que siga
reflejándola.

## Cómo agregar un demo

1. Creá el componente en `src/demos/<carpeta>/<Nombre>Demo.tsx` (podés pegar casi tal cual
   una pantalla de `atlas-trade-front`; el alias `@/`, los `@/components/ui/*` y los tokens
   de color funcionan igual).
2. Registralo en `src/demos/registry.tsx` (array `demos`). La galería y las rutas se
   generan solas.

## Probar plataforma (recorrido)

La home separa **"Visualizar componentes individuales"** (grilla de demos sueltos) de
**"Probar plataforma"** (recorrido encadenado, `#/recorrido`).
`src/demos/registry.tsx` exporta `guidedTour`: el orden encadenado de pantallas
(`#/recorrido`). Los demos usan `useDemoFlow()` (`src/app/flow.tsx`) para avanzar con el
botón correspondiente cuando corren dentro del recorrido, y conservan su comportamiento
individual fuera de él. Para sumar un paso, agregá su slug a `guidedTour` y hacé que la
acción principal del demo llame a `flow.advance()`.

## Convenciones

- Responder en **español**.
- Cambios mínimos y alineados con las convenciones del repo.
- Toda pantalla de demo lleva arriba la barra de marca (`BrandBar`) para no confundirla
  con la app real.
- No commitear ni pushear sin que el usuario lo pida explícitamente.

## Comandos

```bash
pnpm dev          # http://localhost:3001
pnpm build        # genera ./dist (lo que se publica)
pnpm preview      # sirve el build de producción
pnpm typecheck    # chequeo de tipos
```
