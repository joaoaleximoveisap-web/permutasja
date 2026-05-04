import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search, Heart, MessageCircle, Share2, Network,
  MapPin, Clock, User, DollarSign, Sparkles, TrendingUp, Filter,
} from "lucide-react";
import { formatBRL } from "@/lib/property-utils";
import { cn } from "@/lib/utils";

type Lead = {
  id: string;
  data_original: string;
  corretor: string;
  tipo: string;
  localizacao: string[];
  preco_min: number | null;
  preco_max: number | null;
  observacoes: string | null;
  status: string | null;
};

type Offer = {
  id: string;
  data_original: string;
  corretor: string;
  tipo: string | null;
  codigo: string | null;
  preco: number | null;
  bairro: string | null;
  link: string | null;
};

const TIPO_FILTERS = ["Todos", "Compra", "Venda", "Permuta", "Locação"];

export default function Demandas() {
  const [query, setQuery] = useState("");
  const [tipoFilter, setTipoFilter] = useState("Todos");

  const { data: leads = [], isLoading: l1 } = useQuery<Lead[]>({
    queryKey: ["demandas-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const { data: offers = [], isLoading: l2 } = useQuery<Offer[]>({
    queryKey: ["demandas-offers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_offers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Offer[];
    },
  });

  const filteredLeads = useMemo(() => {
    const q = query.toLowerCase().trim();
    return leads.filter((l) => {
      const matchTipo =
        tipoFilter === "Todos" ||
        (l.tipo || "").toLowerCase().includes(tipoFilter.toLowerCase());
      const hay = [
        l.corretor, l.tipo, l.observacoes, ...(l.localizacao || []),
      ].join(" ").toLowerCase();
      return matchTipo && (!q || hay.includes(q));
    });
  }, [leads, query, tipoFilter]);

  const filteredOffers = useMemo(() => {
    const q = query.toLowerCase().trim();
    return offers.filter((o) => {
      const hay = [o.corretor, o.tipo, o.bairro, o.codigo].join(" ").toLowerCase();
      return !q || hay.includes(q);
    });
  }, [offers, query]);

  return (
    <AppShell>
      <div className="min-h-screen -mx-4 md:-mx-0 -my-6 md:-my-8 bg-[#0B0B0B] text-white">
        {/* HERO */}
        <div className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-transparent" />
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-20 space-y-8">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-accent">
              <Sparkles className="h-3 w-3" /> Central de Inteligência
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.95]">
              Demandas <span className="italic font-serif text-accent">conectadas</span>.
            </h1>
            <p className="text-lg text-white/60 max-w-2xl font-medium">
              Cada demanda registrada vira oportunidade. Cada interação, um match em potencial.
            </p>

            {/* Busca + filtros */}
            <div className="flex flex-col md:flex-row gap-4 pt-4">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por região, corretor, tipo..."
                  className="pl-11 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-2xl text-sm focus-visible:ring-accent/50"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <Filter className="h-4 w-4 text-white/40 shrink-0" />
                {TIPO_FILTERS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTipoFilter(t)}
                    className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      tipoFilter === t
                        ? "bg-accent text-white shadow-lg shadow-accent/30"
                        : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats rápidos */}
            <div className="grid grid-cols-3 gap-4 pt-6 max-w-2xl">
              <Stat label="Demandas" value={leads.length} />
              <Stat label="Ofertas" value={offers.length} />
              <Stat label="Matches" value="—" hint="em breve" />
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
          <Tabs defaultValue="feed" className="space-y-10">
            <TabsList className="bg-white/5 border border-white/10 rounded-2xl p-1.5 h-auto">
              <TabsTrigger
                value="feed"
                className="rounded-xl px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-accent data-[state=active]:text-white text-white/40"
              >
                Feed Social
              </TabsTrigger>
              <TabsTrigger
                value="ofertas"
                className="rounded-xl px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-accent data-[state=active]:text-white text-white/40"
              >
                Inventário
              </TabsTrigger>
              <TabsTrigger
                value="grafo"
                disabled
                className="rounded-xl px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/20"
              >
                Mapa Mental · Em breve
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feed" className="space-y-12 animate-in fade-in duration-500">
              {/* Linha Netflix: Recentes */}
              <NetflixRow title="Recentes" subtitle="Última hora">
                {(l1 ? skeletons(4) : filteredLeads.slice(0, 12).map((l) => (
                  <DemandCard key={l.id} lead={l} />
                )))}
              </NetflixRow>

              {/* Linha Netflix: Alto Padrão */}
              <NetflixRow
                title="Alto Padrão"
                subtitle="Acima de R$ 800.000"
                accent
              >
                {(l1 ? skeletons(4) : filteredLeads
                  .filter((l) => (l.preco_max || 0) >= 800000)
                  .slice(0, 12)
                  .map((l) => <DemandCard key={l.id} lead={l} />))}
              </NetflixRow>

              {/* Grid completo */}
              <div className="space-y-6 pt-6">
                <div className="flex items-end justify-between border-b border-white/5 pb-4">
                  <h2 className="text-2xl font-bold tracking-tight">
                    Todas as <span className="italic font-serif text-accent">demandas</span>
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    {filteredLeads.length} resultados
                  </span>
                </div>

                {filteredLeads.length === 0 && !l1 ? (
                  <EmptyState query={query} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLeads.map((l) => (
                      <DemandCard key={l.id} lead={l} expanded />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ofertas" className="animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {l2
                  ? skeletons(6)
                  : filteredOffers.map((o) => <OfferCard key={o.id} offer={o} />)}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}

/* ------------- Subcomponents ------------- */

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
      <div className="text-3xl font-bold tracking-tighter">{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 mt-1">
        {label} {hint && <span className="text-accent/60 normal-case font-medium tracking-normal">· {hint}</span>}
      </div>
    </div>
  );
}

function NetflixRow({
  title, subtitle, accent, children,
}: { title: string; subtitle?: string; accent?: boolean; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children];
  if (items.length === 0) return null;
  return (
    <section className="space-y-4">
      <div className="flex items-end gap-4">
        <h3 className={cn(
          "text-xl md:text-2xl font-bold tracking-tight",
          accent && "text-accent"
        )}>
          {title}
        </h3>
        {subtitle && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 pb-1">
            {subtitle}
          </span>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory scrollbar-thin">
        {items.map((child, i) => (
          <div key={i} className="snap-start shrink-0 w-[320px]">
            {child}
          </div>
        ))}
      </div>
    </section>
  );
}

function DemandCard({ lead, expanded }: { lead: Lead; expanded?: boolean }) {
  const [liked, setLiked] = useState(false);

  return (
    <article className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-2xl overflow-hidden hover:border-accent/40 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-accent/10 cursor-pointer h-full flex flex-col">
      {/* Header com gradient */}
      <div className="relative h-24 bg-gradient-to-br from-accent/30 via-accent/10 to-transparent border-b border-white/5">
        <div className="absolute inset-0 flex items-center justify-between px-5">
          <div className="h-12 w-12 rounded-full bg-accent/30 backdrop-blur-md border border-accent/40 flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <Badge className="bg-black/40 text-accent border-accent/30 text-[9px] font-black uppercase tracking-widest backdrop-blur-md">
            {lead.tipo || "Demanda"}
          </Badge>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0B0B0B] to-transparent" />
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 flex-1 flex flex-col">
        <div>
          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">
            <Clock className="h-3 w-3" /> {lead.data_original}
          </div>
          <h4 className="text-white font-bold text-lg leading-tight">{lead.corretor}</h4>
        </div>

        <div className="space-y-2 flex-1">
          {lead.localizacao?.length > 0 && (
            <div className="flex items-start gap-2 text-sm text-white/70">
              <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <span className="leading-snug">{lead.localizacao.join(" · ")}</span>
            </div>
          )}
          {lead.preco_max && (
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <DollarSign className="h-4 w-4 text-accent" />
              Até {formatBRL(lead.preco_max)}
            </div>
          )}
          {expanded && lead.observacoes && (
            <p className="text-xs text-white/40 italic border-l-2 border-accent/30 pl-3 mt-3 line-clamp-3">
              "{lead.observacoes}"
            </p>
          )}
        </div>

        {/* Social actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center gap-1">
            <SocialBtn
              icon={Heart}
              active={liked}
              onClick={(e) => { e.stopPropagation(); setLiked(!liked); }}
            />
            <SocialBtn icon={MessageCircle} />
            <SocialBtn icon={Share2} />
          </div>
          <button className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-accent hover:text-white transition-colors">
            <Network className="h-3 w-3" /> Conexões
          </button>
        </div>
      </div>
    </article>
  );
}

function SocialBtn({
  icon: Icon, active, onClick,
}: { icon: React.ElementType; active?: boolean; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "h-8 w-8 rounded-full hover:bg-white/10",
        active ? "text-accent" : "text-white/40 hover:text-white"
      )}
    >
      <Icon className={cn("h-4 w-4", active && "fill-accent")} />
    </Button>
  );
}

function OfferCard({ offer }: { offer: Offer }) {
  return (
    <article className="group bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-2xl p-5 hover:border-accent/40 transition-all hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-white/30">
          <Clock className="h-3 w-3" /> {offer.data_original}
        </div>
        {offer.codigo && (
          <Badge variant="outline" className="border-accent/30 text-accent text-[9px] font-black uppercase">
            {offer.codigo}
          </Badge>
        )}
      </div>
      <h4 className="font-bold text-lg text-white mb-3">{offer.corretor}</h4>
      <div className="space-y-2 text-sm text-white/70">
        {offer.tipo && <div>{offer.tipo}</div>}
        {offer.bairro && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3 text-accent" /> {offer.bairro}
          </div>
        )}
        {offer.preco && (
          <div className="text-2xl font-bold text-accent pt-2">{formatBRL(offer.preco)}</div>
        )}
      </div>
      {offer.link && (
        <a
          href={offer.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-accent underline decoration-accent/30 underline-offset-4"
        >
          Ver Detalhes
        </a>
      )}
    </article>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="text-center py-24 space-y-4 border border-dashed border-white/10 rounded-3xl">
      <TrendingUp className="h-10 w-10 text-white/20 mx-auto" />
      <h3 className="text-xl font-bold">Nenhuma demanda encontrada</h3>
      <p className="text-sm text-white/40">
        {query ? `Nada para "${query}"` : "Ainda não há demandas cadastradas."}
      </p>
    </div>
  );
}

function skeletons(n: number) {
  return Array.from({ length: n }).map((_, i) => (
    <div
      key={i}
      className="h-[280px] rounded-2xl bg-white/5 border border-white/5 animate-pulse"
    />
  ));
}
