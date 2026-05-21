import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Monitor, Smartphone, Search, Flag } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type Platform = "web" | "mobile";
type Audience = "all" | "buyer" | "supplier" | "admin";

type FeatureFlag = {
  id: string;
  key: string;
  platform: Platform;
  category: string;
  label: string;
  description: string | null;
  enabled: boolean;
  audience: Audience;
};

const AUDIENCE_COLORS: Record<Audience, string> = {
  all: "bg-slate-100 text-slate-700",
  buyer: "bg-blue-100 text-blue-700",
  supplier: "bg-amber-100 text-amber-700",
  admin: "bg-purple-100 text-purple-700",
};

export default function AdminFeatureFlags() {
  const { t } = useTranslation();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<Platform>("web");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("feature_flags" as any)
      .select("*")
      .order("category")
      .order("label");
    if (error) toast.error(error.message);
    else setFlags((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleFlag(flag: FeatureFlag) {
    setPendingId(flag.id);
    const next = !flag.enabled;
    setFlags((cur) => cur.map((f) => (f.id === flag.id ? { ...f, enabled: next } : f)));
    const { error } = await supabase
      .from("feature_flags" as any)
      .update({ enabled: next })
      .eq("id", flag.id);
    setPendingId(null);
    if (error) {
      toast.error(error.message);
      setFlags((cur) => cur.map((f) => (f.id === flag.id ? { ...f, enabled: !next } : f)));
      return;
    }
    toast.success(
      next
        ? t("admin.flags.enabledToast", { label: flag.label })
        : t("admin.flags.disabledToast", { label: flag.label }),
    );
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flags
      .filter((f) => f.platform === platform)
      .filter(
        (f) =>
          !q ||
          f.label.toLowerCase().includes(q) ||
          f.key.toLowerCase().includes(q) ||
          (f.description ?? "").toLowerCase().includes(q),
      );
  }, [flags, platform, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, FeatureFlag[]>();
    for (const f of filtered) {
      const arr = map.get(f.category) ?? [];
      arr.push(f);
      map.set(f.category, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const stats = useMemo(() => {
    const list = flags.filter((f) => f.platform === platform);
    return { total: list.length, enabled: list.filter((f) => f.enabled).length };
  }, [flags, platform]);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Flag className="h-6 w-6 text-[#B64769]" />
            {t("admin.flags.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.flags.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="px-3 py-1.5 rounded-full bg-[#B64769]/10 text-[#B64769] font-medium">
            {stats.enabled}/{stats.total} {t("admin.flags.active")}
          </div>
        </div>
      </header>

      <Tabs value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="web" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" /> {t("admin.flags.web")}
            </TabsTrigger>
            <TabsTrigger value="mobile" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" /> {t("admin.flags.mobile")}
            </TabsTrigger>
          </TabsList>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.flags.searchPlaceholder")}
              className="pl-9 pr-3 py-2 h-10 rounded-md border bg-background text-sm w-64"
            />
          </div>
        </div>

        <TabsContent value={platform} className="mt-6 space-y-6">
          {loading ? (
            <div className="text-sm text-muted-foreground py-12 text-center">
              {t("common.loading")}
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-sm text-muted-foreground py-12 text-center border rounded-lg">
              {t("admin.flags.empty")}
            </div>
          ) : (
            grouped.map(([category, items]) => (
              <section key={category} className="border rounded-lg overflow-hidden bg-card">
                <header className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {t(`admin.flags.category.${category}`, { defaultValue: category })}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {items.filter((i) => i.enabled).length}/{items.length}
                  </span>
                </header>
                <ul className="divide-y">
                  {items.map((f) => (
                    <li
                      key={f.id}
                      className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{f.label}</span>
                          <code className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {f.key}
                          </code>
                          <Badge variant="secondary" className={AUDIENCE_COLORS[f.audience]}>
                            {t(`admin.flags.audience.${f.audience}`, { defaultValue: f.audience })}
                          </Badge>
                        </div>
                        {f.description && (
                          <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
                        )}
                      </div>
                      <Switch
                        checked={f.enabled}
                        disabled={pendingId === f.id}
                        onCheckedChange={() => toggleFlag(f)}
                        className="data-[state=checked]:bg-[#B64769]"
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}