export type Theme = {
  name: string;
  colors: {
    bg: string;
    main: string;
    caret: string;
    sub: string;
    text: string;
    error: string;
  };
};

export const themes: Theme[] = [
  {
    name: "rgb_pulse",
    colors: {
      bg: "#111111",
      main: "#ff00ff",
      caret: "#00ffff",
      sub: "#444444",
      text: "#eeeeee",
      error: "#ff4444",
    },
  },
  {
    name: "cyberpunk",
    colors: {
      bg: "#000b1e",
      main: "#fcee0a",
      caret: "#00ff9f",
      sub: "#ff003c",
      text: "#00f0ff",
      error: "#ff003c",
    },
  },
  {
    name: "neon_green",
    colors: {
      bg: "#0a0a0a",
      main: "#39ff14",
      caret: "#39ff14",
      sub: "#1a1a1a",
      text: "#ffffff",
      error: "#ff0000",
    },
  },
  {
    name: "carbon",
    colors: {
      bg: "#313131",
      main: "#f5f5f5",
      caret: "#f5f5f5",
      sub: "#616161",
      text: "#f5f5f5",
      error: "#f44336",
    },
  },
];
