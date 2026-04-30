import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ClipboardCheck,
  FileWarning,
  Loader2,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import {
dateLabel,
expiryClass,
expiryText,
getDocumentExpiry,
isExpired,
isExpiringSoon,
loadOperationsData,
loadOperationsData,
} from "@/lib/operations-api";

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof Truck;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ControlCenter() {
  const token = useAuth((s) => s.token);

  const query = useQuery({
    queryKey: ["control-center"],
    queryFn: () => loadOperationsData(token),
    enabled: !!token,
  });

  const data = query.data;

  const metrics = useMemo(() => {
    const documents = data?.documents ?? [];
    const tir = data?.tirCarnets ?? [];
    const dazvols = data?.dazvols ?? [];

    const allExpiryItems = [
      ...documents.map((item) => ({
        type: "Hujjat",
        title: item.title || item.name || item.documentType || item.type || "Hujjat",
        transport: item.vehicleName || item.vehiclePlateNumber || "Transport ko‘rsatilmagan",
       expiryDate: getDocumentExpiry(item),
      })),
      ...tir.map((item) => ({
        type: "TIR Carnet",
        title: item.carnetNumber,
        transport: item.vehicleName || item.vehiclePlateNumber || "Biriktirilmagan",
       expiryDate: getDocumentExpiry(item),
      })),
      ...dazvols.map((item) => ({
        type: "Dazvol",
        title: item.permitNumber,
        transport: item.vehicleName || item.vehiclePlateNumber || "Biriktirilmagan",
        expiryDate: item.expiryDate,
      })),
    ];

    const expiring = allExpiryItems.filter((item) => isExpiringSoon(item.expiryDate, 30));
    const expired = allExpiryItems.filter((item) => isExpired(item.expiryDate));
    const unassignedTir = tir.filter((item) => !item.vehicleId);
    const unassignedDazvol = dazvols.filter((item) => !item.vehicleId);

    return {
      vehicles: data?.vehicles.length ?? 0,
      documents: documents.length,
      expiringCount: expiring.length,
      expiredCount: expired.length,
      unassignedCount: unassignedTir.length + unassignedDazvol.length,
      expiring,
      expired,
      unassignedTir,
      unassignedDazvol,
    };
  }, [data]);

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
        Nazorat ma’lumotlarini yuklab bo‘lmadi.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nazorat markazi"
        description="Transportlar, hujjatlar, TIR Carnet va Dazvollar bo‘yicha eng muhim holatlar."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Transportlar"
          value={metrics.vehicles}
          description="Jami transportlar"
          icon={Truck}
        />
        <StatCard
          title="Hujjatlar"
          value={metrics.documents}
          description="Jami hujjatlar"
          icon={ShieldCheck}
        />
        <StatCard
          title="Muddati yaqin"
          value={metrics.expiringCount}
          description="30 kun ichida tugaydi"
          icon={FileWarning}
        />
        <StatCard
          title="Muddati o‘tgan"
          value={metrics.expiredCount}
          description="Zudlik bilan ko‘rish kerak"
          icon={AlertTriangle}
        />
        <StatCard
          title="Biriktirilmagan"
          value={metrics.unassignedCount}
          description="TIR/Dazvol transportga ulanmagan"
          icon={ClipboardCheck}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Muddati yaqinlashayotganlar</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.expiring.length === 0 ? (
              <p className="text-sm text-muted-foreground">Hozircha muddati yaqinlashayotgan yozuv yo‘q.</p>
            ) : (
              <div className="space-y-3">
                {metrics.expiring.slice(0, 8).map((item, index) => (
                  <div key={`${item.type}-${item.title}-${index}`} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.type} · {item.transport}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${expiryClass(item.expiryDate)}`}>
                        {expiryText(item.expiryDate)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Tugash sanasi: {dateLabel(item.expiryDate)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Biriktirilmagan TIR/Dazvollar</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.unassignedCount === 0 ? (
              <p className="text-sm text-muted-foreground">Hamma TIR va Dazvollar transportga biriktirilgan.</p>
            ) : (
              <div className="space-y-3">
                {metrics.unassignedTir.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-xl border p-3">
                    <p className="font-medium">{item.carnetNumber}</p>
                    <p className="text-sm text-muted-foreground">TIR Carnet · {item.route || "Yo‘nalish yo‘q"}</p>
                  </div>
                ))}

                {metrics.unassignedDazvol.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-xl border p-3">
                    <p className="font-medium">{item.permitNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      Dazvol · {item.country || "Davlat ko‘rsatilmagan"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}