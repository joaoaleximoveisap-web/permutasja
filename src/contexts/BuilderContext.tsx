import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BuilderContextType {
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  selectedElement: string | null;
  setSelectedElement: (id: string | null) => void;
  uiConfigs: Record<string, any>;
  updateConfig: (elementId: string, settings: any) => Promise<void>;
}

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

export function BuilderProvider({ children }: { children: React.ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [uiConfigs, setUiConfigs] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    const { data, error } = await supabase.from("ui_config").select("*");
    if (data) {
      const configs = data.reduce((acc, curr) => ({
        ...acc,
        [curr.element_id]: curr.settings
      }), {});
      setUiConfigs(configs);
    }
  };

  const updateConfig = async (elementId: string, settings: any) => {
    const newConfigs = { ...uiConfigs, [elementId]: settings };
    setUiConfigs(newConfigs);

    await supabase.from("ui_config").upsert({
      element_id: elementId,
      settings: settings
    }, { onConflict: "element_id" });
  };

  return (
    <BuilderContext.Provider value={{ 
      isEditMode, 
      setIsEditMode, 
      selectedElement, 
      setSelectedElement,
      uiConfigs,
      updateConfig
    }}>
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder() {
  const context = useContext(BuilderContext);
  if (context === undefined) {
    throw new Error("useBuilder must be used within a BuilderProvider");
  }
  return context;
}
