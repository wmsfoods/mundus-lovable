import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Camera, X } from "lucide-react";

type Props = {
  previewUrl: string | null;
  onPick: (file: File | null) => void;
};

export function PhotoCell({ previewUrl, onPick }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement | null>(null);
  const tk = (k: string, fb: string) =>
    t(`supplier.createOfferV2.cutsTable.photo.${k}`, { defaultValue: fb }) as string;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        title={previewUrl ? tk("replace", "Replace photo") : tk("add", "Add photo")}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40 text-muted-foreground hover:bg-muted"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Camera size={14} />
        )}
      </button>
      {previewUrl && (
        <button
          type="button"
          onClick={() => onPick(null)}
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
          title={tk("remove", "Remove photo")}
        >
          <X size={9} />
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onPick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}