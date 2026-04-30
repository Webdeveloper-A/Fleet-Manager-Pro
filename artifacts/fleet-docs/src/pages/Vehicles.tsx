import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListVehicles,
  getListVehiclesQueryKey,
  type Vehicle,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill, type StatusKind } from "@/components/StatusPill";
import { EmptyState } from "@/components/EmptyState";
import { DataPagination } from "@/components/DataPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Truck, ChevronRight, Download, Trash2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const PAGE_SIZE = 12;

type VehicleWithTrailer = Vehicle & {
  hasTrailer?: boolean | null;
  trailerPlateNumber?: string | null;
  trailerModel?: string | null;
  trailerCapacityKg?: number | null;
  trailerNote?: string | null;
};

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return v;
}

function TrailerBadge() {
  return (
    <span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
      Pritsep bor
    </span>
  );
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    toast({
      title: "Eksport uchun ma’lumot yo‘q",
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

async function deleteVehicle(id: string, token: string | null) {
  const res = await fetch(`/api/vehicles/${id}`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok && res.status !== 204) {
    let message = "Transportni o‘chirib bo‘lmadi";

    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }

    throw new Error(message);
  }
}

export default function Vehicles() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const token = useAuth((s) => s.token);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput, 300);
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [search]);

  const params = useMemo(
    () => ({ search: search || undefined, page, pageSize: PAGE_SIZE }),
    [search, page],
  );

  const { data, isLoading } = useListVehicles(params, {
    query: { queryKey: getListVehiclesQueryKey(params) },
  });

  const vehicles = (data?.items ?? []) as VehicleWithTrailer[];
  const pageIds = useMemo(() => vehicles.map((item) => item.id), [vehicles]);

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
    const selected = vehicles.filter((item) => selectedIds.includes(item.id));

    downloadCsv(
      "tanlangan-transportlar.csv",
      selected.map((v) => ({
        Nomi: v.name,
        "Davlat raqami": v.plateNumber,
        VIN: v.vinCode,
        Yili: v.year,
        Haydovchi: v.driverName ?? "",
        "Hujjatlar soni": v.documentCount ?? 0,
        Pritsep: v.hasTrailer ? "Bor" : "Yo‘q",
        "Pritsep raqami": v.trailerPlateNumber ?? "",
      })),
    );
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;

    const ok = window.confirm(
      `${selectedIds.length} ta transportni o‘chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo‘lmaydi.`,
    );

    if (!ok) return;

    try {
      setBulkDeleting(true);

      for (const id of selectedIds) {
        await deleteVehicle(id, token);
      }

      setSelectedIds([]);
      await qc.invalidateQueries({ queryKey: getListVehiclesQueryKey() });

      toast({
        title: "Tanlangan transportlar o‘chirildi",
        description: `${selectedIds.length} ta transport o‘chirildi.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transportlarni o‘chirib bo‘lmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Transportlar"
        description={
          data
            ? `${data.total} ta transport ro‘yxatga olingan`
            : "Transport parkini boshqarish"
        }
        actions={
          <Button onClick={() => setLocation("/vehicles/new")} data-testid="button-add-vehicle">
            <Plus className="mr-1 h-4 w-4" />
            Transport qo‘shish
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nomi, raqami, VIN yoki pritsep raqami..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            data-testid="input-search-vehicles"
          />
        </div>
      </div>

      {selectedIds.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <p className="text-sm font-medium">
            {selectedIds.length} ta transport tanlandi
          </p>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportSelected}>
              <Download className="mr-1 h-4 w-4" />
              Export CSV
            </Button>

            <Button variant="outline" onClick={() => setSelectedIds([])}>
              Bekor qilish
            </Button>

            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
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
          <CardContent className="p-0">
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={search ? "Mos transportlar topilmadi" : "Transportlar hali qo‘shilmagan"}
          description={
            search
              ? "Boshqa qidiruv so‘zini kiriting."
              : "Birinchi transportni qo‘shing va hujjatlarni nazorat qilishni boshlang."
          }
          action={
            !search ? (
              <Button onClick={() => setLocation("/vehicles/new")}>
                <Plus className="mr-1 h-4 w-4" />
                Transport qo‘shish
              </Button>
            ) : null
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
                    <TableHead>Transport</TableHead>
                    <TableHead>Davlat raqami</TableHead>
                    <TableHead>Pritsep</TableHead>
                    <TableHead>Yili</TableHead>
                    <TableHead>Haydovchi</TableHead>
                    <TableHead className="text-center">Hujjatlar</TableHead>
                    <TableHead>Keyingi muddat</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {vehicles.map((v, i) => (
                    <motion.tr
                      key={v.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/40"
                      onClick={() => setLocation(`/vehicles/${v.id}`)}
                      data-testid={`row-vehicle-${v.id}`}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(v.id)}
                          onChange={() => toggleOne(v.id)}
                        />
                      </TableCell>

                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{v.name}</span>
                          {v.hasTrailer ? <TrailerBadge /> : null}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {v.plateNumber}
                        </span>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {v.hasTrailer ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-xs">
                              {v.trailerPlateNumber || "—"}
                            </span>
                            <span className="text-xs">{v.trailerModel || "Pritsep"}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">{v.year}</TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {v.driverName || "—"}
                      </TableCell>

                      <TableCell className="text-center text-sm text-muted-foreground">
                        {v.documentCount ?? 0}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {v.nextExpiryAt
                          ? format(new Date(v.nextExpiryAt), "MMM d, yyyy")
                          : "—"}
                      </TableCell>

                      <TableCell>
                        <StatusPill status={(v.worstStatus ?? "none") as StatusKind} />
                      </TableCell>

                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:hidden">
            {vehicles.map((v) => (
              <Card key={v.id} className="transition-colors hover:border-primary/40">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(v.id)}
                      onChange={() => toggleOne(v.id)}
                      className="mt-1"
                    />

                    <Link href={`/vehicles/${v.id}`} className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold">{v.name}</p>
                            {v.hasTrailer ? <TrailerBadge /> : null}
                          </div>

                          <p className="font-mono text-xs text-muted-foreground">
                            {v.plateNumber}
                          </p>
                        </div>

                        <StatusPill status={(v.worstStatus ?? "none") as StatusKind} />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Yili: {v.year}</div>
                        <div>Hujjatlar: {v.documentCount ?? 0}</div>
                        <div className="col-span-2">Haydovchi: {v.driverName || "—"}</div>

                        {v.hasTrailer ? (
                          <div className="col-span-2 rounded-md bg-amber-50 p-2 text-amber-800">
                            Pritsep:{" "}
                            <span className="font-mono">
                              {v.trailerPlateNumber || "raqam kiritilmagan"}
                            </span>
                            {v.trailerModel ? ` • ${v.trailerModel}` : ""}
                          </div>
                        ) : null}
                      </div>
                    </Link>
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
    </div>
  );
}