import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { VEHICLE_MAKES } from "@shared/marketplace";
import { useVehicle } from "@/contexts/VehicleContext";
import { Search, X } from "lucide-react";

const YEARS = Array.from({ length: 30 }, (_, i) => String(2026 - i));

interface VehicleSearchProps {
  onSearch: (filters: { year?: string; make?: string; model?: string }) => void;
  variant?: "hero" | "compact";
}

export default function VehicleSearch({ onSearch, variant = "hero" }: VehicleSearchProps) {
  const { vehicle, setVehicle, clearVehicle, hasVehicle } = useVehicle();
  const models = trpc.product.models.useQuery(
    { make: vehicle.make },
    { enabled: !!vehicle.make }
  );

  const isHero = variant === "hero";

  return (
    <div className={isHero ? "space-y-4" : "flex items-center gap-3 flex-wrap"}>
      <div className={isHero ? "grid grid-cols-3 gap-3" : "flex items-center gap-2 flex-wrap"}>
        {/* Year */}
        <Select value={vehicle.year} onValueChange={(v) => setVehicle({ year: v })}>
          <SelectTrigger className={isHero
            ? "h-13 rounded-2xl bg-white/90 border-white/30 backdrop-blur-xl shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)] tracking-wide"
            : "h-10 rounded-2xl w-[100px]"
          }>
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Make */}
        <Select value={vehicle.make} onValueChange={(v) => setVehicle({ make: v })}>
          <SelectTrigger className={isHero
            ? "h-13 rounded-2xl bg-white/90 border-white/30 backdrop-blur-xl shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)] tracking-wide"
            : "h-10 rounded-2xl w-[140px]"
          }>
            <SelectValue placeholder="Make" />
          </SelectTrigger>
          <SelectContent>
            {VEHICLE_MAKES.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Model */}
        <Select
          value={vehicle.model}
          onValueChange={(v) => setVehicle({ model: v })}
          disabled={!vehicle.make}
        >
          <SelectTrigger className={isHero
            ? "h-13 rounded-2xl bg-white/90 border-white/30 backdrop-blur-xl shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)] tracking-wide"
            : "h-10 rounded-2xl w-[140px]"
          }>
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            {(models.data || []).map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={isHero ? "flex gap-3" : "flex gap-2"}>
        <Button
          size={isHero ? "lg" : "default"}
          className={isHero
            ? "h-13 px-8 bg-primary/90 hover:bg-primary text-white rounded-[100px] shadow-[0_8px_32px_-6px_rgba(0,0,0,0.15)]"
            : "h-10 rounded-full"
          }
          disabled={!vehicle.make}
          onClick={() => onSearch({
            year: vehicle.year || undefined,
            make: vehicle.make || undefined,
            model: vehicle.model || undefined,
          })}
        >
          <Search className="h-4 w-4 mr-2" />
          Find Parts
        </Button>
        {hasVehicle && (
          <Button
            variant="ghost"
            size={isHero ? "lg" : "default"}
            className={isHero
              ? "h-13 text-white/70 hover:text-white hover:bg-white/10 rounded-[100px]"
              : "h-10 rounded-full text-muted-foreground"
            }
            onClick={() => { clearVehicle(); onSearch({}); }}
          >
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
