import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDocuments,
  useListVehicles,
  useUpdateDocument,
  useDeleteDocument,
  getListDocumentsQueryKey,
  getListVehiclesQueryKey,
  getGetDashboardSummaryQueryKey,
  type Document,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { EmptyState } from "@/components/EmptyState";
import { DataPagination } from "@/components/DataPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, Search, FileText, MoreHorizontal, Loader2, Paperclip } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  DocumentFormFields,
  type DocumentFormState,
} from "@/components/DocumentFormFields";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { downloadDocumentFile } from "@/lib/download-document-file";
import { downloadReport } from "@/lib/download-report";

const PAGE_SIZE = 15;

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function Documents() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput);
  const [status, setStatus] = useState<string>("all");
  const [vehicleId, setVehicleId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState<Document | null>(null);
  const token = useAuth((s) => s.token);

  useEffect(() => {
    setPage(1);
  }, [search, status, vehicleId]);

  const params = useMemo(
    () => ({
      search: search || undefined,
      status: status === "all" ? undefined : (status as "valid" | "expiring" | "expired"),
      vehicleId: vehicleId === "all" ? undefined : vehicleId,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, status, vehicleId, page],
  );

  const { data, isLoading } = useListDocuments(params, {
    query: { queryKey: getListDocumentsQueryKey(params) },
  });

  const vehiclesQuery = useListVehicles(
    { pageSize: 100 },
    { query: { queryKey: getListVehiclesQueryKey({ pageSize: 100 }) } },
  );

  const update = useUpdateDocument();
  const remove = useDeleteDocument();

  const [editState, setEditState] = useState<DocumentFormState | null>(null);

  function openEdit(doc: Document) {
    setEditing(doc);
    setEditState({
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

  async function handleEditSave() {
    if (!editing || !editState) return;
    try {
      await update.mutateAsync({
        id: editing.id,
        data: {
          name: editState.name,
          number: editState.number,
          startDate: new Date(editState.startDate).toISOString(),
          endDate: new Date(editState.endDate).toISOString(),
          note: editState.note || undefined,
          fileUrl: editState.fileUrl ?? undefined,
          fileName: editState.fileName ?? undefined,
        },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: getListDocumentsQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
      ]);
      toast({ title: "Document updated" });
      setEditing(null);
      setEditState(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync({ id: deleting.id });
      await Promise.all([
        qc.invalidateQueries({ queryKey: getListDocumentsQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
      ]);
      toast({ title: "Document deleted" });
      setDeleting(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast({ title: "Delete failed", description: message, variant: "destructive" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description={
          data
            ? `${data.total} document${data.total === 1 ? "" : "s"} across your fleet`
            : "Permits, insurance, inspections — all in one place"
        }
        actions={
          <Button
            onClick={() => setLocation("/documents/new")}
            data-testid="button-add-document"
          >
            <Plus className="mr-1 h-4 w-4" />
            New document
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, number, or vehicle…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            data-testid="input-search-documents"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="select-filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="valid">Valid</SelectItem>
            <SelectItem value="expiring">Expiring</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={vehicleId} onValueChange={setVehicleId}>
          <SelectTrigger data-testid="select-filter-vehicle">
            <SelectValue placeholder="Vehicle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vehicles</SelectItem>
            {(vehiclesQuery.data?.items ?? []).map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search || status !== "all" || vehicleId !== "all" ? "No matching documents" : "No documents yet"}
          description={
            search || status !== "all" || vehicleId !== "all"
              ? "Try clearing or adjusting filters."
              : "Add the first permit or insurance for any vehicle to start tracking expiry."
          }
          action={
            <Button onClick={() => setLocation("/documents/new")}>
              <Plus className="mr-1 h-4 w-4" />
              Add document
            </Button>



          }
        />
      ) : (
        <>
        <button
  type="button"
  className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
  onClick={() =>
    downloadReport(
      "/api/reports/expiring-documents.xlsx",
      "muddati-yaqin-hujjatlar.xlsx",
      token,
    )
  }
>
  Expiring Excel
</button>

<button
  type="button"
  className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
  onClick={() =>
    downloadReport(
      "/api/reports/expired-documents.xlsx",
      "muddati-otgan-hujjatlar.xlsx",
      token,
    )
  }
>
  Expired Excel
</button>
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Document</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Valid through</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((d, i) => (
                    <motion.tr
                      key={d.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border/60 transition-colors hover:bg-muted/30"
                      data-testid={`row-document-${d.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{d.name}</span>
                          {d.fileUrl ? (
                            <Paperclip className="h-3 w-3 text-muted-foreground" />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/vehicles/${d.vehicleId}`}
                          className="text-sm text-foreground hover:text-primary"
                        >
                          {d.vehicleName}
                          {d.vehiclePlateNumber ? (
                            <span className="ml-1 font-mono text-xs text-muted-foreground">
                              {d.vehiclePlateNumber}
                            </span>
                          ) : null}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {d.number}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(d.endDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.daysRemaining < 0 ? `${Math.abs(d.daysRemaining)}d ago` : `${d.daysRemaining}d`}
                      </TableCell>
                      <TableCell>
                        <StatusPill status={d.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-document-actions-${d.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLocation(`/vehicles/${d.vehicleId}`)}>
                              View vehicle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(d)}>Edit</DropdownMenuItem>
                            {d.fileUrl ? (
                              <DropdownMenuItem asChild>
                               <button
                                      type="button"
                                      className="text-blue-600 hover:underline"
                                      onClick={() => downloadDocumentFile(d.fileUrl!, d.fileName, token)}
                                      >
                                      {d.fileName || "Faylni yuklab olish"}
                              </button>
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem
                              className="text-rose-600 focus:text-rose-600"
                              onClick={() => setDeleting(d)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:hidden">
            {data.items.map((d) => (
              <Card key={d.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{d.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.vehicleName} • {d.vehiclePlateNumber}
                      </p>
                    </div>
                    <StatusPill status={d.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Valid through {format(new Date(d.endDate), "MMM d, yyyy")}</span>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DataPagination
            total={data.total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit document</DialogTitle>
          </DialogHeader>
          {editState ? (
            <DocumentFormFields state={editState} onChange={setEditState} lockVehicle />
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={update.isPending}>
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} for {deleting?.vehicleName} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-600/90"
              onClick={handleDelete}
            >
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
