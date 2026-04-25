import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
  getGetVehicleQueryKey,
  getListVehiclesQueryKey,
  getListDocumentsQueryKey,
  getGetDashboardSummaryQueryKey,
  type Document,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill, type StatusKind } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Paperclip,
  Truck,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import {
  VehicleFormFields,
  type VehicleFormState,
} from "@/components/VehicleFormFields";
import {
  DocumentFormFields,
  emptyDocument,
  type DocumentFormState,
} from "@/components/DocumentFormFields";

export default function VehicleDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id!;
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data, isLoading } = useGetVehicle(id, {
    query: { enabled: !!id, queryKey: getGetVehicleQueryKey(id) },
  });

  const update = useUpdateVehicle();
  const remove = useDeleteVehicle();
  const createDoc = useCreateDocument();
  const updateDoc = useUpdateDocument();
  const deleteDoc = useDeleteDocument();

  const [editOpen, setEditOpen] = useState(false);
  const [editState, setEditState] = useState<VehicleFormState | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [docDialog, setDocDialog] = useState<{ mode: "create" | "edit"; doc?: Document } | null>(
    null,
  );
  const [docState, setDocState] = useState<DocumentFormState | null>(null);
  const [deleteDoc_, setDeleteDoc_] = useState<Document | null>(null);

  useEffect(() => {
    if (data && !editState) {
      setEditState({
        name: data.name,
        plateNumber: data.plateNumber,
        vinCode: data.vinCode,
        year: String(data.year),
        techPassportSeries: data.techPassportSeries ?? "",
        driverName: data.driverName ?? "",
      });
    }
  }, [data, editState]);

  async function handleVehicleEdit() {
    if (!editState) return;
    try {
      await update.mutateAsync({
        id,
        data: {
          name: editState.name,
          plateNumber: editState.plateNumber,
          vinCode: editState.vinCode,
          year: Number(editState.year),
          techPassportSeries: editState.techPassportSeries || undefined,
          driverName: editState.driverName || undefined,
        },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: getGetVehicleQueryKey(id) }),
        qc.invalidateQueries({ queryKey: getListVehiclesQueryKey() }),
      ]);
      toast({ title: "Vehicle updated" });
      setEditOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    }
  }

  async function handleVehicleDelete() {
    try {
      await remove.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
      toast({ title: "Vehicle deleted" });
      setLocation("/vehicles");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast({ title: "Delete failed", description: message, variant: "destructive" });
    }
  }

  function openCreateDoc() {
    setDocDialog({ mode: "create" });
    setDocState(emptyDocument(id));
  }

  function openEditDoc(doc: Document) {
    setDocDialog({ mode: "edit", doc });
    setDocState({
      vehicleId: doc.vehicleId,
      name: doc.name,
      number: doc.number,
      startDate: new Date(doc.startDate).toISOString().slice(0, 10),
      endDate: new Date(doc.endDate).toISOString().slice(0, 10),
      note: doc.note ?? "",
      fileUrl: doc.fileUrl ?? null,
      fileName: doc.fileName ?? null,
    });
  }

  async function handleDocSave() {
    if (!docDialog || !docState) return;
    try {
      if (docDialog.mode === "create") {
        await createDoc.mutateAsync({
          data: {
            vehicleId: docState.vehicleId,
            name: docState.name,
            number: docState.number,
            startDate: new Date(docState.startDate).toISOString(),
            endDate: new Date(docState.endDate).toISOString(),
            note: docState.note || undefined,
            fileUrl: docState.fileUrl ?? undefined,
            fileName: docState.fileName ?? undefined,
          },
        });
      } else if (docDialog.doc) {
        await updateDoc.mutateAsync({
          id: docDialog.doc.id,
          data: {
            name: docState.name,
            number: docState.number,
            startDate: new Date(docState.startDate).toISOString(),
            endDate: new Date(docState.endDate).toISOString(),
            note: docState.note || undefined,
            fileUrl: docState.fileUrl ?? undefined,
            fileName: docState.fileName ?? undefined,
          },
        });
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: getGetVehicleQueryKey(id) }),
        qc.invalidateQueries({ queryKey: getListDocumentsQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
      ]);
      toast({ title: docDialog.mode === "create" ? "Document added" : "Document updated" });
      setDocDialog(null);
      setDocState(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    }
  }

  async function handleDocDelete() {
    if (!deleteDoc_) return;
    try {
      await deleteDoc.mutateAsync({ id: deleteDoc_.id });
      await Promise.all([
        qc.invalidateQueries({ queryKey: getGetVehicleQueryKey(id) }),
        qc.invalidateQueries({ queryKey: getListDocumentsQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
      ]);
      toast({ title: "Document deleted" });
      setDeleteDoc_(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast({ title: "Delete failed", description: message, variant: "destructive" });
    }
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const docs = data.documents ?? [];

  return (
    <div>
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

      <PageHeader
        title={data.name}
        description={`${data.plateNumber} • ${data.year}`}
        actions={
          <>
            <StatusPill status={(data.worstStatus ?? "none") as StatusKind} size="md" />
            <Button variant="outline" onClick={() => setEditOpen(true)} data-testid="button-edit-vehicle">
              <Pencil className="mr-1 h-4 w-4" /> Edit
            </Button>
            <Button
              variant="outline"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => setDeleteOpen(true)}
              data-testid="button-delete-vehicle"
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Plate", value: data.plateNumber, mono: true },
            { label: "VIN", value: data.vinCode, mono: true },
            { label: "Year", value: String(data.year) },
            { label: "Tech passport", value: data.techPassportSeries || "—" },
            { label: "Driver", value: data.driverName || "—" },
            { label: "Documents", value: String(data.documentCount ?? 0) },
            {
              label: "Next expiry",
              value: data.nextExpiryAt
                ? format(new Date(data.nextExpiryAt), "MMM d, yyyy")
                : "—",
            },
            {
              label: "Added",
              value: format(new Date(data.createdAt), "MMM d, yyyy"),
            },
          ].map((field) => (
            <div key={field.label}>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {field.label}
              </p>
              <p
                className={
                  field.mono
                    ? "mt-0.5 font-mono text-sm text-foreground"
                    : "mt-0.5 text-sm text-foreground"
                }
              >
                {field.value}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Documents</CardTitle>
          <Button onClick={openCreateDoc} data-testid="button-add-document-here">
            <Plus className="mr-1 h-4 w-4" />
            Add document
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {docs.length === 0 ? (
            <div className="px-6 pb-6 pt-2 text-center text-sm text-muted-foreground">
              <Truck className="mx-auto mb-3 h-6 w-6 text-muted-foreground/60" />
              No documents tracked for this vehicle yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Name</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Valid through</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d, i) => (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border/60"
                    data-testid={`row-doc-${d.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        {d.name}
                        {d.fileUrl ? (
                          <Link
                            href={`/api/storage${d.fileUrl}`}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Paperclip className="h-3 w-3" />
                          </Link>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {d.number}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(d.endDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={d.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDoc(d)}
                        data-testid={`button-edit-doc-${d.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteDoc_(d)}
                        data-testid={`button-delete-doc-${d.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit vehicle</DialogTitle>
          </DialogHeader>
          {editState ? (
            <VehicleFormFields state={editState} onChange={setEditState} />
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleVehicleEdit} disabled={update.isPending}>
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              {data.name} and all of its documents ({data.documentCount ?? 0}) will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-600/90"
              onClick={handleVehicleDelete}
            >
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!docDialog} onOpenChange={(o) => !o && (setDocDialog(null), setDocState(null))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {docDialog?.mode === "create" ? "Add document" : "Edit document"}
            </DialogTitle>
          </DialogHeader>
          {docState ? (
            <DocumentFormFields state={docState} onChange={setDocState} lockVehicle />
          ) : null}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDocDialog(null);
                setDocState(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDocSave}
              disabled={createDoc.isPending || updateDoc.isPending}
            >
              {createDoc.isPending || updateDoc.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDoc_} onOpenChange={(o) => !o && setDeleteDoc_(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDoc_?.name} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-600/90" onClick={handleDocDelete}>
              {deleteDoc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
