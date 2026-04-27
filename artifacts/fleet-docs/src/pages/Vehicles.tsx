import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
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
import { Plus, Search, Truck, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

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

export default function Vehicles() {
  const [, setLocation] = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput, 300);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const params = useMemo(
    () => ({ search: search || undefined, page, pageSize: PAGE_SIZE }),
    [search, page],
  );

  const { data, isLoading } = useListVehicles(params, {
    query: { queryKey: getListVehiclesQueryKey(params) },
  });

  return (
    <div>
      <PageHeader
        title="Vehicles"
        description={
          data
            ? `${data.total} vehicle${data.total === 1 ? "" : "s"} in your fleet`
            : "Manage your fleet roster"
        }
        actions={
          <Button onClick={() => setLocation("/vehicles/new")} data-testid="button-add-vehicle">
            <Plus className="mr-1 h-4 w-4" />
            New vehicle
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, plate, VIN or trailer plate..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            data-testid="input-search-vehicles"
          />
        </div>
      </div>

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
          title={search ? "No matching vehicles" : "No vehicles yet"}
          description={
            search
              ? "Try a different search term."
              : "Add your first vehicle to start tracking its documents and expiry dates."
          }
          action={
            !search ? (
              <Button onClick={() => setLocation("/vehicles/new")}>
                <Plus className="mr-1 h-4 w-4" />
                Add vehicle
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
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Plate</TableHead>
                    <TableHead>Trailer</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-center">Documents</TableHead>
                    <TableHead>Next expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {data.items.map((item, i) => {
                    const v = item as VehicleWithTrailer;

                    return (
                      <motion.tr
                        key={v.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/40"
                        onClick={() => setLocation(`/vehicles/${v.id}`)}
                        data-testid={`row-vehicle-${v.id}`}
                      >
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
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:hidden">
            {data.items.map((item) => {
              const v = item as VehicleWithTrailer;

              return (
                <Link key={v.id} href={`/vehicles/${v.id}`}>
                  <Card className="cursor-pointer transition-colors hover:border-primary/40">
                    <CardContent className="p-4">
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
                        <div>Year: {v.year}</div>
                        <div>Docs: {v.documentCount ?? 0}</div>
                        <div className="col-span-2">Driver: {v.driverName || "—"}</div>

                        {v.hasTrailer ? (
                          <div className="col-span-2 rounded-md bg-amber-50 p-2 text-amber-800">
                            Trailer:{" "}
                            <span className="font-mono">
                              {v.trailerPlateNumber || "raqam kiritilmagan"}
                            </span>
                            {v.trailerModel ? ` • ${v.trailerModel}` : ""}
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <DataPagination
            total={data.total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}