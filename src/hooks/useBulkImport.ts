import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  scanListingPage,
  orchestrateBulkImport
} from '@/services/bulkImportService';
import { toast } from 'sonner';

export type Step = 'input' | 'scanning' | 'processing' | 'preview';

export interface ImportedProperty {
  title: string;
  price: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  parking: string;
  location: string;
  description: string;
  images: string[];
  source_url: string;
  selected: boolean;
}

export function useBulkImport() {
  const [step, setStep] = useState<Step>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyUrls, setPropertyUrls] = useState<string[]>([]);
  const [properties, setProperties] = useState<ImportedProperty[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errors, setErrors] = useState<{ url: string; error: string }[]>([]);

  const startScan = useCallback(async (url: string) => {
    console.log('=== BULK IMPORT: Button clicked ===', { url });

    if (!url || !url.trim()) {
      toast.error('Cole um link válido');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('O link deve começar com http:// ou https://');
      return;
    }

    const apiKey = import.meta.env.VITE_FIRECRAWL_API_KEY;
    if (!apiKey) {
      toast.error('Configuração incompleta: VITE_FIRECRAWL_API_KEY não encontrada.');
      console.error('Missing VITE_FIRECRAWL_API_KEY');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStep('scanning');
    setProperties([]);
    setErrors([]);

    try {
      toast.info('Iniciando varredura...');
      console.log('=== BULK IMPORT: Checking auth ===');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Faça login para usar esta funcionalidade');
        setStep('input');
        setIsLoading(false);
        return;
      }

      console.log('=== BULK IMPORT: Calling scanListingPage ===');
      const urls = await scanListingPage(url.trim());
      
      console.log('=== BULK IMPORT: URLs found ===', urls.length);

      if (urls.length === 0) {
        toast.error('Nenhum imóvel encontrado nesta página.');
        setStep('input');
        setIsLoading(false);
        return;
      }

      toast.success(`${urls.length} imóveis encontrados!`);

      // Limit to 200 per session
      const limited = urls.slice(0, 200);
      setPropertyUrls(limited);
      setProgress({ done: 0, total: limited.length });
      setStep('processing');

      console.log('=== BULK IMPORT: Starting orchestration ===');
      // Start extraction
      await orchestrateBulkImport(
        limited,
        (done, total, current) => {
          setProgress({ done, total });
          setProperties(prev => [...prev, { ...current, selected: true }]);
        },
        (failedUrl, errorMsg) => {
          console.warn(`Failed to import ${failedUrl}: ${errorMsg}`);
          setErrors(prev => [...prev, { url: failedUrl, error: errorMsg }]);
          setProgress(prev => ({ ...prev, total: prev.total }));
        }
      );

      console.log('=== BULK IMPORT: Finished ===');
      setStep('preview');
      
    } catch (err: any) {
      console.error('=== BULK IMPORT ERROR ===', err);
      setError(err.message || 'Erro ao escanear página');
      setStep('input');
      toast.error('Erro na importação', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleSelect = useCallback((index: number) => {
    setProperties(prev => 
      prev.map((p, i) => 
        i === index ? { ...p, selected: !p.selected } : p
      )
    );
  }, []);

  const selectAll = useCallback(() => {
    setProperties(prev => prev.map(p => ({ ...p, selected: true })));
  }, []);

  const deselectAll = useCallback(() => {
    setProperties(prev => prev.map(p => ({ ...p, selected: false })));
  }, []);

  const reset = useCallback(() => {
    setStep('input');
    setIsLoading(false);
    setError(null);
    setPropertyUrls([]);
    setProperties([]);
    setProgress({ done: 0, total: 0 });
    setErrors([]);
  }, []);

  return {
    step, 
    isLoading, 
    error, 
    propertyUrls,
    properties, 
    progress, 
    errors,
    startScan, 
    toggleSelect, 
    selectAll,
    deselectAll, 
    reset,
    setStep
  };
}
