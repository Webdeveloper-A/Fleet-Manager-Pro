import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateVehicle, getListVehiclesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import {
  VehicleFormFields,
  emptyVehicle,
  type VehicleFormState,
} from "@/components/VehicleFormFields";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function toVehiclePayload(state: VehicleFormState) {
  const hasTrailer = Boolean(state.hasTrailer);

  return {
    name: state.name,
    plateNumber: state.plateNumber,
    vinCode: state.vinCode,
    year: Number(state.year),
    techPassportSeries: state.techPassportSeries || undefined,
    driverName: state.driverName || undefined,

    hasTrailer,
    trailerPlateNumber: hasTrailer ? state.trailerPlateNumber || undefined : undefined,
    trailerModel: hasTrailer ? state.trailerModel || undefined : undefined,
    trailerCapacityKg:
      hasTrailer && state.trailerCapacityKg ? Number(state.trailerCapacityKg) : undefined,
    trailerNote: hasTrailer ? state.trailerNote || undefined : undefined,
  };
}

export default function VehicleForm() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const create = useCreateVehicle();
  const [state, setState] = useState<VehicleFormState>(emptyVehicle);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await create.mutateAsync({
        data: toVehiclePayload(state) as never,
      });

      await qc.invalidateQueries({ queryKey: getListVehiclesQueryKey() });

      toast({
        title: "Vehicle added",
        description: `${res.name} is now in your fleet.`,
      });

      setLocation(`/vehicles/${res.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save vehicle";

      toast({
        title: "Save failed",
        description: message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLocation("/vehicles")}
        className="mb-2 -ml-2"
        data-testid="button-back"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to vehicles
      </Button>

      <PageHeader title="Add vehicle" description="Register a new asset in your fleet roster." />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <VehicleFormFields state={state} onChange={setState} />

            <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLocation("/vehicles")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>

              <Button type="submit" disabled={create.isPending} data-testid="button-save-vehicle">
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save vehicle"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}