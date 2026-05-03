/**
 * AURORA DESIGN SYSTEM - COMPILAÇÃO COMPLETA 2026
 * Este arquivo centraliza todos os padrões de cores, contrastes, temas e tokens de layout
 * baseados nos conceitos de "Boutique High-End" e "Private Banking".
 */

export const DESIGN_SYSTEM = {
  brand: {
    name: "Aurora Imobi",
    concept: "Private Banking / Boutique High-End",
    signature_color: "#2F80ED", // Azul Aurora Accent
    gold: "hsl(43, 52%, 54%)", // Aurora Gold Assinatura
  },

  /**
   * PADRÕES DE CONTRASTE E ACESSIBILIDADE (WCAG AA+)
   * Garantia de legibilidade cristalina em todos os dispositivos.
   */
  accessibility: {
    contrast_ratios: {
      muted_text: "7.5:1 (WCAG AA+)", // lightness 32% sobre fundo claro
      input_text: "High Contrast (Almost Black on Crema)",
      tekoa_dark: "Neon on Deep Graphite",
    },
    text_containment: "Blindagem Global (No overflow/wrap enforced)",
  },

  /**
   * TEMAS PRINCIPAIS
   */
  themes: {
    // 1. AURORA BOUTIQUE (Light Mode / Estilo Galeria de Arte)
    light: {
      background: {
        main: "#E8E4DF", // Cinza Sofisticado (hsl(30, 15%, 89%))
        card: "#FFFFFF",
        input: "#F2EEE8", // Crema suave (hsl(30, 18%, 95%))
      },
      text: {
        primary: "#1F1F1F", // Grafite Profundo (hsl(0, 0%, 12%))
        secondary: "rgba(31, 31, 31, 0.7)",
        muted: "#525252", // hsl(0, 0%, 32%) - Contraste AA+
        accent_blue: "#1B4D89", // hsl(212, 67%, 32%)
      },
      borders: {
        default: "#E5E7EB",
        input: "#C7C2BA",
      }
    },

    // 2. TEKOA PREMIUM (Dark Mode / Painel Executivo / Tesla Vibe)
    dark: {
      background: {
        main: "#0F1115", // Deep Graphite (hsl(220, 25%, 8%))
        surface: "radial-gradient(1200px 600px at 0% 0%, hsl(212 60% 18% / 0.55), transparent 60%)",
        card_glass: "linear-gradient(180deg, hsl(220 22% 12% / 0.72), hsl(220 25% 9% / 0.85))",
      },
      text: {
        primary: "#F5F5F5", // Off-white (hsl(0, 0%, 96%))
        label: "#B3B3B3", // hsl(0, 0%, 70%)
        focus_neon: "#33E1ED", // Cyan Neon (hsl(187, 92%, 60%))
      },
      effects: {
        blur: "10px (Backdrop Filter)",
        shadow: "0 18px 40px -24px rgba(0,0,0,0.6)",
      }
    }
  },

  /**
   * TOKENS DE CORES CROMÁTICAS (Equipe/Categorias)
   */
  chromatic_palette: {
    aurora_blue: "hsl(212, 67%, 32%)",      // Liderança
    aurora_brown: "hsl(25, 14%, 50%)",     // Bruna / Taupe
    aurora_soft_blue: "hsl(204, 62%, 61%)", // Fernando / Sky
    aurora_graphite: "hsl(0, 0%, 12%)",    // Títulos
    aurora_fendi: "hsl(220, 13%, 70%)",    // Técnico / Vagas
  },

  /**
   * GOVERNANÇA DE LAYOUT E PROFUNDIDADE
   */
  layout: {
    z_index: {
      base: 0,
      card: 1,
      elevated: 5,
      sidebar: 40,
      header: 50,
      dropdown: 100,
      modal: 300,
      toast: 400,
      ai_assistant: 500,
    },
    spacing: {
      header_height: "56px",
      touch_target: "44px (Min)",
      radius_lg: "0.75rem",
    }
  },

  /**
   * PADRÕES DE INTERAÇÃO (Premium Cards)
   */
  components: {
    aurora_card: {
      border: "1px solid rgba(255, 255, 255, 0.12)",
      hover_transform: "translateY(-2px)",
      active_glow: "rgba(47, 128, 237, 0.35)", // Glow azul controlado
    },
    update_button: {
      bg: "#242830",
      border: "#D4B06A", // Champagne Dourado
      foreground: "#F7E6C4",
    }
  }
};

export default DESIGN_SYSTEM;
