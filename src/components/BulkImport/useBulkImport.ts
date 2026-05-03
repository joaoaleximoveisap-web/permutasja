import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ImportSession, ImportJob } from './bulkImportTypes';
import { toast } from 'sonner';

export function useBulkImport() {
  const [step, setStep] = useState<'input' | 'scanning' | 'processing' | 'preview'>('input');
  const [session, setSession] = useState<ImportSession | null>(null);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  const startScan = async (url: string) => {
    if (!url.trim() || !url.startsWith("http")) {
      toast.error("URL inválida", { description: "Por favor, insira um link completo começando com http ou https." });
      return;
    }

    console.log("[BulkImport] Iniciando varredura para:", url);
    try {
      setStep('scanning');
      
      // 1. Auth Guard - Check session
      console.log("[BulkImport] Passo 1: Verificando autenticação...");
      const { data: { session: authSession }, error: authCheckError } = await supabase.auth.getSession();
      
      if (authCheckError) {
        throw new Error(`Erro na sessão: ${authCheckError.message}`);
      }
      
      if (!authSession?.user) {
        throw new Error("Sessão expirada ou não encontrada. Por favor, faça login novamente.");
      }

      const jwt = authSession.access_token;

      // 2. Create Session Record
      console.log("[BulkImport] Passo 2: Criando registro de sessão...");
      const { data: sess, error: sessErr } = await supabase
        .from('import_sessions')
        .insert({ 
          source_url: url, 
          user_id: authSession.user.id, 
          status: 'scanning' 
        })
        .select()
        .single();

      if (sessErr) {
        throw new Error(`Erro ao criar sessão no banco: ${sessErr.message}`);
      }
      setSession(sess as any);

      // 3. Invoke Edge Function with explicit token
      console.log("[BulkImport] Passo 3: Chamando Edge Function (scan-listing-page)...");
      const { data: funcData, error: funcErr } = await supabase.functions.invoke('scan-listing-page', {
        body: { session_id: sess.id, url },
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      });

      if (funcErr) {
        console.error("[BulkImport] Falha na Edge Function:", funcErr);
        throw new Error(`Erro na Edge Function: ${funcErr.message || "Falha na comunicação"}`);
      }

      if (funcData?.error) {
        console.error("[BulkImport] Erro retornado pela lógica da função:", funcData);
        const detail = funcData.motivo ? `\nMotivo: ${funcData.motivo}` : "";
        throw new Error(`${funcData.error}${detail}`);
      }

      console.log("[BulkImport] Varredura iniciada com sucesso.");
    } catch (err: any) {
      console.error("[BulkImport] Erro fatal no fluxo:", {
        step: step === 'input' ? 'auth/init' : step,
        error: err.message,
        url
      });
      
      toast.error("Falha na varredura", { 
        description: err.message,
        duration: 6000
      });
      setStep('input');
    }
  };

  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`bulk-import-${session.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'import_sessions',
        filter: `id=eq.${session.id}`
      }, (payload) => {
        setSession(payload.new as any);
        if (payload.new.status === 'processing') setStep('processing');
        if (payload.new.status === 'done') setStep('preview');
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'import_jobs',
        filter: `session_id=eq.${session.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setJobs(prev => [...prev, payload.new as any]);
        } else if (payload.eventType === 'UPDATE') {
          setJobs(prev => prev.map(j => j.id === payload.new.id ? payload.new as any : j));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.id]);

  return { step, session, jobs, selectedJobIds, setSelectedJobIds, startScan, setStep };
}