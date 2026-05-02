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
    setIsLoading(true);
    setError(null);
    setStep('scanning');
    setProperties([]);
    setErrors([]);

    try {
      // Check auth FIRST
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Faça login para usar esta funcionalidade');
        setStep('input');
        setIsLoading(false);
        return;
      }

      const urls = await scanListingPage(url);
      
      if (urls.length === 0) {
        setError('Nenhum imóvel encontrado nesta página. Tente uma página de listagem com imóveis visíveis.');
        setStep('input');
        setIsLoading(false);
        return;
      }

      // Limit to 200 per session
      const limited = urls.slice(0, 200);
      setPropertyUrls(limited);
      setProgress({ done: 0, total: limited.length });
      setStep('processing');

      // Start extraction
      await orchestrateBulkImport(
        limited,
        (done, total, current) => {
          setProgress({ done, total });
          setProperties(prev => [...prev, { ...current, selected: true }]);
        },
        (failedUrl, errorMsg) => {
          setErrors(prev => [...prev, { url: failedUrl, error: errorMsg }]);
          // Update total count if items are failing to keep progress bar accurate
          setProgress(prev => ({ ...prev }));
        }
      );

      setStep('preview');
      
    } catch (err: any) {
      console.error('Bulk import error:', err);
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
