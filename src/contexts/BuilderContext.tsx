import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { BuilderConfig, ElementConfig, StyleConfig, ElementType } from "@/lib/builder-types";

interface BuilderContextType {
  config: BuilderConfig;
  selectElement: (id: string | null, multi?: boolean) => void;
  updateElement: (id: string, updates: Partial<ElementConfig>) => void;
  updateElementStyle: (id: string, styles: Partial<StyleConfig>) => void;
  updateElementProps: (id: string, props: Record<string, any>) => void;
  moveElement: (id: string, newParentId: string, index: number) => void;
  createClass: (name: string, styles: StyleConfig) => void;
  applyClass: (id: string, className: string) => void;
  undo: () => void;
  redo: () => void;
}

const initialConfig: BuilderConfig = {
  elements: {
    "root": {
      id: "root",
      type: "container",
      name: "Page",
      styles: { paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0 },
      children: ["header-1", "hero-1"],
      props: {},
    },
    "header-1": {
      id: "header-1",
      type: "container",
      name: "Header",
      parentId: "root",
      styles: { backgroundColor: "#ffffff", paddingBottom: 20, paddingTop: 20 },
      children: [],
      props: {},
    },
    "hero-1": {
      id: "hero-1",
      type: "section",
      name: "Hero Section",
      parentId: "root",
      styles: { paddingTop: 80, paddingBottom: 80, backgroundColor: "#f9f9f9" },
      children: ["hero-title"],
      props: {},
    },
    "hero-title": {
      id: "hero-title",
      type: "text",
      name: "Title",
      parentId: "hero-1",
      styles: { fontSize: 48, fontWeight: "800", color: "#1a1a1a", marginBottom: 20 },
      children: [],
      props: { text: "Encontre o imóvel dos seus sonhos" },
    }
  },
  rootElementId: "root",
  selectedElementIds: [],
  classes: {},
  globalTokens: {
    colors: {
      primary: "#C6A87D",
      background: "#FFFFFF",
      text: "#1A1A1A",
    },
    fonts: {
      heading: "Fraunces",
      body: "Inter",
    }
  }
};

const BuilderContext = createContext<BuilderContextType | null>(null);

export function BuilderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BuilderConfig>(initialConfig);
  const [history, setHistory] = useState<BuilderConfig[]>([initialConfig]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const saveToHistory = useCallback((newConfig: BuilderConfig) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newConfig);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const selectElement = (id: string | null, multi: boolean = false) => {
    setConfig(prev => {
      if (!id) return { ...prev, selectedElementIds: [] };
      if (multi) {
        const isSelected = prev.selectedElementIds.includes(id);
        const newIds = isSelected 
          ? prev.selectedElementIds.filter(i => i !== id)
          : [...prev.selectedElementIds, id];
        return { ...prev, selectedElementIds: newIds };
      }
      return { ...prev, selectedElementIds: [id] };
    });
  };

  const updateElement = (id: string, updates: Partial<ElementConfig>) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        elements: {
          ...prev.elements,
          [id]: { ...prev.elements[id], ...updates }
        }
      };
      saveToHistory(newConfig);
      return newConfig;
    });
  };

  const updateElementStyle = (id: string, styles: Partial<StyleConfig>) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        elements: {
          ...prev.elements,
          [id]: {
            ...prev.elements[id],
            styles: { ...prev.elements[id].styles, ...styles }
          }
        }
      };
      saveToHistory(newConfig);
      return newConfig;
    });
  };

  const updateElementProps = (id: string, props: Record<string, any>) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        elements: {
          ...prev.elements,
          [id]: {
            ...prev.elements[id],
            props: { ...prev.elements[id].props, ...props }
          }
        }
      };
      saveToHistory(newConfig);
      return newConfig;
    });
  };

  const moveElement = (id: string, newParentId: string, index: number) => {
    setConfig(prev => {
      const element = prev.elements[id];
      const oldParentId = element.parentId;
      if (!oldParentId) return prev;

      const newElements = { ...prev.elements };
      
      newElements[oldParentId] = {
        ...newElements[oldParentId],
        children: newElements[oldParentId].children.filter(childId => childId !== id)
      };

      const newChildren = [...newElements[newParentId].children];
      newChildren.splice(index, 0, id);
      newElements[newParentId] = {
        ...newElements[newParentId],
        children: newChildren
      };

      newElements[id] = { ...element, parentId: newParentId };

      const newConfig = { ...prev, elements: newElements };
      saveToHistory(newConfig);
      return newConfig;
    });
  };

  const createClass = (name: string, styles: StyleConfig) => {
    setConfig(prev => ({
      ...prev,
      classes: { ...prev.classes, [name]: styles }
    }));
  };

  const applyClass = (id: string, className: string) => {
    setConfig(prev => ({
      ...prev,
      elements: {
        ...prev.elements,
        [id]: { ...prev.elements[id], className }
      }
    }));
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setConfig(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setConfig(history[historyIndex + 1]);
    }
  };

  return (
    <BuilderContext.Provider value={{ 
      config, 
      selectElement, 
      updateElement,
      updateElementStyle, 
      updateElementProps, 
      moveElement, 
      createClass, 
      applyClass,
      undo,
      redo
    }}>
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder() {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error("useBuilder must be used within BuilderProvider");
  return ctx;
}
