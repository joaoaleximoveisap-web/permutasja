import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Home, MessageSquare, User, Clock, MapPin, DollarSign } from "lucide-react";
import { formatBRL } from "@/lib/property-utils";

export function DemandsCard() {
  const { data: leads, isLoading: loadingLeads } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: offers, isLoading: loadingOffers } = useQuery({
    queryKey: ["inventory_offers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_offers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (loadingLeads || loadingOffers) {
    return (
      <Card className="bg-black/40 backdrop-blur-xl border-accent/20 h-[600px] animate-pulse">
        <CardContent className="h-full flex items-center justify-center">
          <div className="text-accent text-xs font-bold uppercase tracking-widest">Carregando Inteligência Aurora...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/60 backdrop-blur-3xl border-accent/30 shadow-2xl overflow-hidden rounded-[2.5rem]">
      <CardHeader className="border-b border-accent/10 bg-accent/5 py-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold tracking-tighter text-white flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-accent" />
            Central de <span className="text-accent italic font-serif">Demandas</span>
          </CardTitle>
          <Badge variant="outline" className="border-accent/40 text-accent font-black uppercase text-[9px] tracking-widest px-3">
            Live Feed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="demandas" className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-black/40 rounded-none border-b border-accent/10 h-14 p-0">
            <TabsTrigger 
              value="demandas" 
              className="rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-accent text-white/40 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Demandas ({leads?.length || 0})
            </TabsTrigger>
            <TabsTrigger 
              value="ofertas" 
              className="rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-accent text-white/40 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Ofertas ({offers?.length || 0})
            </TabsTrigger>
            <TabsTrigger 
              value="interacoes" 
              className="rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-accent text-white/40 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Interações
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[450px]">
            <TabsContent value="demandas" className="m-0 p-6 space-y-4">
              {leads?.map((lead) => (
                <div key={lead.id} className="group relative bg-white/5 border border-white/10 p-5 rounded-2xl hover:border-accent/40 transition-all hover:bg-accent/5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-widest">
                      <Clock className="h-3 w-3" /> {lead.data_original}
                    </div>
                    <Badge className="bg-accent/20 text-accent hover:bg-accent/30 text-[9px] font-black uppercase">
                      {lead.tipo}
                    </Badge>
                  </div>
                  <h4 className="text-white font-bold text-lg leading-tight mb-2 flex items-center gap-2">
                    <User className="h-4 w-4 text-accent/60" /> {lead.corretor}
                  </h4>
                  <div className="space-y-2 text-sm text-white/70">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <span>{lead.localizacao.join(", ")}</span>
                    </div>
                    {lead.preco_max && (
                      <div className="flex items-center gap-2 font-bold text-white">
                        <DollarSign className="h-4 w-4 text-accent" />
                        Até {formatBRL(lead.preco_max)}
                      </div>
                    )}
                    <p className="italic text-white/50 border-l-2 border-accent/20 pl-3 mt-3 text-xs">
                      "{lead.observacoes}"
                    </p>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="ofertas" className="m-0 p-6 space-y-4">
              {offers?.map((offer) => (
                <div key={offer.id} className="group bg-white/5 border border-white/10 p-5 rounded-2xl hover:border-accent/40 transition-all hover:bg-accent/5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-widest">
                      <Clock className="h-3 w-3" /> {offer.data_original}
                    </div>
                    <Badge variant="outline" className="border-accent text-accent text-[9px] font-black uppercase">
                      {offer.codigo || 'OFERTA'}
                    </Badge>
                  </div>
                  <h4 className="text-white font-bold text-lg mb-2">{offer.corretor}</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-xs font-bold text-white/60">
                      <span className="flex items-center gap-1"><Home className="h-3 w-3 text-accent" /> {offer.tipo || 'Imóvel'}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-accent" /> {offer.bairro}</span>
                    </div>
                    {offer.preco && (
                      <div className="text-xl font-bold text-accent">{formatBRL(offer.preco)}</div>
                    )}
                    {offer.link && (
                      <a href={offer.link} target="_blank" rel="noopener noreferrer" className="inline-block text-[10px] font-black uppercase tracking-widest text-white hover:text-accent transition-colors underline decoration-accent/30 underline-offset-4">
                        Ver Detalhes do Ativo
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="interacoes" className="m-0 p-6 space-y-3">
              {[
                "Aceita lancha?", "Fundos, 12º andar", "Vou te chamar no PV", "Tenho Arch a 1.100.000", "Boa"
              ].map((msg, i) => (
                <div key={i} className="flex gap-3 items-start bg-white/5 p-4 rounded-xl border border-white/5">
                  <MessageSquare className="h-4 w-4 text-accent shrink-0 mt-1" />
                  <p className="text-sm text-white/80 font-medium">"{msg}"</p>
                </div>
              ))}
              <div className="pt-6 text-center">
                <p className="text-[10px] text-white/30 uppercase font-black tracking-[0.3em]">Fim do Log de Inteligência</p>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
