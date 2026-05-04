import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ElementOverride {
  text?: string;
  color?: string;
  background?: string;
  fontFamily?: string;
  fontSize?: number; // px
  fontWeight?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  letterSpacing?: number; // px
  lineHeight?: number;
  padding?: number;
  margin?: number;
  borderRadius?: number;
  opacity?: number;
  boxShadow?: string;
  imageUrl?: string;
  videoUrl?: string;
  display?: string;
}

interface LiveEditCtx {
  active: boolean;
  setActive: (v: boolean) => void;
  selectedSelector: string | null;
  setSelectedSelector: (s: string | null) => void;
  overrides: Record<string, ElementOverride>;
  updateOverride: (selector: string, patch: ElementOverride) => void;
  removeOverride: (selector: string) => void;
  applyAll: () => void;
}

const Ctx = createContext<LiveEditCtx | null>(null);
const STYLE_ID = "live-edit-style-tag";

function buildCss(overrides: Record<string, ElementOverride>) {
  let css = "";
  for (const [sel, o] of Object.entries(overrides)) {
    const decls: string[] = [];
    if (o.color) decls.push(`color: ${o.color} !important`);
    if (o.background) decls.push(`background: ${o.background} !important`);
    if (o.fontFamily) decls.push(`font-family: ${o.fontFamily} !important`);
    if (o.fontSize) decls.push(`font-size: ${o.fontSize}px !important`);
    if (o.fontWeight) decls.push(`font-weight: ${o.fontWeight} !important`);
    if (o.textAlign) decls.push(`text-align: ${o.textAlign} !important`);
    if (o.letterSpacing != null) decls.push(`letter-spacing: ${o.letterSpacing}px !important`);
    if (o.lineHeight != null) decls.push(`line-height: ${o.lineHeight} !important`);
    if (o.padding != null) decls.push(`padding: ${o.padding}px !important`);
    if (o.margin != null) decls.push(`margin: ${o.margin}px !important`);
    if (o.borderRadius != null) decls.push(`border-radius: ${o.borderRadius}px !important`);
    if (o.opacity != null) decls.push(`opacity: ${o.opacity} !important`);
    if (o.boxShadow) decls.push(`box-shadow: ${o.boxShadow} !important`);
    if (decls.length) css += `${sel} { ${decls.join("; ")}; }\n`;
  }
  return css;
}

function applyTextAndImages(overrides: Record<string, ElementOverride>) {
  for (const [sel, o] of Object.entries(overrides)) {
    try {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) continue;
      if (o.text != null && el.getAttribute("data-live-text") !== o.text) {
        el.textContent = o.text;
        el.setAttribute("data-live-text", o.text);
      }
      if (o.imageUrl) {
        if (el.tagName === "IMG") {
          (el as HTMLImageElement).src = o.imageUrl;
        } else {
          el.style.backgroundImage = `url(${o.imageUrl})`;
          el.style.backgroundSize = "cover";
          el.style.backgroundPosition = "center";
        }
      }
      if (o.videoUrl) {
        const existing = el.querySelector(":scope > video[data-live-video]") as HTMLVideoElement | null;
        if (existing) {
          if (existing.src !== o.videoUrl) existing.src = o.videoUrl;
        } else {
          // Hide background image on this element
          el.style.backgroundImage = "none";
          const v = document.createElement("video");
          v.setAttribute("data-live-video", "1");
          v.src = o.videoUrl;
          v.autoplay = true;
          v.loop = true;
          v.muted = true;
          v.playsInline = true;
          v.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;";
          if (getComputedStyle(el).position === "static") el.style.position = "relative";
          el.prepend(v);
        }
      } else {
        const v = el.querySelector(":scope > video[data-live-video]");
        if (v) v.remove();
      }
    } catch {}
  }
}

export function LiveEditProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [selectedSelector, setSelectedSelector] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, ElementOverride>>({});
  const debounceRef = useRef<Record<string, any>>({});

  // Load from supabase
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ui_config").select("element_id, settings");
      if (data) {
        const map: Record<string, ElementOverride> = {};
        for (const row of data) {
          if (row.element_id?.startsWith("live::")) {
            map[row.element_id.slice(6)] = row.settings as ElementOverride;
          }
        }
        setOverrides(map);
      }
    })();
  }, []);

  const applyAll = useCallback(() => {
    let tag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement("style");
      tag.id = STYLE_ID;
      document.head.appendChild(tag);
    }
    tag.textContent = buildCss(overrides);
    applyTextAndImages(overrides);
  }, [overrides]);

  useEffect(() => {
    applyAll();
    const t = setInterval(applyAll, 1500); // re-apply after route changes / re-renders
    return () => clearInterval(t);
  }, [applyAll]);

  const persist = (selector: string, value: ElementOverride) => {
    clearTimeout(debounceRef.current[selector]);
    debounceRef.current[selector] = setTimeout(async () => {
      await supabase
        .from("ui_config")
        .upsert(
          { element_id: `live::${selector}`, settings: value as any },
          { onConflict: "element_id" }
        );
    }, 400);
  };

  const updateOverride = useCallback((selector: string, patch: ElementOverride) => {
    setOverrides((prev) => {
      const merged = { ...(prev[selector] || {}), ...patch };
      const next = { ...prev, [selector]: merged };
      persist(selector, merged);
      return next;
    });
  }, []);

  const removeOverride = useCallback((selector: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[selector];
      return next;
    });
    supabase.from("ui_config").delete().eq("element_id", `live::${selector}`);
  }, []);

  return (
    <Ctx.Provider
      value={{
        active,
        setActive,
        selectedSelector,
        setSelectedSelector,
        overrides,
        updateOverride,
        removeOverride,
        applyAll,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useLiveEdit() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLiveEdit must be used within LiveEditProvider");
  return ctx;
}
