import { Button } from "../ui";
import { GradingRulesPill } from "./GradingRulesPill";
import { ArrowLeftIcon } from "./icons";
import type { Simulation } from "./useSimulation";

type Props = {
  simulation: Simulation;
  onBack: () => void;
};

/**
 * The header bar, identical in both layouts — it was duplicated verbatim, so a
 * change to one silently left the other behind.
 */
export function SimulationNav({ simulation, onBack }: Props) {
  return (
    <div className="simulation-nav">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeftIcon />
        Back
      </Button>
      <div className="simulation-nav-center" />
      <div className="simulation-nav-right">
        <GradingRulesPill
          gradingPrompt={simulation.gradingPrompt}
          bankType={simulation.bankType}
          isOpen={simulation.isRulesOpen}
          onToggle={simulation.toggleRules}
        />
        <span className="simulation-hint">
          {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter to grade
        </span>
        <Button
          variant="primary"
          size="sm"
          onClick={simulation.grade}
          disabled={!simulation.canGrade || simulation.isGrading}
        >
          {simulation.isGrading ? "Grading..." : "Run Simulation"}
        </Button>
      </div>
    </div>
  );
}
