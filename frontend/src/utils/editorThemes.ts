import { loader } from "@monaco-editor/react";

// Shared Monaco theme definitions
// Used by CodeEditor and TerminalInput components

export const EDITOR_THEMES = [
  { id: "warm-dark", label: "Warm Dark", bg: "#2d2a24" },
  { id: "vs-dark", label: "Dark", bg: "#1e1e1e" },
  { id: "warm-light", label: "Light", bg: "#faf7f2" },
] as const;

export type EditorTheme = (typeof EDITOR_THEMES)[number]["id"];

// Shared color palette for warm themes
const WARM_COLORS = {
  comment: "8a7a68",
  keyword: "e07a5f",
  string: "81b29a",
  number: "e9c46a",
  type: "f2cc8f",
  function: "e9c46a",
  variable: "d4c4b0",
};

let themesInitialized = false;

export function initializeMonacoThemes(): void {
  if (themesInitialized) return;
  themesInitialized = true;

  loader.init().then((monaco) => {
    // Warm dark theme - used by CodeEditor
    monaco.editor.defineTheme("warm-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: WARM_COLORS.comment, fontStyle: "italic" },
        { token: "keyword", foreground: WARM_COLORS.keyword },
        { token: "string", foreground: WARM_COLORS.string },
        { token: "number", foreground: WARM_COLORS.number },
        { token: "type", foreground: WARM_COLORS.type },
        { token: "function", foreground: WARM_COLORS.function },
        { token: "variable", foreground: WARM_COLORS.variable },
      ],
      colors: {
        "editor.background": "#2d2a24",
        "editor.foreground": "#e8e0d4",
        "editor.lineHighlightBackground": "#36322a",
        "editorLineNumber.foreground": "#6b6358",
        "editorLineNumber.activeForeground": "#a89a88",
        "editor.selectionBackground": "#4a443a",
        "editor.inactiveSelectionBackground": "#3d3830",
        "editorCursor.foreground": "#d4a056",
        "editorWhitespace.foreground": "#3d3830",
        "editorIndentGuide.background": "#3d3830",
        "editorIndentGuide.activeBackground": "#5a5248",
        "scrollbarSlider.background": "#4a443a80",
        "scrollbarSlider.hoverBackground": "#5a5248a0",
        "scrollbarSlider.activeBackground": "#6a6258c0",
      },
    });

    // Terminal dark theme - same as warm-dark but no line highlight
    monaco.editor.defineTheme("terminal-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: WARM_COLORS.comment, fontStyle: "italic" },
        { token: "keyword", foreground: WARM_COLORS.keyword },
        { token: "string", foreground: WARM_COLORS.string },
        { token: "number", foreground: WARM_COLORS.number },
        { token: "type", foreground: WARM_COLORS.type },
        { token: "function", foreground: WARM_COLORS.function },
        { token: "variable", foreground: WARM_COLORS.variable },
      ],
      colors: {
        "editor.background": "#2d2a24",
        "editor.foreground": "#e8e0d4",
        "editor.lineHighlightBackground": "#2d2a24", // No highlight
        "editorLineNumber.foreground": "#6b6358",
        "editorLineNumber.activeForeground": "#a89a88",
        "editor.selectionBackground": "#4a443a",
        "editor.inactiveSelectionBackground": "#3d3830",
        "editorCursor.foreground": "#81b29a", // Green cursor for terminal
        "editorWhitespace.foreground": "#3d3830",
        "scrollbarSlider.background": "#4a443a80",
        "scrollbarSlider.hoverBackground": "#5a5248a0",
        "scrollbarSlider.activeBackground": "#6a6258c0",
      },
    });

    // Warm light theme
    monaco.editor.defineTheme("warm-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "9a8873", fontStyle: "italic" },
        { token: "keyword", foreground: "c45c4a" },
        { token: "string", foreground: "6b9f78" },
        { token: "number", foreground: "d4a056" },
        { token: "type", foreground: "8b7355" },
        { token: "function", foreground: "b8860b" },
        { token: "variable", foreground: "5c5142" },
      ],
      colors: {
        "editor.background": "#faf7f2",
        "editor.foreground": "#3d3528",
        "editor.lineHighlightBackground": "#f5f0e800",
        "editorLineNumber.foreground": "#c4b8a8",
        "editorLineNumber.activeForeground": "#8b7355",
        "editor.selectionBackground": "#e8dcc8",
        "editor.inactiveSelectionBackground": "#f0e8d8",
        "editorCursor.foreground": "#d4a056",
        "editorWhitespace.foreground": "#e0d8c8",
        "editorIndentGuide.background": "#e8e0d0",
        "editorIndentGuide.activeBackground": "#d4ccc0",
        "scrollbarSlider.background": "#d4ccc080",
        "scrollbarSlider.hoverBackground": "#c4b8a8a0",
        "scrollbarSlider.activeBackground": "#b4a898c0",
      },
    });
  }).catch((err) => {
    console.error("Failed to initialize Monaco themes:", err);
  });
}

export function getThemeBackground(themeId: EditorTheme): string {
  const theme = EDITOR_THEMES.find((t) => t.id === themeId);
  return theme?.bg || "#2d2a24";
}

export function getSavedTheme(): EditorTheme {
  const saved = localStorage.getItem("editor-theme");
  if (saved && EDITOR_THEMES.some((t) => t.id === saved)) {
    return saved as EditorTheme;
  }
  return "warm-dark";
}

export function saveTheme(themeId: EditorTheme): void {
  localStorage.setItem("editor-theme", themeId);
}
