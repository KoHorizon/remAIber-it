import { useState } from "react";
import { api } from "../../api";
import { useViewShortcuts } from "../../hooks/useViewShortcuts";
import type { ExportData } from "../../types";
import { saveSequentially } from "../../utils/sequentialSave";
import { Button, Modal } from "../ui";
import { DraftQuestionList } from "./DraftQuestionList";
import { GenerateConfigPanel } from "./GenerateConfigPanel";
import { StudyMaterialModal } from "./StudyMaterialModal";
import { ArrowLeftIcon, DownloadIcon } from "./icons";
import { useBankTarget } from "./useBankTarget";
import { useGenerateConfig } from "./useGenerateConfig";
import { useQuestionDrafts } from "./useQuestionDrafts";
import { useStudyMaterial } from "./useStudyMaterial";
import "../AIGenerateView.css";

type Props = {
  onBack: () => void;
};

export function AIGenerateView({ onBack }: Props) {
  const config = useGenerateConfig();
  const target = useBankTarget(config.bankType);
  const material = useStudyMaterial();
  const drafts = useQuestionDrafts();

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isSavingToBank, setIsSavingToBank] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);

  const canGenerate = material.items.length > 0 && target.hasTarget;
  const canExport = drafts.hasQuestions && target.mode === "new";
  const canSaveToBank =
    drafts.hasQuestions && target.mode === "existing" && target.selectedBankId !== null;

  /**
   * Generating replaces everything on screen, so it asks first when there is
   * something to lose. This used to be `window.confirm`, which blocks the whole
   * renderer, can't be styled, and is a no-op in some webviews — meaning the
   * confirmation silently didn't happen and the questions vanished.
   */
  function requestGenerate() {
    if (!canGenerate || isGenerating) return;
    if (drafts.hasQuestions) {
      setShowReplaceModal(true);
      return;
    }
    generate();
  }

  async function generate() {
    setShowReplaceModal(false);
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const response = await api.generateQuestions({
        content: material.combinedContent,
        bank_type: config.bankType,
        language: config.requestLanguage,
        count: config.count,
        direction: config.direction.trim() || undefined,
      });
      drafts.replaceAll(response.questions);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Failed to generate questions"
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function handleExport() {
    if (!canExport) return;

    const exportData: ExportData = {
      version: "1.1",
      exported_at: new Date().toISOString(),
      folders: [],
      categories: [
        {
          name: target.categoryName.trim() || "Generated",
          banks: [
            {
              subject: target.subject.trim(),
              bank_type: config.bankType,
              language: config.requestLanguage,
              questions: drafts.questions.map((q) => ({
                subject: q.subject,
                expected_answer: q.expected_answer,
                grading_prompt: q.grading_prompt ?? null,
              })),
            },
          ],
        },
      ],
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${target.subject.trim().replace(/\s+/g, "-").toLowerCase()}-questions.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSaveToBank() {
    const bankId = target.selectedBankId;
    if (!canSaveToBank || isSavingToBank || !bankId) return;

    setIsSavingToBank(true);
    setSaveError(null);

    const total = drafts.questions.length;
    const { saved, remaining, error } = await saveSequentially(
      drafts.questions,
      (q) => api.addQuestion(bankId, q.subject, q.expected_answer, q.grading_prompt)
    );

    // Drop whatever reached the bank, even when the batch failed part-way.
    // Keeping them would mean a second Save writes them again as duplicates.
    drafts.keepUnsaved(remaining, new Set(saved.map((q) => q.id)));

    if (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save questions to bank";
      setSaveError(
        `Saved ${saved.length} of ${total}. ${message} — the remaining ${remaining.length} are still listed; press Save again to retry them.`
      );
    } else {
      drafts.resetAfterSave();
      target.clearSelection();
    }

    setIsSavingToBank(false);
  }

  useViewShortcuts({
    onSubmit: requestGenerate,
    onEscape: () => (drafts.editingId ? drafts.stopEditing() : onBack()),
    // A modal owns the keyboard while it's open. Modal blocks Escape itself
    // (capture phase), but not ⌘+Enter — without this gate, submitting from
    // inside a confirm dialog would kick off a generation behind it.
    enabled: !material.isEditorOpen && !showClearModal && !showReplaceModal,
  });

  return (
    <div className="aigen-view animate-fade-in">
      <div className="aigen-nav">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeftIcon />
          Back
        </Button>
        <div className="aigen-nav-center">
          <h1 className="aigen-title">Generate Questions</h1>
        </div>
        <div className="aigen-nav-right">
          <span className="aigen-hint">
            {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter to generate
          </span>
          {target.mode === "existing" ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveToBank}
              disabled={!canSaveToBank || isSavingToBank}
            >
              {isSavingToBank ? "Saving..." : "Save to Bank"}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleExport}
              disabled={!canExport}
            >
              <DownloadIcon />
              Export JSON
            </Button>
          )}
        </div>
      </div>

      <div className="aigen-body">
        <GenerateConfigPanel
          config={config}
          target={target}
          material={material}
          isLocked={drafts.hasQuestions}
          canGenerate={canGenerate}
          isGenerating={isGenerating}
          error={generateError || saveError}
          onGenerate={requestGenerate}
        />

        <DraftQuestionList
          drafts={drafts}
          bankType={config.bankType}
          language={config.language}
          isGenerating={isGenerating}
          onClearAll={() => setShowClearModal(true)}
        />
      </div>

      {material.isEditorOpen && (
        <StudyMaterialModal
          value={material.draft}
          isEditing={material.editingId !== null}
          onChange={material.setDraft}
          onSave={material.saveDraft}
          onClose={material.closeEditor}
        />
      )}

      {showReplaceModal && (
        <Modal
          title="Replace Generated Questions"
          onClose={() => setShowReplaceModal(false)}
          actions={
            <>
              <Button variant="secondary" onClick={() => setShowReplaceModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={generate}>
                Replace
              </Button>
            </>
          }
        >
          <p className="aigen-modal-message">
            Generating will discard the {drafts.questions.length} question
            {drafts.questions.length !== 1 ? "s" : ""} below, including any edits.
            This cannot be undone.
          </p>
        </Modal>
      )}

      {showClearModal && (
        <Modal
          title="Clear All Questions"
          onClose={() => setShowClearModal(false)}
          actions={
            <>
              <Button variant="secondary" onClick={() => setShowClearModal(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  drafts.clearAll();
                  setShowClearModal(false);
                }}
              >
                Delete All
              </Button>
            </>
          }
        >
          <p className="aigen-modal-message">
            Are you sure you want to delete all {drafts.questions.length} question
            {drafts.questions.length !== 1 ? "s" : ""}? This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
