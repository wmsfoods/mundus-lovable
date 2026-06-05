import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Paperclip, X, Plus } from "lucide-react";

type FileEntry = { file: File; previewUrl: string };

type Props = {
  files: FileEntry[];
  onAdd: (file: File) => void;
  onRemove: (idx: number) => void;
};

export function FilesCell({ files, onAdd, onRemove }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement | null>(null);
  const tk = (k: string, fb: string, opts?: Record<string, unknown>) =>
    t(`supplier.createOfferV2.cutsTable.files.${k}`, { defaultValue: fb, ...(opts ?? {}) }) as string;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs hover:bg-muted/40"
          title={tk("manage", "Files")}
        >
          <Paperclip size={12} />
          <span className="tabular-nums">{files.length}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {tk("title", "Files for this cut")} · {files.length}
        </div>
        <div className="mb-2 flex max-h-40 flex-col gap-1 overflow-y-auto">
          {files.length === 0 && (
            <div className="px-1 py-2 text-xs text-muted-foreground">{tk("empty", "No files yet.")}</div>
          )}
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded bg-muted/30 px-2 py-1 text-xs">
              <span className="truncate" title={f.file.name}>{f.file.name}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/40"
        >
          <Plus size={11} /> {tk("addFile", "Add file")}
        </button>
        <input
          ref={ref}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onAdd(f);
            e.target.value = "";
          }}
        />
      </PopoverContent>
    </Popover>
  );
}