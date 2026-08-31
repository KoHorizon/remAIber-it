import { GradeScoreSlide } from "./GradeScoreSlide";
import { SaveToBankSlide } from "./SaveToBankSlide";
import { InfoIcon } from "./icons";
import type { SaveToBank } from "./useSaveToBank";
import type { Simulation } from "./useSimulation";

type Props = {
  simulation: Simulation;
  save: SaveToBank;
};

/**
 * What sits below the inputs once grading has run: the error, or the score card
 * and the save panel it slides across to. Both layouts render this in their own
 * place, which is the only difference between them here.
 */
export function ResultCard({ simulation, save }: Props) {
  return (
    <>
      {simulation.gradeError && (
        <div className="simulation-error animate-slide-up">
          <InfoIcon size={16} />
          {simulation.gradeError}
        </div>
      )}

      {simulation.gradeResult && (
        <div
          className={`simulation-result-row ${save.isClosingResult ? "animate-slide-down" : "animate-slide-up"}`}
        >
          <div
            className={`simulation-result-slider ${save.isSaveViewOpen ? "simulation-result-slider--save" : ""}`}
          >
            <GradeScoreSlide
              result={simulation.gradeResult}
              gradingPrompt={simulation.gradingPrompt}
              onOpenSave={save.openSaveView}
            />
            <SaveToBankSlide save={save} bankType={simulation.bankType} />
          </div>
        </div>
      )}
    </>
  );
}
