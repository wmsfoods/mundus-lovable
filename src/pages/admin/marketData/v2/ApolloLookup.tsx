import { useMemo, useState } from "react";
import { Building2, Users, Mail, Linkedin, Globe, Loader2, Search, ExternalLink, ChevronLeft, Inbox, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useProspectSearch } from "@/hooks/useProspectSearch";
import type { MockCompany, MockPerson } from "@/data/mockProspect";
import { Skeleton } from "@/components/ui/skeleton";

type Kind = "shipper" | "consignee";

function defaultCountry(kind: Kind): string {
  // Brazilian export base for shippers; broad for consignees.
  return kind === "shipper" ? "Brazil" : "";
}

export function ApolloLookup({ name, kind }: { name: string; kind: Kind }) {
  const [query, setQuery] = useState(name);
  const [country, setCountry] = useState(defaultCountry(kind));
  const [selected, setSelected] = useState<MockCompany | null>(null);

  const companyParams = useMemo(() => {
    const p: Record<string, unknown> = {
      q_organization_name: query,
      per_page: 5,
      page: 1,
    };
    if (country.trim()) p.organization_locations = [country.trim()];
    return p;
  }, [query, country]);

  const companies = useProspectSearch<MockCompany>("companies", companyParams, {
    enabled: !selected && !!query.trim(),
    debounceMs: 400,
  });

  const peopleParams = useMemo(
    () => ({ organization_ids: selected ? [selected.id] : [], per_page: 10, page: 1 }),
    [selected],
  );
  const people = useProspectSearch<MockPerson>("people", peopleParams, {
    enabled: !!selected,
  });

  const errorCode = companies.errorCode ?? null;
  const keyMissing =
    companies.error?.includes("apollo_api_key_missing") ||
    people.error?.includes("apollo_api_key_missing");

  return (
    <div className="mt-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Inteligência Apollo</h4>
        </div>
        {selected && (
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="h-7 gap-1 text-xs">
            <ChevronLeft className="h-3.5 w-3.5" /> Trocar empresa
          </Button>
        )}
      </div>

      {keyMissing ? (
        <div className="p-4 text-sm text-muted-foreground">
          Apollo não configurado. Adicione a chave <code className="text-xs">APOLLO_API_KEY</code> nas configurações.
        </div>
      ) : selected ? (
        <PeopleView company={selected} people={people} />
      ) : (
        <CompanyView
          query={query}
          country={country}
          onQuery={setQuery}
          onCountry={setCountry}
          companies={companies}
          onSelect={setSelected}
          errorCode={errorCode}
        />
      )}
    </div>
  );
}

function CompanyView({
  query, country, onQuery, onCountry, companies, onSelect, errorCode,
}: {
  query: string;
  country: string;
  onQuery: (v: string) => void;
  onCountry: (v: string) => void;
  companies: ReturnType<typeof useProspectSearch<MockCompany>>;
  onSelect: (c: MockCompany) => void;
  errorCode: string | null;
}) {
  return (
    <div className="p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Nome da empresa"
            className="h-9 pl-8"
          />
        </div>
        <Input
          value={country}
          onChange={(e) => onCountry(e.target.value)}
          placeholder="País (ex: Brazil)"
          className="h-9"
        />
      </div>

      <div className="mt-3">
        <ListState
          loading={companies.loading}
          error={companies.error && !errorCode ? companies.error : null}
          empty={!companies.loading && companies.hasSearched && companies.rows.length === 0}
          emptyHint="Nenhuma empresa encontrada — refine o nome/país."
        >
          <ul className="divide-y">
            {companies.rows.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2">
                <img
                  src={c.logo_url}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded bg-muted object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    {c.domain && (
                      <a
                        href={`https://${c.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Globe className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {c.linkedin && (
                      <a
                        href={c.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Linkedin className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.countryFlag} {c.country}
                    {c.city && c.city !== "—" ? ` · ${c.city}` : ""}
                    {c.industry && c.industry !== "—" ? ` · ${c.industry}` : ""}
                    {c.employees ? ` · ${c.employees} func.` : ""}
                  </div>
                </div>
                <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => onSelect(c)}>
                  Selecionar
                </Button>
              </li>
            ))}
          </ul>
        </ListState>
      </div>
    </div>
  );
}

function PeopleView({
  company, people,
}: {
  company: MockCompany;
  people: ReturnType<typeof useProspectSearch<MockPerson>>;
}) {
  return (
    <div className="p-3">
      <div className="mb-3 flex items-center gap-3 rounded-md border bg-muted/30 p-2">
        <img src={company.logo_url} alt="" className="h-9 w-9 rounded bg-muted object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{company.name}</span>
            {company.domain && (
              <a href={`https://${company.domain}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {company.countryFlag} {company.country}
            {company.industry && company.industry !== "—" ? ` · ${company.industry}` : ""}
            {company.employees ? ` · ${company.employees} func.` : ""}
          </div>
        </div>
      </div>

      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        <span>People da empresa</span>
      </div>

      <ListState
        loading={people.loading}
        error={people.error}
        empty={!people.loading && people.hasSearched && people.rows.length === 0}
        emptyHint="Nenhum contato encontrado para esta empresa."
      >
        <ul className="divide-y">
          {people.rows.map((p) => (
            <PersonRow key={p.id} person={p} companyName={company.name} domain={company.domain} />
          ))}
        </ul>
      </ListState>
    </div>
  );
}

function ListState({
  loading, error, empty, emptyHint, children,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyHint: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="space-y-2 py-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
        <AlertCircle className="h-4 w-4 text-red-500" /> {error}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
        <Inbox className="h-4 w-4" /> {emptyHint}
      </div>
    );
  }
  return <>{children}</>;
}

function PersonRow({ person, companyName, domain }: { person: MockPerson; companyName: string; domain: string }) {
  const [revealing, setRevealing] = useState(false);
  const [email, setEmail] = useState<string | null>(person.email ?? null);
  const [err, setErr] = useState<string | null>(null);

  async function reveal() {
    setRevealing(true);
    setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("prospect-enrich", {
        body: {
          id: person.id,
          first_name: person.firstName,
          last_name: person.lastName,
          name: person.fullName,
          organization_name: companyName,
          domain: domain || undefined,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error ?? "enrich_failed");
      const e = data.person?.email ?? data.email ?? null;
      if (e) setEmail(e);
      else setErr("Email não encontrado");
    } catch (e: any) {
      setErr(e?.message ?? "Falha");
    } finally {
      setRevealing(false);
    }
  }

  return (
    <li className="flex items-center gap-3 py-2">
      <img
        src={person.photoUrl ?? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(person.fullName)}`}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full bg-muted object-cover"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{person.fullName}</span>
          {person.personalLinkedin && (
            <a href={person.personalLinkedin} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
              <Linkedin className="h-3.5 w-3.5" />
            </a>
          )}
          {person.seniority && (
            <Badge variant="outline" className="h-4 px-1 text-[10px]">{person.seniority}</Badge>
          )}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {person.jobTitle}
          {person.city && person.city !== "—" ? ` · ${person.city}` : ""}
          {person.country && person.country !== "—" ? `, ${person.country}` : ""}
        </div>
        {email && <div className="mt-0.5 truncate text-xs text-foreground">{email}</div>}
        {err && <div className="mt-0.5 truncate text-xs text-destructive">{err}</div>}
      </div>
      {!email && (
        <Button size="sm" variant="secondary" className="h-7 gap-1 text-xs" onClick={reveal} disabled={revealing}>
          {revealing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
          Email
        </Button>
      )}
    </li>
  );
}