type AssignmentFilter = "all" | "assigned" | "unassigned";

type Props = {
  value: AssignmentFilter;
  onChange: (value: AssignmentFilter) => void;
  counts: {
    all: number;
    assigned: number;
    unassigned: number;
  };
};

export function AssignmentTabs({ value, onChange, counts }: Props) {
  const tabs: Array<{
    key: AssignmentFilter;
    label: string;
    count: number;
  }> = [
    { key: "all", label: "Barchasi", count: counts.all },
    { key: "assigned", label: "Biriktirilganlar", count: counts.assigned },
    { key: "unassigned", label: "Biriktirilmaganlar", count: counts.unassigned },
  ];

  return (
    <div className="mb-4 flex flex-wrap gap-3">
      {tabs.map((tab) => {
        const active = value === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={[
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            ].join(" ")}
          >
            <span>{tab.label}</span>
            <span
              className={[
                "inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs",
                active
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type { AssignmentFilter };