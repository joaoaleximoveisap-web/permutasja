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

    console.log("[Extração] Iniciando extração direta para:", url);
    try {
      setStep('scanning');
      
      // 1. Auth Guard - Check session (Optional for direct extraction)
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const jwt = authSession?.access_token;
      const userId = authSession?.user?.id || "00000000-0000-0000-0000-000000000000";

      // 2. Create Session Record (Guest mode supported)
      console.log("[Extração] Passo 1: Criando registro de sessão...");
      const { data: sess, error: sessErr } = await supabase
        .from('import_sessions')
        .insert({ 
          source_url: url, 
          user_id: userId, 
          status: 'scanning' 
        })
        .select()
        .single();

      if (sessErr) {
        throw new Error(`Erro ao iniciar sessão: ${sessErr.message}`);
      }
      setSession(sess as any);

      // 3. Invoke Edge Function (Whitelisted for direct extraction)
      console.log("[Extração] Passo 2: Chamando API de extração direta...");
      const { data: funcData, error: funcErr } = await supabase.functions.invoke('scan-listing-page', {
        body: { session_id: sess.id, url },
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : {}
      });

      if (funcErr) {
        console.error("[Extração] Falha na API:", funcErr);
        throw new Error(`Falha na comunicação com o servidor: ${funcErr.message}`);
      }

      if (funcData?.error) {
        console.error("[Extração] Erro retornado pela API:", funcData);
        throw new Error(funcData.motivo || funcData.error);
      }

      console.log("[Extração] Extração iniciada com sucesso.");
    } catch (err: any) {
      console.error("[Extração] Erro fatal no fluxo:", { error: err.message, url });
      
      toast.error("Falha na extração", { 
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