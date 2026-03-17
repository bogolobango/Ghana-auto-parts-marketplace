import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface VehicleFilter {
  year: string;
  make: string;
  model: string;
}

interface VehicleContextType {
  vehicle: VehicleFilter;
  setVehicle: (v: Partial<VehicleFilter>) => void;
  clearVehicle: () => void;
  hasVehicle: boolean;
}

const EMPTY: VehicleFilter = { year: "", make: "", model: "" };

const VehicleContext = createContext<VehicleContextType>({
  vehicle: EMPTY,
  setVehicle: () => {},
  clearVehicle: () => {},
  hasVehicle: false,
});

export function VehicleProvider({ children }: { children: ReactNode }) {
  const [vehicle, setVehicleState] = useState<VehicleFilter>(() => {
    try {
      const stored = localStorage.getItem("voom_vehicle");
      return stored ? JSON.parse(stored) : EMPTY;
    } catch {
      return EMPTY;
    }
  });

  const setVehicle = useCallback((v: Partial<VehicleFilter>) => {
    setVehicleState((prev) => {
      const next = { ...prev, ...v };
      // Reset dependent fields when parent changes
      if (v.make !== undefined && v.make !== prev.make) {
        next.model = "";
      }
      if (v.year !== undefined && v.year !== prev.year) {
        // Year change doesn't reset make/model
      }
      localStorage.setItem("voom_vehicle", JSON.stringify(next));
      return next;
    });
  }, []);

  const clearVehicle = useCallback(() => {
    setVehicleState(EMPTY);
    localStorage.removeItem("voom_vehicle");
  }, []);

  const hasVehicle = !!(vehicle.year || vehicle.make || vehicle.model);

  return (
    <VehicleContext.Provider value={{ vehicle, setVehicle, clearVehicle, hasVehicle }}>
      {children}
    </VehicleContext.Provider>
  );
}

export function useVehicle() {
  return useContext(VehicleContext);
}
