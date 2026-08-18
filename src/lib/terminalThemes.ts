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
