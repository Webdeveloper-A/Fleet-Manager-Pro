import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Paperclip, Loader2, X, FileText } from "lucide-react";
import {
  useListVehicles,
  useRequestUploadUrl,
  getListVehiclesQueryKey,
  type Vehicle,
} from "@workspace/api-client-react";
import { toast } from "@/hooks/use-toast";

export type DocumentFormState = {
  vehicleId: string;
  name: string;
  number: string;
  startDate: string;
  endDate: string;
  note: string;
  fileUrl: string | null;
  fileName: string | null;
};

export const emptyDocument = (vehicleId = ""): DocumentFormState => ({
  vehicleId,
  name: "",
  number: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  note: "",
  fileUrl: null,
  fileName: null,
});

export function DocumentFormFields({
  state,
  onChange,
  lockVehicle = false,
}: {
  state: DocumentFormState;
  onChange: (next: DocumentFormState) => void;
  lockVehicle?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const requestUpload = useRequestUploadUrl();

  const vehiclesQuery = useListVehicles(
    { pageSize: 100 },
    { query: { queryKey: getListVehiclesQueryKey({ pageSize: 100 }), enabled: !lockVehicle } },
  );
  const lockedVehiclesQuery = useListVehicles(
    { pageSize: 100 },
    { query: { queryKey: getListVehiclesQueryKey({ pageSize: 100 }), enabled: lockVehicle } },
  );
  const vehicles: Vehicle[] = lockVehicle
    ? lockedVehiclesQuery.data?.items ?? []
    : vehiclesQuery.data?.items ?? [];

  const lockedVehicleName = vehicles.find((v) => v.id === state.vehicleId)?.name;

  function set<K extends keyof DocumentFormState>(key: K, value: DocumentFormState[K]) {
    onChange({ ...state, [key]: value });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { uploadURL, objectPath } = await requestUpload.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type || "application/octet-stream" },
      });
      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`Upload failed (${putRes.status})`);
      }
      onChange({ ...state, fileUrl: objectPath, fileName: file.name });
      toast({ title: "File attached", description: file.name });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Upload failed", description: message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 space-y-1.5">
        <Label htmlFor="vehicleId">Vehicle</Label>
        {lockVehicle ? (
          <Input id="vehicleId" value={lockedVehicleName ?? ""} disabled readOnly />
        ) : (
          <Select
            value={state.vehicleId || undefined}
            onValueChange={(v) => set("vehicleId", v)}
          >
            <SelectTrigger id="vehicleId" data-testid="select-vehicle">
              <SelectValue placeholder="Choose a vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} • {v.plateNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="docName">Document name</Label>
        <Input
          id="docName"
          required
          value={state.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="OSAGO Insurance"
          data-testid="input-doc-name"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="docNumber">Document number</Label>
        <Input
          id="docNumber"
          required
          value={state.number}
          onChange={(e) => set("number", e.target.value)}
          placeholder="OSG-2024-77110"
          data-testid="input-doc-number"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="startDate">Start date</Label>
        <Input
          id="startDate"
          type="date"
          required
          value={state.startDate}
          onChange={(e) => set("startDate", e.target.value)}
          data-testid="input-doc-start"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="endDate">End date</Label>
        <Input
          id="endDate"
          type="date"
          required
          value={state.endDate}
          onChange={(e) => set("endDate", e.target.value)}
          data-testid="input-doc-end"
        />
      </div>
      <div className="sm:col-span-2 space-y-1.5">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea
          id="note"
          rows={3}
          value={state.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="Any context the team should know about this document"
          data-testid="input-doc-note"
        />
      </div>

      <div className="sm:col-span-2 space-y-1.5">
        <Label>Attachment (optional)</Label>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="application/pdf,image/*"
          onChange={handleFile}
        />
        {state.fileName ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <div className="flex items-center gap-2 truncate">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="truncate" data-testid="text-attached-filename">
                {state.fileName}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange({ ...state, fileUrl: null, fileName: null })}
              data-testid="button-remove-attachment"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            data-testid="button-upload-file"
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Uploading…" : "Attach a PDF or image"}
          </Button>
        )}
      </div>
    </div>
  );
}

