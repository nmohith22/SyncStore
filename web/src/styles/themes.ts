export type Theme = {
  name: string;
  colors: {
    bg: string;
    main: string;
    caret: string;
    sub: string;
    text: string;
    error: string;
    steam: string;
    epic: string;
    psn: string;
    xbox: string;
  };
};

export const themes: Theme[] = [
  { name: "rgb_pulse", colors: { bg: "#111111", main: "#ff00ff", caret: "#00ffff", sub: "#444444", text: "#eeeeee", error: "#ff4444", steam: "#1b2838", epic: "#3b3b3b", psn: "#003791", xbox: "#107c10" }},
  { name: "cyberpunk", colors: { bg: "#000b1e", main: "#fcee0a", caret: "#00ff9f", sub: "#ff003c", text: "#00f0ff", error: "#ff003c", steam: "#171a21", epic: "#2a2a2a", psn: "#00439c", xbox: "#107c10" }},
  { name: "laser", colors: { bg: "#221b44", main: "#eb1889", caret: "#eb1889", sub: "#58e1ff", text: "#d1d1e0", error: "#ff5d5d", steam: "#1b2838", epic: "#313131", psn: "#003087", xbox: "#107c11" }},
  { name: "nord", colors: { bg: "#2e3440", main: "#88c0d0", caret: "#88c0d0", sub: "#4c566a", text: "#d8dee9", error: "#bf616a", steam: "#242933", epic: "#3b4252", psn: "#5e81ac", xbox: "#a3be8c" }},
  { name: "serika", colors: { bg: "#323437", main: "#e2b714", caret: "#e2b714", sub: "#646669", text: "#d1d0c5", error: "#ca4754", steam: "#171a21", epic: "#2a2a2a", psn: "#003791", xbox: "#107c10" }},
  { name: "8008", colors: { bg: "#333a45", main: "#f44c7f", caret: "#f44c7f", sub: "#939eae", text: "#e9ecf0", error: "#da3333", steam: "#1b2838", epic: "#2a2a2a", psn: "#003791", xbox: "#107c10" }},
  { name: "carbon", colors: { bg: "#313131", main: "#f5f5f5", caret: "#f5f5f5", sub: "#616161", text: "#f5f5f5", error: "#f44336", steam: "#171a21", epic: "#2a2a2a", psn: "#003791", xbox: "#107c10" }},
  { name: "dracula", colors: { bg: "#282a36", main: "#bd93f9", caret: "#bd93f9", sub: "#6272a4", text: "#f8f8f2", error: "#ff5555", steam: "#1b2838", epic: "#3b3b3b", psn: "#003791", xbox: "#107c10" }},
  { name: "mictlan", colors: { bg: "#1d1f21", main: "#f05a28", caret: "#f05a28", sub: "#4a4a4a", text: "#e5e5e5", error: "#ff2e00", steam: "#171a21", epic: "#2a2a2a", psn: "#003791", xbox: "#107c10" }},
  { name: "terra", colors: { bg: "#0c0c0c", main: "#89c559", caret: "#89c559", sub: "#434343", text: "#e0e0e0", error: "#ff4d4d", steam: "#1b2838", epic: "#3b3b3b", psn: "#003791", xbox: "#107c10" }},
  { name: "bushido", colors: { bg: "#24292e", main: "#ec4c56", caret: "#ec4c56", sub: "#596172", text: "#f0f6fb", error: "#f85149", steam: "#171a21", epic: "#2a2a2a", psn: "#003791", xbox: "#107c10" }},
  { name: "metropolis", colors: { bg: "#0f1f2c", main: "#56c3b5", caret: "#56c3b5", sub: "#324356", text: "#e4edf1", error: "#ff3f3f", steam: "#1b2838", epic: "#3b3b3b", psn: "#003791", xbox: "#107c10" }},
  { name: "lavender", colors: { bg: "#21222c", main: "#a4a1e1", caret: "#a4a1e1", sub: "#6272a4", text: "#f8f8f2", error: "#ff5555", steam: "#282a36", epic: "#44475a", psn: "#6272a4", xbox: "#50fa7b" }},
  { name: "catppuccin", colors: { bg: "#1e1e2e", main: "#cba6f7", caret: "#cba6f7", sub: "#585b70", text: "#cdd6f4", error: "#f38ba8", steam: "#313244", epic: "#45475a", psn: "#89b4fa", xbox: "#a6e3a1" }},
  { name: "rose_pine", colors: { bg: "#191724", main: "#ebbcba", caret: "#ebbcba", sub: "#6e6a86", text: "#e0def4", error: "#eb6f92", steam: "#26233a", epic: "#403d52", psn: "#9ccfd8", xbox: "#31748f" }},
  { name: "honey", colors: { bg: "#f2aa4c", main: "#101820", caret: "#101820", sub: "#5d5d5d", text: "#101820", error: "#e94b3c", steam: "#101820", epic: "#101820", psn: "#101820", xbox: "#101820" }},
  { name: "olive", colors: { bg: "#e9e5d6", main: "#91945c", caret: "#91945c", sub: "#b7b8a8", text: "#4a4a4a", error: "#c24d4d", steam: "#91945c", epic: "#91945c", psn: "#91945c", xbox: "#91945c" }},
  { name: "midnight", colors: { bg: "#000000", main: "#4a90e2", caret: "#4a90e2", sub: "#222222", text: "#ffffff", error: "#ff4d4d", steam: "#171a21", epic: "#2a2a2a", psn: "#003791", xbox: "#107c10" }},
  { name: "retro", colors: { bg: "#dad3b1", main: "#3a3335", caret: "#3a3335", sub: "#a1a1a1", text: "#3a3335", error: "#f05d5e", steam: "#3a3335", epic: "#3a3335", psn: "#3a3335", xbox: "#3a3335" }},
  { name: "botanical", colors: { bg: "#7b9c98", main: "#e7e5e3", caret: "#e7e5e3", sub: "#5b706c", text: "#e7e5e3", error: "#d25858", steam: "#4b5f5c", epic: "#5b706c", psn: "#2d4b71", xbox: "#51624f" }},
  { name: "oblivion", colors: { bg: "#31322c", main: "#f7f1ff", caret: "#f7f1ff", sub: "#5d5d52", text: "#f7f1ff", error: "#ff4747", steam: "#171a21", epic: "#2a2a2a", psn: "#003791", xbox: "#107c10" }},
  { name: "shanshui", colors: { bg: "#ebede9", main: "#4e514a", caret: "#4e514a", sub: "#9fa39a", text: "#4e514a", error: "#a61e22", steam: "#4e514a", epic: "#4e514a", psn: "#4e514a", xbox: "#4e514a" }},
  { name: "milkshake", colors: { bg: "#ffffff", main: "#212b43", caret: "#212b43", sub: "#d1d9e0", text: "#212b43", error: "#f44336", steam: "#212b43", epic: "#212b43", psn: "#212b43", xbox: "#212b43" }},
  { name: "sweden", colors: { bg: "#0058a3", main: "#ffcc00", caret: "#ffcc00", sub: "#004782", text: "#ffffff", error: "#ff3333", steam: "#ffcc00", epic: "#ffcc00", psn: "#ffcc00", xbox: "#ffcc00" }},
  { name: "soyo", colors: { bg: "#403e41", main: "#6db33f", caret: "#6db33f", sub: "#5c5a5d", text: "#d1d0d2", error: "#e74c3c", steam: "#6db33f", epic: "#6db33f", psn: "#6db33f", xbox: "#6db33f" }},
];
