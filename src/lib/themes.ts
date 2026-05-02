import { ThemeOption } from "./types";

export const THEMES: ThemeOption[] = [
  {
    id: "sand",
    name: "Areia & Pedra",
    description: "Bege com cinza marrom, vidro suave",
    swatch: ["hsl(35 25% 88%)", "hsl(28 35% 55%)", "hsl(25 30% 25%)"],
    tone: "light",
  },
  {
    id: "midnight",
    name: "Meia-noite",
    description: "Preto premium com azul elétrico",
    swatch: ["hsl(220 15% 10%)", "hsl(200 80% 55%)", "hsl(260 70% 60%)"],
    tone: "dark",
  },
  {
    id: "forest",
    name: "Floresta",
    description: "Verde profundo, natureza",
    swatch: ["hsl(150 20% 12%)", "hsl(90 50% 55%)", "hsl(80 40% 70%)"],
    tone: "dark",
  },
  {
    id: "ocean",
    name: "Oceano",
    description: "Azul profundo e ciano",
    swatch: ["hsl(215 40% 14%)", "hsl(195 90% 65%)", "hsl(180 70% 55%)"],
    tone: "dark",
  },
  {
    id: "rose",
    name: "Quartzo Rosa",
    description: "Rosa claro suave e quente",
    swatch: ["hsl(350 40% 95%)", "hsl(340 65% 65%)", "hsl(15 70% 60%)"],
    tone: "light",
  },
  {
    id: "mist",
    name: "Névoa",
    description: "Cinza claro minimalista",
    swatch: ["hsl(210 15% 94%)", "hsl(215 60% 50%)", "hsl(215 25% 20%)"],
    tone: "light",
  },
  {
    id: "sunset",
    name: "Pôr do Sol",
    description: "Laranja âmbar quente",
    swatch: ["hsl(20 35% 92%)", "hsl(30 90% 55%)", "hsl(0 75% 50%)"],
    tone: "light",
  },
];
