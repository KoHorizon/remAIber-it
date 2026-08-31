import { PROGRAMMING_LANGUAGES } from "../../utils/languages";
import { CodeEditor } from "../CodeEditor";
import { TerminalEditor } from "../TerminalEditor";
import { Dropdown } from "../ui";
import { ResultCard } from "./ResultCard";
import { TypeSwitcher } from "./TypeSwitcher";
import type { SaveToBank } from "./useSaveToBank";
import type { Simulation } from "./useSimulation";

type EditorProps = {
  isCli: boolean;
  language: string | null;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  showThemeSelector?: boolean;
};

/** A shell prompt for CLI banks, a code editor for everything else. */
function AnswerEditor({
  isCli,
  language,
  value,
  onChange,
  placeholder,
  showThemeSelector,
}: EditorProps) {
  if (isCli) {
    return (
      <TerminalEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        height="100%"
      />
    );
  }
  return (
    <CodeEditor
      value={value}
      onChange={onChange}
      language={language || "plaintext"}
      height="100%"
      showThemeSelector={showThemeSelector}
    />
  );
}

type Props = {
  simulation: Simulation;
  save: SaveToBank;
};

/** Prompt on the left, expected and test answers stacked on the right. */
export function CodeLayout({ simulation, save }: Props) {
  const isCli = simulation.bankType === "cli";
  const isCode = simulation.bankType === "code";

  return (
    <>
      <div className="simulation-code-body">
        <div className="simulation-code-left">
          <div className="simulation-code-panel">
            <div className="simulation-code-panel-header">
              <h2>Question</h2>
              <span className="simulation-code-panel-hint">
                Describe the coding task
              </span>
              <div className="simulation-code-panel-controls">
                {isCode && (
                  <Dropdown
                    options={PROGRAMMING_LANGUAGES.map((lang) => ({
                      value: lang.value,
                      label: lang.label,
                    }))}
                    value={simulation.language}
                    onChange={simulation.setLanguage}
                    placeholder="Select language..."
                  />
                )}
                <TypeSwitcher
                  value={simulation.bankType}
                  onChange={simulation.setBankType}
                />
              </div>
            </div>
            <div className="simulation-code-panel-content">
              <textarea
                className="simulation-code-textarea"
                placeholder="Describe the coding task..."
                value={simulation.question}
                onChange={(e) => simulation.setQuestion(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        </div>

        <div className="simulation-code-right">
          <div className="simulation-code-panel">
            <div className="simulation-code-panel-header">
              <h2>Expected Answer</h2>
              {isCode && simulation.language && (
                <span className="simulation-code-panel-language">
                  {simulation.language}
                </span>
              )}
            </div>
            <div className="simulation-code-panel-content simulation-code-panel-content--editor">
              <AnswerEditor
                isCli={isCli}
                language={simulation.language}
                value={simulation.expectedAnswer}
                onChange={simulation.setExpectedAnswer}
                placeholder="Enter the expected command..."
                showThemeSelector
              />
            </div>
          </div>

          <div className="simulation-code-panel simulation-code-panel--test">
            <div className="simulation-code-panel-header">
              <h2>Your Test Answer</h2>
              <span className="simulation-code-panel-hint">
                This is what will be graded
              </span>
            </div>
            <div className="simulation-code-panel-content simulation-code-panel-content--editor">
              <AnswerEditor
                isCli={isCli}
                language={simulation.language}
                value={simulation.testAnswer}
                onChange={simulation.setTestAnswer}
                placeholder="Enter your test command..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* The split panels fill the viewport, so results get their own strip. */}
      <div className="simulation-code-results">
        <ResultCard simulation={simulation} save={save} />
      </div>
    </>
  );
}
