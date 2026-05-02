import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles, X, Building2, Search, ArrowRight } from "lucide-react";
import { useProperties } from "@/contexts/PropertiesContext";
import { Property } from "@/lib/types";
import { formatBRL } from "@/lib/property-utils";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type Message = {
  role: "user" | "assistant";
  content: string;
  results?: Property[];
};

export function SmartSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Sou seu assistente inteligente. Como posso ajudar com sua carteira de imóveis hoje? Você pode pedir algo como 'casas com 3 quartos em Londrina até 800k'.",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const { properties } = useProperties();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const searchProperties = (query: string): Property[] => {
    const q = query.toLowerCase();
    
    // Extract numbers (price, bedrooms)
    const priceMatch = q.match(/(?:até|por|no máximo|valor de)\s*(?:r\$)?\s*([\d.]+k?|[\d.,]+)/i);
    const bedMatch = q.match(/(\d+)\s*(?:quartos?|dormitórios?|suítes?)/i);
    
    let maxPrice = Infinity;
    if (priceMatch) {
      const p = priceMatch[1].toLowerCase();
      if (p.endsWith('k')) maxPrice = parseFloat(p) * 1000;
      else maxPrice = parseFloat(p.replace(/\./g, '').replace(',', '.'));
    }

    const beds = bedMatch ? parseInt(bedMatch[1], 10) : 0;
    
    // Simple keyword matching for city/neighborhood/type
    const words = q.split(/\s+/).filter(w => w.length > 2);
    
    return properties.filter(p => {
      const matchPrice = p.price <= maxPrice;
      const matchBeds = p.bedrooms >= beds;
      
      // Keywords match title, city, neighborhood or type
      const searchableText = `${p.title} ${p.city || ''} ${p.neighborhood || ''} ${p.type || ''}`.toLowerCase();
      const matchKeywords = words.length === 0 || words.some(w => searchableText.includes(w));
      
      return matchPrice && matchBeds && matchKeywords;
    }).slice(0, 5);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsTyping(true);

    // Simulate AI thinking
    setTimeout(() => {
      const results = searchProperties(userMsg);
      let response = "";

      if (results.length > 0) {
        response = `Encontrei ${results.length} imóvel(is) que combinam com o que você procura:`;
      } else {
        response = "Não encontrei imóveis com esses critérios exatos na sua carteira. Tente algo mais amplo ou adicione novos imóveis!";
      }

      setMessages(prev => [...prev, { role: "assistant", content: response, results }]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-primary shadow-lg shadow-primary/30 text-white flex items-center justify-center hover:scale-110 transition-smooth z-40 animate-in fade-in zoom-in duration-300"
      >
        <MessageSquare className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-accent"></span>
        </span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:w-96 sm:h-[600px] bg-background border border-border shadow-2xl sm:rounded-3xl flex flex-col z-50 animate-in slide-in-from-bottom-10 duration-300">
          {/* Header */}
          <div className="p-4 border-bottom bg-gradient-primary text-primary-foreground sm:rounded-t-3xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Busca Inteligente</h3>
                <p className="text-[10px] opacity-80">Online agora</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                  m.role === "user" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-foreground"
                )}>
                  {m.content}
                </div>
                
                {m.results && m.results.length > 0 && (
                  <div className="w-full mt-3 space-y-2">
                    {m.results.map(p => (
                      <Link 
                        key={p.id} 
                        to="/imoveis" 
                        className="flex gap-3 p-2 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors group"
                        onClick={() => setIsOpen(false)}
                      >
                        <div className="h-16 w-20 shrink-0 rounded-lg overflow-hidden border border-border">
                          <img src={p.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-smooth" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{formatBRL(p.price)}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase font-medium">{p.type}</span>
                            <span className="text-[10px] text-muted-foreground">{p.city}</span>
                          </div>
                        </div>
                        <div className="self-center">
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-1 p-3 bg-muted rounded-2xl w-16">
                <span className="h-1.5 w-1.5 bg-foreground/40 rounded-full animate-bounce"></span>
                <span className="h-1.5 w-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="h-1.5 w-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t bg-background sm:rounded-b-3xl">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Ex: casa 3 quartos em Londrina..."
                className="w-full bg-muted border-none rounded-2xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-primary transition-all outline-none"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim()}
                className="absolute right-2 p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-3">
              Desenvolvido com IA para sua imobiliária
            </p>
          </div>
        </div>
      )}
    </>
  );
}