import { useViewShortcuts } from "../../hooks/useViewShortcuts";
import { CodeLayout } from "./CodeLayout";
import { GradingRulesPanel } from "./GradingRulesPanel";
import { SimulationNav } from "./SimulationNav";
import { TheoryLayout } from "./TheoryLayout";
import { useSaveToBank } from "./useSaveToBank";
import { useSimulation } from "./useSimulation";
import "../SimulationView.css";

type Props = {
  onBack: () => void;
};

/**
 * A bench for trying a question out: write it, answer it, see how the grader
 * scores the answer, and file it into a bank if it turned out well.
 */
export function SimulationView({ onBack }: Props) {
  const simulation = useSimulation();
  const save = useSaveToBank({
    gradeResult: simulation.gradeResult,
    bankType: simulation.bankType,
    question: simulation.question,
    expectedAnswer: simulation.expectedAnswer,
    gradingPrompt: simulation.gradingPrompt,
    onSaved: simulation.reset,
  });

  useViewShortcuts({ onSubmit: simulation.grade, onEscape: onBack });

  const isTheory = simulation.bankType === "theory";

  return (
    <div
      className={`simulation-view ${isTheory ? "simulation-view--theory" : "simulation-view--code"} animate-fade-in`}
    >
      <SimulationNav simulation={simulation} onBack={onBack} />

      {simulation.isRulesOpen && (
        <GradingRulesPanel
          value={simulation.gradingPrompt}
          bankType={simulation.bankType}
          onChange={simulation.setGradingPrompt}
        />
      )}

      {isTheory ? (
        <TheoryLayout simulation={simulation} save={save} />
      ) : (
        <CodeLayout simulation={simulation} save={save} />
      )}
    </div>
  );
}
