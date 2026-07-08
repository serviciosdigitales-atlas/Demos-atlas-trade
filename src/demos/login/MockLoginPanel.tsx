import { FlaskConical } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import selectorData from "../../../mock-data/login/mock-selector-dominio-roles.json";

const domainRoles = selectorData as Record<string, string[]>;

/**
 * Réplica del `MockLoginPanel` del front real: toggle "Modo Mock" + selector
 * dominio/rol. En el front real el estado vive en `useMockStore` (zustand);
 * acá lo maneja el demo por props.
 */
export function MockLoginPanel({
  enabled,
  role,
  onEnabledChange,
  onRoleChange,
}: {
  enabled: boolean;
  role: string | null;
  onEnabledChange: (enabled: boolean) => void;
  onRoleChange: (role: string | null) => void;
}) {
  return (
    <div className="absolute top-3 right-3 z-30 flex flex-col items-end gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 shadow-sm">
        <FlaskConical className="h-4 w-4 text-amber-600" />
        <Label
          htmlFor="mock-toggle"
          className="cursor-pointer text-xs font-medium text-amber-700 select-none"
        >
          Modo Mock
        </Label>
        {/* Toggle switch — implementación nativa, igual que en el front real */}
        <button
          id="mock-toggle"
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onEnabledChange(!enabled)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 ${
            enabled ? "bg-amber-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`pointer-events-none mt-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              enabled ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="w-56 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 shadow-sm">
          <Label className="mb-1 block text-xs font-medium text-amber-700">Dominio / Rol</Label>
          <Select value={role ?? ""} onValueChange={(val) => onRoleChange(val || null)}>
            <SelectTrigger className="h-8 w-full bg-white text-xs">
              <SelectValue placeholder="Seleccionar rol..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(domainRoles).map(([domain, roles]) => (
                <SelectGroup key={domain}>
                  <SelectLabel className="text-[10px] uppercase tracking-wide">
                    {domain}
                  </SelectLabel>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {r}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
