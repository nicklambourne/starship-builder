/**
 * Terminal colour schemes.
 *
 * The engine emits ANSI colour identities (`red`, index 42, #rrggbb); a theme
 * decides what those actually look like, exactly as a real terminal emulator
 * would. Named and 256-indexed colours are theme-dependent; 24-bit colours are
 * absolute and bypass the theme entirely.
 */

export interface TerminalTheme {
  id: string;
  label: string;
  /** Whether the scheme is intended for a dark background. */
  dark: boolean;
  background: string;
  foreground: string;
  /** The 16 ANSI colours, in standard order: black..white, then bright. */
  ansi: [
    string, string, string, string, string, string, string, string,
    string, string, string, string, string, string, string, string,
  ];
}

export const TERMINAL_THEMES: TerminalTheme[] = [
  {
    id: "tokyo-night",
    label: "Tokyo Night",
    dark: true,
    background: "#1a1b26",
    foreground: "#c0caf5",
    ansi: [
      "#15161e", "#f7768e", "#9ece6a", "#e0af68",
      "#7aa2f7", "#bb9af7", "#7dcfff", "#a9b1d6",
      "#414868", "#f7768e", "#9ece6a", "#e0af68",
      "#7aa2f7", "#bb9af7", "#7dcfff", "#c0caf5",
    ],
  },
  {
    id: "catppuccin-mocha",
    label: "Catppuccin Mocha",
    dark: true,
    background: "#1e1e2e",
    foreground: "#cdd6f4",
    ansi: [
      "#45475a", "#f38ba8", "#a6e3a1", "#f9e2af",
      "#89b4fa", "#f5c2e7", "#94e2d5", "#bac2de",
      "#585b70", "#f38ba8", "#a6e3a1", "#f9e2af",
      "#89b4fa", "#f5c2e7", "#94e2d5", "#a6adc8",
    ],
  },
  {
    id: "gruvbox-dark",
    label: "Gruvbox Dark",
    dark: true,
    background: "#282828",
    foreground: "#ebdbb2",
    ansi: [
      "#282828", "#cc241d", "#98971a", "#d79921",
      "#458588", "#b16286", "#689d6a", "#a89984",
      "#928374", "#fb4934", "#b8bb26", "#fabd2f",
      "#83a598", "#d3869b", "#8ec07c", "#ebdbb2",
    ],
  },
  {
    id: "dracula",
    label: "Dracula",
    dark: true,
    background: "#282a36",
    foreground: "#f8f8f2",
    ansi: [
      "#21222c", "#ff5555", "#50fa7b", "#f1fa8c",
      "#bd93f9", "#ff79c6", "#8be9fd", "#f8f8f2",
      "#6272a4", "#ff6e6e", "#69ff94", "#ffffa5",
      "#d6acff", "#ff92df", "#a4ffff", "#ffffff",
    ],
  },
  {
    id: "nord",
    label: "Nord",
    dark: true,
    background: "#2e3440",
    foreground: "#d8dee9",
    ansi: [
      "#3b4252", "#bf616a", "#a3be8c", "#ebcb8b",
      "#81a1c1", "#b48ead", "#88c0d0", "#e5e9f0",
      "#4c566a", "#bf616a", "#a3be8c", "#ebcb8b",
      "#81a1c1", "#b48ead", "#8fbcbb", "#eceff4",
    ],
  },
  {
    id: "solarized-light",
    label: "Solarized Light",
    dark: false,
    background: "#fdf6e3",
    foreground: "#657b83",
    ansi: [
      "#073642", "#dc322f", "#859900", "#b58900",
      "#268bd2", "#d33682", "#2aa198", "#eee8d5",
      "#002b36", "#cb4b16", "#586e75", "#657b83",
      "#839496", "#6c71c4", "#93a1a1", "#fdf6e3",
    ],
  },
  {
    id: "github-light",
    label: "GitHub Light",
    dark: false,
    background: "#ffffff",
    foreground: "#24292f",
    ansi: [
      "#24292f", "#cf222e", "#116329", "#4d2d00",
      "#0969da", "#8250df", "#1b7c83", "#6e7781",
      "#57606a", "#a40e26", "#1a7f37", "#633c01",
      "#218bff", "#a475f9", "#3192aa", "#8c959f",
    ],
  },
  {
    id: "catppuccin-latte",
    label: "Catppuccin Latte",
    dark: false,
    background: "#eff1f5",
    foreground: "#4c4f69",
    ansi: [
      "#5c5f77", "#d20f39", "#40a02b", "#df8e1d",
      "#1e66f5", "#ea76cb", "#179299", "#acb0be",
      "#6c6f85", "#d20f39", "#40a02b", "#df8e1d",
      "#1e66f5", "#ea76cb", "#179299", "#bcc0cc",
    ],
  },
  {
    id: "gruvbox-light",
    label: "Gruvbox Light",
    dark: false,
    background: "#fbf1c7",
    foreground: "#3c3836",
    ansi: [
      "#fbf1c7", "#cc241d", "#98971a", "#d79921",
      "#458588", "#b16286", "#689d6a", "#7c6f64",
      "#928374", "#9d0006", "#79740e", "#b57614",
      "#076678", "#8f3f71", "#427b58", "#3c3836",
    ],
  },
  {
    id: "one-dark",
    label: "One Dark",
    dark: true,
    background: "#282c34",
    foreground: "#abb2bf",
    ansi: [
      "#282c34", "#e06c75", "#98c379", "#e5c07b",
      "#61afef", "#c678dd", "#56b6c2", "#abb2bf",
      "#5c6370", "#e06c75", "#98c379", "#e5c07b",
      "#61afef", "#c678dd", "#56b6c2", "#ffffff",
    ],
  },
  {
    id: "monokai",
    label: "Monokai",
    dark: true,
    background: "#272822",
    foreground: "#f8f8f2",
    ansi: [
      "#272822", "#f92672", "#a6e22e", "#f4bf75",
      "#66d9ef", "#ae81ff", "#a1efe4", "#f8f8f2",
      "#75715e", "#f92672", "#a6e22e", "#f4bf75",
      "#66d9ef", "#ae81ff", "#a1efe4", "#f9f8f5",
    ],
  },
  {
    id: "solarized-dark",
    label: "Solarized Dark",
    dark: true,
    background: "#002b36",
    foreground: "#839496",
    ansi: [
      "#073642", "#dc322f", "#859900", "#b58900",
      "#268bd2", "#d33682", "#2aa198", "#eee8d5",
      "#002b36", "#cb4b16", "#586e75", "#657b83",
      "#839496", "#6c71c4", "#93a1a1", "#fdf6e3",
    ],
  },
  {
    id: "everforest-dark",
    label: "Everforest Dark",
    dark: true,
    background: "#2d353b",
    foreground: "#d3c6aa",
    ansi: [
      "#343f44", "#e67e80", "#a7c080", "#dbbc7f",
      "#7fbbb3", "#d699b6", "#83c092", "#d3c6aa",
      "#475258", "#e67e80", "#a7c080", "#dbbc7f",
      "#7fbbb3", "#d699b6", "#83c092", "#d3c6aa",
    ],
  },
  {
    id: "rose-pine",
    label: "Rosé Pine",
    dark: true,
    background: "#191724",
    foreground: "#e0def4",
    ansi: [
      "#26233a", "#eb6f92", "#31748f", "#f6c177",
      "#9ccfd8", "#c4a7e7", "#ebbcba", "#e0def4",
      "#6e6a86", "#eb6f92", "#31748f", "#f6c177",
      "#9ccfd8", "#c4a7e7", "#ebbcba", "#e0def4",
    ],
  },
  {
    id: "kanagawa",
    label: "Kanagawa",
    dark: true,
    background: "#1f1f28",
    foreground: "#dcd7ba",
    ansi: [
      "#16161d", "#c34043", "#76946a", "#c0a36e",
      "#7e9cd8", "#957fb8", "#6a9589", "#c8c093",
      "#727169", "#e82424", "#98bb6c", "#e6c384",
      "#7fb4ca", "#938aa9", "#7aa89f", "#dcd7ba",
    ],
  },
  {
    id: "nightfox",
    label: "Nightfox",
    dark: true,
    background: "#192330",
    foreground: "#cdcecf",
    ansi: [
      "#393b44", "#c94f6d", "#81b29a", "#dbc074",
      "#719cd6", "#9d79d6", "#63cdcf", "#dfdfe0",
      "#575860", "#d16983", "#8ebaa4", "#e0c989",
      "#86abdc", "#baa1e2", "#7ad5d6", "#e4e4e5",
    ],
  },
  {
    id: "ayu-mirage",
    label: "Ayu Mirage",
    dark: true,
    background: "#1f2430",
    foreground: "#cbccc6",
    ansi: [
      "#191e2a", "#ed8274", "#a6cc70", "#fad07b",
      "#6dcbfa", "#cfbafa", "#90e1c6", "#c7c7c7",
      "#686868", "#f28779", "#bae67e", "#ffd580",
      "#73d0ff", "#d4bfff", "#95e6cb", "#ffffff",
    ],
  },
  {
    id: "github-dark",
    label: "GitHub Dark",
    dark: true,
    background: "#0d1117",
    foreground: "#c9d1d9",
    ansi: [
      "#484f58", "#ff7b72", "#3fb950", "#d29922",
      "#58a6ff", "#bc8cff", "#39c5cf", "#b1bac4",
      "#6e7681", "#ffa198", "#56d364", "#e3b341",
      "#79c0ff", "#d2a8ff", "#56d4dd", "#f0f6fc",
    ],
  },
  {
    id: "vs-code-light",
    label: "VS Code Light",
    dark: false,
    background: "#ffffff",
    foreground: "#333333",
    ansi: [
      "#000000", "#cd3131", "#00bc00", "#949800",
      "#0451a5", "#bc05bc", "#0598bc", "#555555",
      "#666666", "#cd3131", "#14ce14", "#b5ba00",
      "#0451a5", "#bc05bc", "#0598bc", "#a5a5a5",
    ],
  },
];

export const DEFAULT_THEME_ID = "tokyo-night";

export function getTheme(id: string): TerminalTheme {
  return TERMINAL_THEMES.find((t) => t.id === id) ?? TERMINAL_THEMES[0];
}

/** Standard xterm 256-colour palette expansion for indices 16-255. */
export function xterm256(index: number, theme: TerminalTheme): string {
  if (index < 16) return theme.ansi[index];

  if (index < 232) {
    // 6×6×6 colour cube.
    const i = index - 16;
    const steps = [0, 95, 135, 175, 215, 255];
    const r = steps[Math.floor(i / 36) % 6];
    const g = steps[Math.floor(i / 6) % 6];
    const b = steps[i % 6];
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }

  // 24-step greyscale ramp.
  const level = 8 + (index - 232) * 10;
  const hex = level.toString(16).padStart(2, "0");
  return `#${hex}${hex}${hex}`;
}
