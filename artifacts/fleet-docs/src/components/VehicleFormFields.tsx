import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type VehicleFormState = {
  name: string;
  plateNumber: string;
  vinCode: string;
  year: string;
  techPassportSeries: string;
  driverName: string;

  hasTrailer: boolean;
  trailerPlateNumber: string;
  trailerModel: string;
  trailerCapacityKg: string;
  trailerNote: string;
};

export const emptyVehicle: VehicleFormState = {
  name: "",
  plateNumber: "",
  vinCode: "",
  year: String(new Date().getFullYear()),
  techPassportSeries: "",
  driverName: "",

  hasTrailer: false,
  trailerPlateNumber: "",
  trailerModel: "",
  trailerCapacityKg: "",
  trailerNote: "",
};

export function VehicleFormFields({
  state,
  onChange,
}: {
  state: VehicleFormState;
  onChange: (next: VehicleFormState) => void;
}) {
  function set<K extends keyof VehicleFormState>(key: K, value: VehicleFormState[K]) {
    onChange({ ...state, [key]: value });
  }

  function toggleTrailer(checked: boolean) {
    onChange({
      ...state,
      hasTrailer: checked,
      trailerPlateNumber: checked ? state.trailerPlateNumber : "",
      trailerModel: checked ? state.trailerModel : "",
      trailerCapacityKg: checked ? state.trailerCapacityKg : "",
      trailerNote: checked ? state.trailerNote : "",
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="name">Vehicle name</Label>
        <Input
          id="name"
          required
          value={state.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="MAN TGS Tractor"
          data-testid="input-vehicle-name"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="plate">Plate number</Label>
        <Input
          id="plate"
          required
          value={state.plateNumber}
          onChange={(e) => set("plateNumber", e.target.value)}
          placeholder="01 A 123 BC"
          data-testid="input-vehicle-plate"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="vin">VIN code</Label>
        <Input
          id="vin"
          required
          value={state.vinCode}
          onChange={(e) => set("vinCode", e.target.value)}
          placeholder="WMAN1234567890XYZ"
          data-testid="input-vehicle-vin"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="year">Year</Label>
        <Input
          id="year"
          type="number"
          required
          min={1950}
          max={2100}
          value={state.year}
          onChange={(e) => set("year", e.target.value)}
          data-testid="input-vehicle-year"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tech">Tech passport series</Label>
        <Input
          id="tech"
          value={state.techPassportSeries}
          onChange={(e) => set("techPassportSeries", e.target.value)}
          placeholder="AAB 7820"
          data-testid="input-vehicle-tech"
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="driver">Driver name</Label>
        <Input
          id="driver"
          value={state.driverName}
          onChange={(e) => set("driverName", e.target.value)}
          placeholder="Bekzod Karimov"
          data-testid="input-vehicle-driver"
        />
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/20 p-4 sm:col-span-2">
        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={state.hasTrailer}
            onChange={(e) => toggleTrailer(e.target.checked)}
            className="h-4 w-4 rounded border-border"
            data-testid="checkbox-has-trailer"
          />
          Pritsepi bor
        </label>

        {state.hasTrailer ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="trailerPlate">Pritsep davlat raqami</Label>
              <Input
                id="trailerPlate"
                value={state.trailerPlateNumber}
                onChange={(e) => set("trailerPlateNumber", e.target.value)}
                placeholder="01 T 456 AB"
                data-testid="input-trailer-plate"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trailerModel">Pritsep modeli/turi</Label>
              <Input
                id="trailerModel"
                value={state.trailerModel}
                onChange={(e) => set("trailerModel", e.target.value)}
                placeholder="Schmitz Cargobull"
                data-testid="input-trailer-model"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trailerCapacity">Yuk sig‘imi, kg</Label>
              <Input
                id="trailerCapacity"
                type="number"
                min={0}
                value={state.trailerCapacityKg}
                onChange={(e) => set("trailerCapacityKg", e.target.value)}
                placeholder="24000"
                data-testid="input-trailer-capacity"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trailerNote">Izoh</Label>
              <Input
                id="trailerNote"
                value={state.trailerNote}
                onChange={(e) => set("trailerNote", e.target.value)}
                placeholder="Tentli pritsep"
                data-testid="input-trailer-note"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}