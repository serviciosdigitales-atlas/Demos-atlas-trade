import { useState } from "react";
import {
  ArrowRight,
  HomeIcon,
  LogOut,
  PanelLeft,
  UserPlus,
} from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useDemoFlow } from "@/app/flow";

/**
 * Dashboard del home al que se ingresa después del login. Replica el AppShell
 * real de `atlas-trade-front` (sidebar colapsable + header + contenido) de
 * forma autocontenida. El contenido central espeja `modules/home/routes/page`.
 *
 * Los accesos ("Alta de usuario") funcionan de dos maneras:
 *  - En el recorrido guiado (`useDemoFlow`): avanzan a la siguiente pantalla.
 *  - Individual: enlazan al demo correspondiente de la galería.
 */
export function HomeDashboardDemo() {
  const flow = useDemoFlow();
  const [collapsed, setCollapsed] = useState(false);

  // En el recorrido, el acceso a "Alta de usuario" avanza el flujo.
  const goAlta = flow ? { onClick: flow.advance } : { to: "/demos/alta-usuario" };

  return (
    <div className="flex min-h-[calc(100vh-85px)] w-full bg-background">
      {/* ---------- Sidebar ---------- */}
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200",
          collapsed ? "w-14" : "w-60"
        )}
      >
        <div className="flex h-14 items-center justify-center border-b border-sidebar-border px-2">
          <span className="text-sm font-bold">{collapsed ? "AT" : "Atlas Trade"}</span>
        </div>

        <nav className="flex-1 p-2">
          <p
            className={cn(
              "px-2 pb-1 text-xs font-medium text-muted-foreground",
              collapsed && "sr-only"
            )}
          >
            Navegación
          </p>
          <ul className="flex flex-col gap-1">
            <li>
              <span
                className={cn(
                  "flex items-center gap-2 rounded-md bg-sidebar-accent px-2 py-2 text-sm font-medium text-sidebar-accent-foreground",
                  collapsed && "justify-center"
                )}
              >
                <HomeIcon className="size-4 shrink-0" />
                {!collapsed && "Inicio"}
              </span>
            </li>
            <li>
              <NavAccess collapsed={collapsed} icon={<UserPlus className="size-4 shrink-0" />} {...goAlta}>
                Alta de usuario
              </NavAccess>
            </li>
          </ul>
        </nav>

        {/* Usuario */}
        <div className="border-t border-sidebar-border p-2">
          <div
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5",
              collapsed && "justify-center"
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
              CV
            </span>
            {!collapsed && (
              <div className="grid flex-1 leading-tight">
                <span className="truncate text-sm font-semibold">Carla Villalba</span>
                <span className="truncate text-xs text-muted-foreground">
                  carla.villalba@atlas.com
                </span>
              </div>
            )}
            {!collapsed && (
              <button
                type="button"
                onClick={() => toast.info("Cerrar sesión (demo)")}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Cerrar sesión"
              >
                <LogOut className="size-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ---------- Contenido ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Contraer menú"
          >
            <PanelLeft className="size-4" />
          </button>
          <div className="mx-1 h-4 w-px bg-border" />
          <span className="text-sm font-medium text-muted-foreground">Inicio</span>
        </header>

        <main className="flex flex-1 flex-col gap-10 p-4">
          {/* Espejo del home real */}
          <div className="flex flex-col items-center justify-center gap-6 py-12">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-atlas-primary font-heading text-2xl font-semibold text-white">
              AT
            </div>
            <div className="text-center">
              <h1 className="font-heading text-3xl font-bold text-atlas-primary">Atlas Trade</h1>
              <p className="mt-2 text-muted-foreground">Portal de Confirming · Banco Atlas</p>
            </div>
          </div>

          {/* Accesos directos (extra del demo para navegar el catálogo) */}
          <div className="mx-auto w-full max-w-3xl">
            <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Accesos directos
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <NavAccess
                asCard
                icon={<UserPlus className="size-5 text-atlas-primary" />}
                title="Alta de usuario (ABM)"
                description="Alta con permisos por dominio, búsqueda AD y validación."
                {...goAlta}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Acceso que se comporta como enlace (individual) o como botón que avanza el
 * recorrido, según se le pase `to` u `onClick`. Renderiza como ítem de nav o
 * como tarjeta (`asCard`).
 */
function NavAccess({
  collapsed,
  icon,
  children,
  title,
  description,
  asCard,
  to,
  onClick,
}: {
  collapsed?: boolean;
  icon: React.ReactNode;
  children?: React.ReactNode;
  title?: string;
  description?: string;
  asCard?: boolean;
  to?: string;
  onClick?: () => void;
}) {
  const content = asCard ? (
    <Card className="h-full cursor-pointer transition-shadow hover:ring-atlas-primary/30 hover:shadow-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-atlas-primary/10">
            {icon}
          </span>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription className="mt-2">{description}</CardDescription>
        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-atlas-primary">
          Abrir
          <ArrowRight className="size-3.5" />
        </div>
      </CardHeader>
    </Card>
  ) : (
    <span
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center"
      )}
    >
      {icon}
      {!collapsed && children}
    </span>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left">
        {content}
      </button>
    );
  }
  return (
    <Link to={to ?? "/"} className="block">
      {content}
    </Link>
  );
}
