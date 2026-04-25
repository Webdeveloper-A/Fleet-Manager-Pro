import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type VehicleFormState = {
  name: string;
  plateNumber: string;
  vinCode: string;
  year: string;
  techPassportSeries: string;
  driverName: string;
};

export const emptyVehicle: VehicleFormState = {
  name: "",
  plateNumber: "",
  vinCode: "",
  year: String(new Date().getFullYear()),
  techPassportSeries: "",
  driverName: "",
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

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 space-y-1.5">
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
      <div className="sm:col-span-2 space-y-1.5">
        <Label htmlFor="driver">Driver name</Label>
        <Input
          id="driver"
          value={state.driverName}
          onChange={(e) => set("driverName", e.target.value)}
          placeholder="Bekzod Karimov"
          data-testid="input-vehicle-driver"
        />
      </div>
    </div>
  );
}
