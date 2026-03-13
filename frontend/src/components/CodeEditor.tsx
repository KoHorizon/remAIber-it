import Editor, { loader } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import "./CodeEditor.css";

// Available themes - only 3 for now
const EDITOR_THEMES = [
  { id: "warm-dark", label: "Warm Dark", bg: "#2d2a24" },
  { id: "vs-dark", label: "Dark", bg: "#1e1e1e" },
  { id: "warm-light", label: "Light", bg: "#faf7f2" },
] as const;

type EditorTheme = (typeof EDITOR_THEMES)[number]["id"];

// Get saved theme from localStorage
function getSavedTheme(): EditorTheme {
  const saved = localStorage.getItem("editor-theme");
  if (saved && EDITOR_THEMES.some((t) => t.id === saved)) {
    return saved as EditorTheme;
  }
  return "warm-dark";
}

// Define custom themes for Monaco
const defineCustomThemes = () => {
  loader.init().then((monaco) => {
    monaco.editor.defineTheme("warm-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "8a7a68", fontStyle: "italic" },
        { token: "keyword", foreground: "e07a5f" },
        { token: "string", foreground: "81b29a" },
        { token: "number", foreground: "e9c46a" },
        { token: "type", foreground: "f2cc8f" },
        { token: "function", foreground: "e9c46a" },
        { token: "variable", foreground: "d4c4b0" },
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
  });
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  placeholder?: string;
  readOnly?: boolean;
  height?: string;
  showThemeSelector?: boolean;
};

// Map our language names to Monaco language IDs
function getMonacoLanguage(language?: string): string {
  const languageMap: Record<string, string> = {
    go: "go",
    javascript: "javascript",
    typescript: "typescript",
    python: "python",
    rust: "rust",
    java: "java",
    c: "c",
    cpp: "cpp",
    csharp: "csharp",
    php: "php",
    ruby: "ruby",
    swift: "swift",
    kotlin: "kotlin",
    sql: "sql",
    html: "html",
    css: "css",
    shell: "shell",
    bash: "shell",
    yaml: "yaml",
    yml: "yaml",
    dockerfile: "dockerfile",
    docker: "dockerfile",
    json: "json",
    xml: "xml",
    markdown: "markdown",
    md: "markdown",
    graphql: "graphql",
    lua: "lua",
    perl: "perl",
    r: "r",
    scala: "scala",
    powershell: "powershell",
    hcl: "hcl",
    terraform: "hcl",
    toml: "ini",
    ini: "ini",
  };
  return languageMap[language || ""] || "plaintext";
}

// Get background color for theme
function getThemeBg(themeId: EditorTheme): string {
  const theme = EDITOR_THEMES.find((t) => t.id === themeId);
  return theme?.bg || "#2d2a24";
}

export function CodeEditor({
  value,
  onChange,
  language,
  placeholder,
  readOnly = false,
  height = "300px",
  showThemeSelector = false,
}: Props) {
  const themeInitialized = useRef(false);
  const [currentTheme, setCurrentTheme] = useState<EditorTheme>(getSavedTheme);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!themeInitialized.current) {
      defineCustomThemes();
      themeInitialized.current = true;
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = () => setShowDropdown(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showDropdown]);

  function handleThemeChange(themeId: EditorTheme) {
    setCurrentTheme(themeId);
    localStorage.setItem("editor-theme", themeId);
    setShowDropdown(false);
  }

  return (
    <div className="code-editor-wrapper">
      {showThemeSelector && (
        <div className="code-editor-header">
          <span className="code-editor-tab">Code</span>
          <div className="theme-selector" onClick={(e) => e.stopPropagation()}>
            <button
              className="theme-selector-btn"
              onClick={() => setShowDropdown(!showDropdown)}
              type="button"
            >
              <span
                className="theme-color-preview"
                style={{ background: getThemeBg(currentTheme) }}
              />
              <span className="theme-current-label">
                {EDITOR_THEMES.find((t) => t.id === currentTheme)?.label}
              </span>
            </button>
            {showDropdown && (
              <div className="theme-dropdown">
                {EDITOR_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    className={`theme-option ${currentTheme === theme.id ? "active" : ""}`}
                    onClick={() => handleThemeChange(theme.id)}
                    type="button"
                  >
                    <span
                      className="theme-color-square"
                      style={{ background: theme.bg }}
                    />
                    <span className="theme-label">{theme.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div
        className="code-editor-container"
        style={{ background: getThemeBg(currentTheme) }}
      >
        <Editor
          height={height}
          language={getMonacoLanguage(language)}
          value={value}
          onChange={(val) => onChange(val || "")}
          theme={currentTheme}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            readOnly,
            placeholder,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "none",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>
    </div>
  );
}
