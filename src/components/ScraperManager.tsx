import { useState, useEffect } from "react";
import { useBuilder } from "@/contexts/BuilderContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Play, Loader2, Database, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ImportLog {
  id: string;
  status: string;
  message: string;
  created_at: string;
}

export default function ScraperManager() {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchLogs();
    
    // Subscribe to new logs
    const channel = supabase
      .channel('import_logs_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'import_logs' }, (payload) => {
        setLogs((prev) => [payload.new as ImportLog, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('import_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setLogs(data);
  };

  const startImport = async () => {
    setIsImporting(true);
    toast.info("Iniciando processo de extração estruturada...");

    try {
      const { data, error } = await supabase.functions.invoke('orchestrate-import', {
        body: { targetUrl: 'https://www.auroraimobi.com.br/imoveis/venda' }
      });

      if (error) throw error;
      toast.success(`Importação finalizada! ${data.totalImported} imóveis processados.`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao conectar com o motor de extração.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Motor de Extração Aurora</h1>
          <p className="text-muted-foreground mt-1">Sincronização de objetos estruturados via Edge Functions.</p>
        </div>
        <Button 
          onClick={startImport} 
          disabled={isImporting}
          className="bg-accent hover:bg-accent/90 text-white font-bold"
        >
          {isImporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {isImporting ? "Extraindo..." : "Iniciar Extração"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Log de Objetos (Real-time)
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-black/5">
              <div className="space-y-4">
                {logs.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground py-10">Nenhum log registrado ainda.</p>
                )}
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-3 text-xs animate-in fade-in slide-in-from-left-2">
                    <div className="mt-0.5">
                      {log.status === 'success' ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : log.status === 'processing' ? (
                        <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "font-medium",
                        log.status === 'success' ? "text-green-700" : "text-foreground"
                      )}>
                        {log.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Status do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Edge Functions</span>
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">ONLINE</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">CORS Policy</span>
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Estrutura JSON</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">OBJECT-FIRST</span>
              </div>
            </CardContent>
          </Card>
          
          <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent">Configuração de Alvo</h4>
            <p className="text-xs text-muted-foreground truncate">auroraimobi.com.br/imoveis/venda</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
