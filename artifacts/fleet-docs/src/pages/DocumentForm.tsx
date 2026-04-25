import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateDocument,
  getListDocumentsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetVehicleQueryKey,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DocumentFormFields,
  emptyDocument,
  type DocumentFormState,
} from "@/components/DocumentFormFields";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function DocumentForm() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  // Allow ?vehicleId=… prefill when navigating from a vehicle detail page.
  const initialVehicleId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("vehicleId") ?? "";
  }, []);

  const [state, setState] = useState<DocumentFormState>(emptyDocument(initialVehicleId));
  const create = useCreateDocument();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!state.vehicleId) {
      toast({ title: "Choose a vehicle", variant: "destructive" });
      return;
    }
    try {
      const res = await create.mutateAsync({
        data: {
          vehicleId: state.vehicleId,
          name: state.name,
          number: state.number,
          startDate: new Date(state.startDate).toISOString(),
          endDate: new Date(state.endDate).toISOString(),
          note: state.note || undefined,
          fileUrl: state.fileUrl ?? undefined,
          fileName: state.fileName ?? undefined,
        },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: getListDocumentsQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetVehicleQueryKey(state.vehicleId) }),
      ]);
      toast({ title: "Document added", description: res.name });
      setLocation("/documents");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save document";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLocation("/documents")}
        className="mb-2 -ml-2"
        data-testid="button-back"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to documents
      </Button>
      <PageHeader title="Add document" description="Track a permit, insurance, or inspection." />
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <DocumentFormFields state={state} onChange={setState} />
            <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLocation("/documents")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending} data-testid="button-save-document">
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save document"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
