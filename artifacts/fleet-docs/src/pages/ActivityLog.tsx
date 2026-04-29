import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Clock, FileText, Loader2, ShieldCheck, Truck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { dateLabel, loadOperationsData } from "@/lib/operations-api";

type TimelineItem = {
  id: string;
  type: "Transport" | "Hujjat" | "TIR Carnet" | "Dazvol";
  title: string;
  description: string;
  date?: string | null;
};

function iconFor(type: TimelineItem["type"]) {
  if (type === "Transport") return Truck;
  if (type === "Hujjat") return FileText;
  if (type === "TIR Carnet") return ShieldCheck;
  return Activity;
}

export default function ActivityLog() {
  const token = useAuth((s) => s.token);

  const query = useQuery({
    queryKey: ["activity-log"],
    queryFn: () => loadOperationsData(token),
    enabled: !!token,
  });

  const timeline = useMemo<TimelineItem[]>(() => {
    const data = query.data;

    if (!data) return [];

    const items: TimelineItem[] = [
      ...data.vehicles.map((item) => ({
        id: `vehicle-${item.id}`,
        type: "Transport" as const,
        title: item.name || item.plateNumber || "Transport",
        description: `Transport ro‘yxatga olingan${item.plateNumber ? ` · ${item.plateNumber}` : ""}`,
        date: item.updatedAt || item.createdAt,
      })),

      ...data.documents.map((item) => ({
        id: `document-${item.id}`,
        type: "Hujjat" as const,
        title: item.title || item.name || item.documentType || item.type || "Hujjat",
        description: `Hujjat tizimga qo‘shilgan${
          item.vehicleName || item.vehiclePlateNumber
            ? ` · ${item.vehicleName || item.vehiclePlateNumber}`
            : ""
        }`,
        date: item.updatedAt || item.createdAt,
      })),

      ...data.tirCarnets.map((item) => ({
        id: `tir-${item.id}`,
        type: "TIR Carnet" as const,
        title: item.carnetNumber,
        description: item.vehicleId
          ? `Transportga biriktirilgan · ${item.vehicleName || item.vehiclePlateNumber || "Transport"}`
          : "Hali transportga biriktirilmagan",
        date: item.updatedAt || item.createdAt,
      })),

      ...data.dazvols.map((item) => ({
        id: `dazvol-${item.id}`,
        type: "Dazvol" as const,
        title: item.permitNumber,
        description: item.vehicleId
          ? `Transportga biriktirilgan · ${item.vehicleName || item.vehiclePlateNumber || "Transport"}`
          : `Hali transportga biriktirilmagan${item.country ? ` · ${item.country}` : ""}`,
        date: item.updatedAt || item.createdAt,
      })),
    ];

    return items
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 80);
  }, [query.data]);

  if (query.isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        Faollik tarixini yuklab bo‘lmadi.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faollik tarixi"
        description="Transportlar, hujjatlar, TIR Carnet va Dazvol bo‘yicha oxirgi harakatlar."
      />

      <Card>
        <CardContent className="p-0">
          {timeline.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
              <Clock className="mb-3 h-9 w-9 text-muted-foreground" />
              <p className="font-medium">Hozircha faollik mavjud emas</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Yangi transport, hujjat, TIR yoki Dazvol qo‘shilganda shu yerda ko‘rinadi.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {timeline.map((item) => {
                const Icon = iconFor(item.type);

                return (
                  <div key={item.id} className="flex gap-4 p-4">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.title}</p>
                        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                          {item.type}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {dateLabel(item.date)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}