import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Database,
  HomeIcon,
  LogOut,
  PanelLeft,
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

type NavItem = "home" | "abm";

export function PlatformShellDemo({
  activeNav,
  headerTitle,
  children,
}: {
  activeNav: NavItem;
  headerTitle: string;
  children: ReactNode;
}) {
  const flow = useDemoFlow();
  const [collapsed, setCollapsed] = useState(false);

  const goAbm =
    activeNav === "abm"
      ? {}
      : flow
        ? { onClick: flow.advance }
        : { to: "/demos/abm" };

  return (
    <div className="flex min-h-[calc(100vh-85px)] w-full bg-background">
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
              <NavAccess
                collapsed={collapsed}
                icon={<HomeIcon className="size-4 shrink-0" />}
                active={activeNav === "home"}
                {...(flow ? {} : { to: "/demos/home" })}
              >
                Inicio
              </NavAccess>
            </li>
            <li>
              <NavAccess
                collapsed={collapsed}
                icon={<Database className="size-4 shrink-0" />}
                active={activeNav === "abm"}
                {...goAbm}
              >
                ABM
              </NavAccess>
            </li>
          </ul>
        </nav>

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
          <span className="text-sm font-medium text-muted-foreground">{headerTitle}</span>
        </header>

        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

/** Tarjeta de acceso directo reutilizable en el home. */
export function PlatformAccessCard({
  icon,
  title,
  description,
  to,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  to?: string;
  onClick?: () => void;
}) {
  return (
    <NavAccess asCard icon={icon} title={title} description={description} to={to} onClick={onClick} />
  );
}

function NavAccess({
  collapsed,
  icon,
  children,
  title,
  description,
  asCard,
  active,
  to,
  onClick,
}: {
  collapsed?: boolean;
  icon: ReactNode;
  children?: ReactNode;
  title?: string;
  description?: string;
  asCard?: boolean;
  active?: boolean;
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
        "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
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
  if (to) {
    return (
      <Link to={to} className="block">
        {content}
      </Link>
    );
  }
  return <div className="block">{content}</div>;
}
