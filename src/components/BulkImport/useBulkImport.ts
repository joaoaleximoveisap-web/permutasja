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
    try {
      setStep('scanning');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: sess, error: sessErr } = await supabase
        .from('import_sessions')
        .insert({ source_url: url, user_id: user.id, status: 'scanning' })
        .select()
        .single();

      if (sessErr) throw sessErr;
      setSession(sess as any);

      const { error: funcErr } = await supabase.functions.invoke('scan-listing-page', {
        body: { session_id: sess.id, url }
      });

      if (funcErr) throw funcErr;
    } catch (err: any) {
      toast.error("Erro ao iniciar varredura", { description: err.message });
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