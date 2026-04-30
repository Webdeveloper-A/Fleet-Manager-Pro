import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDocuments,
  useListVehicles,
  useCreateDocument,
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
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  Loader2,
  Paperclip,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
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

type CsvRow = Record<string, string>;

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return v;
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    toast({
      title: "Eksport uchun ma’lumot yo‘q",
      description: "Avval hujjat tanlang yoki filtrlarni tozalang.",
      variant: "destructive",
    });
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;

      row.push(current);
      current = "";

      if (row.some((cell) => cell.trim())) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    current += char;
  }

  row.push(current);

  if (row.some((cell) => cell.trim())) {
    rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());

  return rows.slice(1).map((cells) => {
    const item: CsvRow = {};

    headers.forEach((header, index) => {
      item[header] = (cells[index] ?? "").trim();
    });

    return item;
  });
}

function normalizePlate(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function toIsoDate(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} kiritilmagan`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} noto‘g‘ri formatda`);
  }

  return date.toISOString();
}

function buildTemplateRows() {
  return [
    {
      vehiclePlate: "01A123BC",
      vehicleName: "Volvo FH",
      name: "Sug‘urta polisi",
      number: "INS-2026-001",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      note: "Namuna qator. Importdan oldin o‘chirib yuboring.",
      fileName: "",
      fileUrl: "",
    },
  ];
}

async function deleteDocumentById(id: string, token: string | null) {
  const res = await fetch(`/api/documents/${id}`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok && res.status !== 204) {
    let message = "Hujjatni o‘chirib bo‘lmadi";

    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }

    throw new Error(message);
  }
}

export default function Documents() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput);
  const [status, setStatus] = useState<string>("all");
  const [vehicleId, setVehicleId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState<Document | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const token = useAuth((s) => s.token);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
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

  const create = useCreateDocument();
  const update = useUpdateDocument();
  const remove = useDeleteDocument();

  const [editState, setEditState] = useState<DocumentFormState | null>(null);

  const vehicles = vehiclesQuery.data?.items ?? [];
  const documents = data?.items ?? [];

  const pageIds = useMemo(() => documents.map((item) => item.id), [documents]);

  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  function toggleOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleAllOnPage() {
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
  }

  function handleExportSelected() {
    const selected = documents.filter((item) => selectedIds.includes(item.id));

    downloadCsv(
      "tanlangan-hujjatlar.csv",
      selected.map((d) => ({
        Transport: d.vehicleName ?? "",
        "Transport raqami": d.vehiclePlateNumber ?? "",
        Hujjat: d.name,
        Raqami: d.number,
        "Boshlanish sanasi": new Date(d.startDate).toISOString().slice(0, 10),
        "Tugash sanasi": new Date(d.endDate).toISOString().slice(0, 10),
        Holat: d.status,
        Izoh: d.note ?? "",
      })),
    );
  }

  async function invalidateDocuments() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: getListDocumentsQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
    ]);
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;

    const ok = window.confirm(
      `${selectedIds.length} ta hujjatni o‘chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo‘lmaydi.`,
    );

    if (!ok) return;

    try {
      setBulkDeleting(true);

      for (const id of selectedIds) {
        await deleteDocumentById(id, token);
      }

      const deletedCount = selectedIds.length;
      setSelectedIds([]);
      await invalidateDocuments();

      toast({
        title: "Tanlangan hujjatlar o‘chirildi",
        description: `${deletedCount} ta hujjat o‘chirildi.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Hujjatlarni o‘chirib bo‘lmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    } finally {
      setBulkDeleting(false);
    }
  }

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

      await invalidateDocuments();

      toast({ title: "Hujjat yangilandi" });
      setEditing(null);
      setEditState(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Hujjatni yangilab bo‘lmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!deleting) return;

    try {
      await remove.mutateAsync({ id: deleting.id });
      await invalidateDocuments();

      toast({ title: "Hujjat o‘chirildi" });
      setDeleting(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Hujjatni o‘chirib bo‘lmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    }
  }

  function handleExportCsv() {
    const rows = documents.map((d) => ({
      vehiclePlate: d.vehiclePlateNumber ?? "",
      vehicleName: d.vehicleName ?? "",
      name: d.name,
      number: d.number,
      startDate: new Date(d.startDate).toISOString().slice(0, 10),
      endDate: new Date(d.endDate).toISOString().slice(0, 10),
      note: d.note ?? "",
      fileName: d.fileName ?? "",
      fileUrl: d.fileUrl ?? "",
    }));

    downloadCsv("fleet-docs-hujjatlar.csv", rows);
  }

  function handleDownloadTemplate() {
    downloadCsv("fleet-docs-import-template.csv", buildTemplateRows());
  }

  function findVehicleForRow(row: CsvRow) {
    const plate = normalizePlate(row.vehiclePlate ?? "");
    const name = (row.vehicleName ?? "").trim().toLowerCase();

    if (plate) {
      const byPlate = vehicles.find((v) => normalizePlate(v.plateNumber ?? "") === plate);
      if (byPlate) return byPlate;
    }

    if (name) {
      const byName = vehicles.find((v) => v.name.trim().toLowerCase() === name);
      if (byName) return byName;
    }

    return null;
  }

  async function handleImportFile(file: File) {
    setImportErrors([]);
    setImporting(true);

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const errors: string[] = [];
      let created = 0;

      if (rows.length === 0) {
        toast({
          title: "CSV fayl bo‘sh",
          description: "Import uchun kamida bitta hujjat qatori bo‘lishi kerak.",
          variant: "destructive",
        });
        return;
      }

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const rowNumber = index + 2;

        try {
          const vehicle = findVehicleForRow(row);

          if (!vehicle) {
            throw new Error(
              `Transport topilmadi. vehiclePlate yoki vehicleName to‘g‘ri kiritilishi kerak.`,
            );
          }

          const name = (row.name ?? "").trim();
          const number = (row.number ?? "").trim();

          if (!name) {
            throw new Error("Hujjat nomi kiritilmagan");
          }

          await create.mutateAsync({
            data: {
              vehicleId: vehicle.id,
              name,
              number: number || "-",
              startDate: toIsoDate(row.startDate ?? "", "startDate"),
              endDate: toIsoDate(row.endDate ?? "", "endDate"),
              note: row.note?.trim() || undefined,
              fileName: row.fileName?.trim() || undefined,
              fileUrl: row.fileUrl?.trim() || undefined,
            },
          });

          created++;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Import xatosi";
          errors.push(`${rowNumber}-qator: ${message}`);
        }
      }

      await invalidateDocuments();

      if (errors.length > 0) {
        setImportErrors(errors);
      }

      toast({
        title: "Import yakunlandi",
        description: `${created} ta hujjat qo‘shildi. ${
          errors.length > 0 ? `${errors.length} ta qatorda xato bor.` : ""
        }`,
        variant: errors.length > 0 ? "destructive" : "default",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "CSV faylni o‘qib bo‘lmadi";
      toast({ title: "Import xatosi", description: message, variant: "destructive" });
    } finally {
      setImporting(false);

      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  }

  return (
    <div>
      <input
        ref={importInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImportFile(file);
        }}
      />

      <PageHeader
        title="Hujjatlar"
        description={
          data
            ? `${data.total} ta hujjat ro‘yxatga olingan`
            : "Ruxsatnomalar, sug‘urta, texnik ko‘rik va boshqa hujjatlar yagona joyda"
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              data-testid="button-download-import-template"
            >
              <FileSpreadsheet className="mr-1 h-4 w-4" />
              Import shabloni
            </Button>

            <Button
              variant="outline"
              onClick={() => importInputRef.current?.click()}
              disabled={importing || create.isPending || vehiclesQuery.isLoading}
              data-testid="button-import-documents"
            >
              {importing ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1 h-4 w-4" />
              )}
              Import CSV
            </Button>

            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={documents.length === 0}
              data-testid="button-export-documents"
            >
              <Download className="mr-1 h-4 w-4" />
              Export CSV
            </Button>

            <Button
              onClick={() => setLocation("/documents/new")}
              data-testid="button-add-document"
            >
              <Plus className="mr-1 h-4 w-4" />
              Hujjat qo‘shish
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            downloadReport(
              "/api/reports/expiring-documents.xlsx",
              "muddati-yaqin-hujjatlar.xlsx",
              token,
            )
          }
        >
          <Download className="mr-1 h-4 w-4" />
          Muddati yaqin Excel
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            downloadReport(
              "/api/reports/expired-documents.xlsx",
              "muddati-otgan-hujjatlar.xlsx",
              token,
            )
          }
        >
          <Download className="mr-1 h-4 w-4" />
          Muddati o‘tgan Excel
        </Button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nomi, raqami yoki transport bo‘yicha qidirish..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            data-testid="input-search-documents"
          />
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="select-filter-status">
            <SelectValue placeholder="Holat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha holatlar</SelectItem>
            <SelectItem value="valid">Amalda</SelectItem>
            <SelectItem value="expiring">Muddati yaqin</SelectItem>
            <SelectItem value="expired">Muddati o‘tgan</SelectItem>
          </SelectContent>
        </Select>

        <Select value={vehicleId} onValueChange={setVehicleId}>
          <SelectTrigger data-testid="select-filter-vehicle">
            <SelectValue placeholder="Transport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha transportlar</SelectItem>
            {vehicles.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name} {v.plateNumber ? `— ${v.plateNumber}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedIds.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <p className="text-sm font-medium">{selectedIds.length} ta hujjat tanlandi</p>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportSelected}>
              <Download className="mr-1 h-4 w-4" />
              Tanlanganlarni export qilish
            </Button>

            <Button variant="outline" onClick={() => setSelectedIds([])}>
              Bekor qilish
            </Button>

            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-4 w-4" />
              )}
              Tanlanganlarni o‘chirish
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <Card>
          <CardContent className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            search || status !== "all" || vehicleId !== "all"
              ? "Mos hujjatlar topilmadi"
              : "Hujjatlar hali qo‘shilmagan"
          }
          description={
            search || status !== "all" || vehicleId !== "all"
              ? "Filtrlarni tozalang yoki qidiruv so‘zini o‘zgartiring."
              : "Transport hujjatlarini qo‘shing yoki CSV orqali import qiling."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => importInputRef.current?.click()}>
                <Upload className="mr-1 h-4 w-4" />
                Import CSV
              </Button>

              <Button onClick={() => setLocation("/documents/new")}>
                <Plus className="mr-1 h-4 w-4" />
                Hujjat qo‘shish
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleAllOnPage}
                      />
                    </TableHead>
                    <TableHead>Hujjat</TableHead>
                    <TableHead>Transport</TableHead>
                    <TableHead>Raqami</TableHead>
                    <TableHead>Amal qilish muddati</TableHead>
                    <TableHead>Kun</TableHead>
                    <TableHead>Holat</TableHead>
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
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(d.id)}
                          onChange={() => toggleOne(d.id)}
                        />
                      </TableCell>

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
                        {d.daysRemaining < 0
                          ? `${Math.abs(d.daysRemaining)} kun oldin`
                          : `${d.daysRemaining} kun`}
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
                              Transportni ko‘rish
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => openEdit(d)}>
                              Tahrirlash
                            </DropdownMenuItem>

                            {d.fileUrl ? (
                              <DropdownMenuItem
                                onClick={() => downloadDocumentFile(d.fileUrl!, d.fileName, token)}
                              >
                                Faylni yuklab olish
                              </DropdownMenuItem>
                            ) : null}

                            <DropdownMenuItem
                              className="text-rose-600 focus:text-rose-600"
                              onClick={() => setDeleting(d)}
                            >
                              O‘chirish
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
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(d.id)}
                      onChange={() => toggleOne(d.id)}
                      className="mt-1"
                    />

                    <div className="min-w-0 flex-1">
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
                        <span>{format(new Date(d.endDate), "MMM d, yyyy")}</span>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                          Tahrirlash
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DataPagination
            total={data.total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={(nextPage) => {
              setPage(nextPage);
              setSelectedIds([]);
            }}
          />
        </>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Hujjatni tahrirlash</DialogTitle>
          </DialogHeader>

          {editState ? (
            <DocumentFormFields state={editState} onChange={setEditState} lockVehicle />
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Bekor qilish
            </Button>

            <Button onClick={handleEditSave} disabled={update.isPending}>
              {update.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Saqlash"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hujjat o‘chirilsinmi?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} hujjati butunlay o‘chiriladi. Bu amalni ortga qaytarib bo‘lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-600/90"
              onClick={handleDelete}
            >
              {remove.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "O‘chirish"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={importErrors.length > 0} onOpenChange={(o) => !o && setImportErrors([])}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importdagi xatolar</DialogTitle>
          </DialogHeader>

          <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-3">
            {importErrors.map((error, index) => (
              <p key={`${error}-${index}`} className="text-sm text-rose-600">
                {error}
              </p>
            ))}
          </div>

          <DialogFooter>
            <Button onClick={() => setImportErrors([])}>Yopish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}