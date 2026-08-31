import { PROGRAMMING_LANGUAGES } from "../../utils/languages";
import { Button, Dropdown, Input } from "../ui";
import { BankDestinationPicker } from "./BankDestinationPicker";
import { BankTypeSwitcher } from "./BankTypeSwitcher";
import { DirectionField } from "./DirectionField";
import { StudyMaterialCards } from "./StudyMaterialCards";
import { AlertIcon, SparkleIcon } from "./icons";
import type { GenerateConfig } from "./useGenerateConfig";
import type { useBankTarget } from "./useBankTarget";
import type { useStudyMaterial } from "./useStudyMaterial";

type Props = {
  config: GenerateConfig;
  target: ReturnType<typeof useBankTarget>;
  material: ReturnType<typeof useStudyMaterial>;
  /** Freezes the bank type and destination once questions exist. */
  isLocked: boolean;
  canGenerate: boolean;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
};

/**
 * The left column: everything that shapes a generation request. Locked while
 * questions are on screen, because they were generated for the settings shown
 * here and silently changing those would leave the two out of step.
 */
export function GenerateConfigPanel({
  config,
  target,
  material,
  isLocked,
  canGenerate,
  isGenerating,
  error,
  onGenerate,
}: Props) {
  return (
    <div className="aigen-left">
      <div className="aigen-config-panel">
        <div className="aigen-config-section">
          <label className="aigen-label">Bank Type</label>
          <BankTypeSwitcher
            value={config.bankType}
            onChange={config.setBankType}
            disabled={isLocked}
          />
        </div>

        <div className="aigen-config-section">
          <label className="aigen-label">Destination Bank</label>
          <BankDestinationPicker
            banks={target.banks}
            mode={target.mode}
            selectedBankId={target.selectedBankId}
            onSelectExisting={target.selectExisting}
            onSelectNew={target.selectNew}
            disabled={isLocked}
          />
        </div>

        {target.mode === "new" && (
          <>
            <div className="aigen-config-section">
              <Input
                label="Bank Subject"
                value={target.subject}
                onChange={(e) => target.setSubject(e.target.value)}
                placeholder="e.g., Go Concurrency Patterns"
              />
            </div>

            <div className="aigen-config-section">
              <Input
                label="Category Name (optional)"
                value={target.categoryName}
                onChange={(e) => target.setCategoryName(e.target.value)}
                placeholder="e.g., Programming"
              />
            </div>
          </>
        )}

        {config.bankType === "code" && (
          <div className="aigen-config-section">
            <label className="aigen-label">Language</label>
            <Dropdown
              options={PROGRAMMING_LANGUAGES.map((lang) => ({
                value: lang.value,
                label: lang.label,
              }))}
              value={config.language}
              onChange={config.setLanguage}
              placeholder="Select language..."
            />
          </div>
        )}

        <div className="aigen-config-section">
          <label className="aigen-label">Number of Questions</label>
          <div className="aigen-count-input">
            <input
              type="range"
              min="1"
              max="20"
              value={config.count}
              onChange={(e) => config.setCount(parseInt(e.target.value))}
              className="aigen-range"
            />
            <span className="aigen-count-value">{config.count}</span>
          </div>
        </div>

        <div className="aigen-config-section">
          <label className="aigen-label">AI Direction (optional)</label>
          <DirectionField
            value={config.direction}
            onChange={config.setDirection}
            isOpen={config.isDirectionOpen}
            onToggle={config.toggleDirection}
          />
        </div>

        <div className="aigen-config-section aigen-config-section--grow">
          <label className="aigen-label">Study Material</label>
          <StudyMaterialCards
            items={material.items}
            totalCharacters={material.combinedContent.length}
            onOpen={material.openEditor}
            onRemove={material.remove}
          />
        </div>

        <Button
          variant="primary"
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
        >
          <SparkleIcon />
          {isGenerating ? "Generating..." : "Generate Questions"}
        </Button>

        {error && (
          <div className="aigen-error">
            <AlertIcon />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
