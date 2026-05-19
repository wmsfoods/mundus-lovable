import { useTranslation } from "react-i18next";

type ComingSoonProps = {
  title: string;
  description?: string;
};

export function ComingSoon({ title, description }: ComingSoonProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="h-12 w-12 rounded-full bg-p-50 text-p-800 flex items-center justify-center text-xl font-semibold mb-4">
        ⏳
      </div>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      {description && (
        <p className="mt-2 text-muted-foreground text-sm max-w-md">{description}</p>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        {t("comingSoon.note")}
      </p>
    </div>
  );
}