type BulkActionsBarProps = {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  onExport?: () => void;
  entityLabel?: string;
};

export function BulkActionsBar({
  selectedCount,
  onClear,
  onDelete,
  onExport,
  entityLabel = "element",
}: BulkActionsBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="text-sm font-medium text-foreground">
        {selectedCount} ta {entityLabel} tanlandi
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onExport ? (
          <button
            type="button"
            onClick={onExport}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Export
          </button>
        ) : null}

        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Bekor qilish
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90"
        >
          Tanlanganlarni o‘chirish
        </button>
      </div>
    </div>
  );
}