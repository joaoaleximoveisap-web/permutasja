import { useState, useRef, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { MessageSquare, Send, Sparkles, Building2, Search, ArrowRight, Home, MapPin, DollarSign, Bed, Repeat2 } from "lucide-react";
import { useProperties } from "@/contexts/PropertiesContext";
import { Property } from "@/lib/types";
import { formatBRL, uid } from "@/lib/property-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PropertyDetail } from "@/components/PropertyDetail";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  results?: Property[];
  intent?: any;
};

export default function SmartSearch() {
  const { properties } = useProperties();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      role: "assistant",
      content: "Olá! Sou seu assistente de busca inteligente. Descreva o que seu cliente procura em linguagem natural e eu encontrarei os melhores matches na sua carteira.",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const parseIntent = (text: string) => {
    const q = text.toLowerCase();
    
    // Extract numbers (price, bedrooms)
    const priceMatch = q.match(/(?:até|por|no máximo|valor de|r\$)\s*([\d.]+k?|[\d.,]+)/i);
    const bedMatch = q.match(/(\d+)\s*(?:quartos?|dormitórios?|suítes?)/i);
    
    let maxPrice = Infinity;
    if (priceMatch) {
      let p = priceMatch[1].toLowerCase().replace(/r\$/g, '').trim();
      if (p.endsWith('k')) maxPrice = parseFloat(p) * 1000;
      else if (p.includes('milhão') || p.includes('milhões')) maxPrice = parseFloat(p) * 1000000;
      else maxPrice = parseFloat(p.replace(/\./g, '').replace(',', '.'));
    }

    const beds = bedMatch ? parseInt(bedMatch[1], 10) : 0;
    const hasPermuta = q.includes("permuta") || q.includes("troca");
    
    const type = q.includes("casa") ? "Casa" 
               : q.includes("apartamento") ? "Apartamento"
               : q.includes("terreno") ? "Terreno"
               : undefined;

    return { maxPrice, beds, hasPermuta, type, raw: q };
  };

  const matchEngine = (intent: any): Property[] => {
    return properties.map(p => {
      let score = 0;
      
      // Exact type match
      if (intent.type && p.type === intent.type) score += 30;
      
      // Bedroom match
      if (intent.beds > 0) {
        if (p.bedrooms === intent.beds) score += 25;
        else if (p.bedrooms > intent.beds) score += 15;
      }
      
      // Price scoring
      if (p.price <= intent.maxPrice) {
        score += 30;
        // Boost if price is close to max but not over
        if (p.price >= intent.maxPrice * 0.8) score += 10;
      } else if (p.price <= intent.maxPrice * 1.2) {
        // Price tolerance (+20%)
        score += 10;
      }
      
      // Permuta match
      if (intent.hasPermuta && p.permuta.enabled) score += 20;

      // Keyword matching
      const keywords = ["luxo", "alto padrão", "condomínio", "piscina"];
      keywords.forEach(k => {
        if (intent.raw.includes(k) && (p.description.toLowerCase().includes(k) || p.title.toLowerCase().includes(k))) {
          score += 5;
        }
      });

      return { ...p, matchScore: score };
    })
    .filter(p => (p as any).matchScore > 20)
    .sort((a, b) => (b as any).matchScore - (a as any).matchScore)
    .slice(0, 8);
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput("");
    const newMsgId = uid();
    setMessages(prev => [...prev, { id: newMsgId, role: "user", content: userMsg }]);
    setIsTyping(true);

    // Intent Parsing + Match Engine
    setTimeout(() => {
      const intent = parseIntent(userMsg);
      const results = matchEngine(intent);
      
      let response = "";
      if (results.length > 0) {
        response = `Encontrei alguns imóveis interessantes com base no seu pedido. Priorizei os que melhor se encaixam no perfil:`;
      } else {
        response = "Não encontrei nenhum imóvel exatamente com esses critérios, mas aqui estão as opções mais próximas na sua carteira:";
      }

      setMessages(prev => [...prev, { 
        id: uid(), 
        role: "assistant", 
        content: response, 
        results: results.length > 0 ? results : properties.slice(0, 3),
        intent 
      }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <AppShell>
      <div className="max-w-[1000px] mx-auto h-[calc(100dvh-120px)] md:h-[calc(100vh-160px)] flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-border p-6 md:px-8 rounded-t-[2rem] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/10">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Busca Inteligente</h1>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Assistente IA Ativo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-8 p-6 md:p-8 bg-background scroll-smooth"
        >
          {messages.map((m) => (
            <div key={m.id} className={cn(
              "flex flex-col gap-3",
              m.role === "user" ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-4 text-sm font-medium leading-relaxed shadow-sm",
                m.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-tr-none" 
                  : "bg-white border border-border/50 text-foreground rounded-tl-none"
              )}>
                {m.content}
              </div>

              {m.results && m.results.length > 0 && (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {m.results.map(p => (
                    <div 
                      key={p.id} 
                      className="bg-white rounded-3xl overflow-hidden border border-border/50 hover:shadow-xl transition-all group flex flex-col"
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <img src={p.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-bold shadow-sm uppercase">
                            {p.type}
                          </span>
                        </div>
                        {p.permuta.enabled && (
                          <div className="absolute top-4 right-4 bg-accent text-white text-[9px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shadow-lg">
                            <Repeat2 className="h-3 w-3" /> PERMUTA
                          </div>
                        )}
                      </div>
                      <div className="p-5 flex-1 space-y-3">
                        <div className="text-2xl font-bold tracking-tight text-primary">{formatBRL(p.price)}</div>
                        <h4 className="text-sm font-semibold text-foreground/80 line-clamp-1">{p.title}</h4>
                        <div className="flex items-center gap-4 text-[11px] text-muted-foreground/80 font-medium">
                          <span className="flex items-center gap-1.5"><Bed className="h-3.5 w-3.5" />{p.bedrooms}</span>
                          <span className="flex items-center gap-1.5"><Home className="h-3.5 w-3.5" />{p.area}m²</span>
                          <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{p.city}</span>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full rounded-xl text-xs font-bold h-10 mt-2 bg-primary hover:bg-primary/90"
                          onClick={() => setSelectedProperty(p)}
                        >
                          Detalhes do Imóvel <ArrowRight className="h-3.5 w-3.5 ml-2" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex items-center gap-1 p-4 glass rounded-2xl w-20 animate-pulse">
              <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce"></span>
              <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white p-6 md:px-8 rounded-b-[2rem] border-t border-border shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Descreva o que seu cliente procura..."
                className="w-full bg-background/50 border border-border/50 rounded-2xl py-3.5 pl-4 pr-12 text-sm focus:ring-2 focus:ring-primary transition-all outline-none"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
             {["Casa 3 quartos Londrina", "Apartamento com permuta", "Até 1 milhão"].map(hint => (
               <button 
                key={hint}
                onClick={() => setInput(hint)}
                className="text-[10px] whitespace-nowrap px-3 py-1.5 rounded-full border border-border/50 hover:bg-muted transition-colors text-muted-foreground"
               >
                 {hint}
               </button>
             ))}
          </div>
        </div>
      </div>

      <PropertyDetail 
        property={selectedProperty} 
        open={!!selectedProperty} 
        onOpenChange={(open) => !open && setSelectedProperty(null)} 
      />
    </AppShell>
  );
}