import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BuilderElement {
  id: string;
  type: string;
  name: string;
  props: Record<string, any>;
  styles: Record<string, any>;
  children: string[];
}

interface BuilderConfig {
  rootElementId: string;
  elements: Record<string, BuilderElement>;
  selectedElementIds: string[];
}

interface BuilderContextType {
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  selectedElement: string | null;
  setSelectedElement: (id: string | null) => void;
  uiConfigs: Record<string, any>;
  updateConfig: (elementId: string, settings: any) => Promise<void>;
  
  // Advanced Visual Builder state
  config: BuilderConfig;
  selectElement: (id: string | null, multi?: boolean) => void;
  updateElementStyle: (id: string, style: any) => void;
  updateElementProps: (id: string, props: any) => void;
  undo: () => void;
  redo: () => void;
}

const DEFAULT_CONFIG: BuilderConfig = {
  rootElementId: "root",
  elements: {
    root: {
      id: "root",
      type: "section",
      name: "Main Section",
      props: {},
      styles: { backgroundColor: "#ffffff", paddingTop: 40, paddingBottom: 40 },
      children: ["title-1", "para-1"]
    },
    "title-1": {
      id: "title-1",
      type: "text",
      name: "Main Title",
      props: { text: "Bem-vindo à Aurora Imobi" },
      styles: { fontSize: 48, fontWeight: "bold", color: "#000000", marginBottom: 20 },
      children: []
    },
    "para-1": {
      id: "para-1",
      type: "text",
      name: "Description",
      props: { text: "Sua imobiliária de luxo em Londrina." },
      styles: { fontSize: 18, color: "#666666" },
      children: []
    }
  },
  selectedElementIds: []
};

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

export function BuilderProvider({ children }: { children: React.ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [uiConfigs, setUiConfigs] = useState<Record<string, any>>({});
  
  // Advanced State
  const [config, setConfig] = useState<BuilderConfig>(DEFAULT_CONFIG);
  const [history, setHistory] = useState<BuilderConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [builderHydrated, setBuilderHydrated] = useState(false);
  const builderSaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchConfigs();
    // Hydrate Visual Builder config
    (async () => {
      const { data } = await supabase
        .from("ui_config")
        .select("settings")
        .eq("element_id", "builder::config")
        .maybeSingle();
      if (data?.settings) {
        setConfig(data.settings as unknown as BuilderConfig);
      }
      setBuilderHydrated(true);
    })();
  }, []);

  // Auto-save Visual Builder config (debounced) after hydration
  useEffect(() => {
    if (!builderHydrated) return;
    if (builderSaveTimer.current) clearTimeout(builderSaveTimer.current);
    builderSaveTimer.current = setTimeout(() => {
      supabase
        .from("ui_config")
        .upsert(
          { element_id: "builder::config", settings: config as any },
          { onConflict: "element_id" }
        )
        .then(() => {});
    }, 500);
  }, [config, builderHydrated]);

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

  const selectElement = useCallback((id: string | null, multi = false) => {
    setConfig(prev => {
      let newSelected: string[] = [];
      if (id === null) {
        newSelected = [];
      } else if (multi) {
        newSelected = prev.selectedElementIds.includes(id) 
          ? prev.selectedElementIds.filter(sid => sid !== id)
          : [...prev.selectedElementIds, id];
      } else {
        newSelected = [id];
      }
      return { ...prev, selectedElementIds: newSelected };
    });
    setSelectedElement(id);
  }, []);

  const updateElementStyle = useCallback((id: string, style: any) => {
    setConfig(prev => {
      const element = prev.elements[id];
      if (!element) return prev;
      
      const newConfig = {
        ...prev,
        elements: {
          ...prev.elements,
          [id]: {
            ...element,
            styles: { ...element.styles, ...style }
          }
        }
      };
      
      return newConfig;
    });
  }, []);

  const updateElementProps = useCallback((id: string, props: any) => {
    setConfig(prev => {
      const element = prev.elements[id];
      if (!element) return prev;
      
      return {
        ...prev,
        elements: {
          ...prev.elements,
          [id]: {
            ...element,
            props: { ...element.props, ...props }
          }
        }
      };
    });
  }, []);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setConfig(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setConfig(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  return (
    <BuilderContext.Provider value={{ 
      isEditMode, 
      setIsEditMode, 
      selectedElement, 
      setSelectedElement,
      uiConfigs,
      updateConfig,
      config,
      selectElement,
      updateElementStyle,
      updateElementProps,
      undo,
      redo
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
