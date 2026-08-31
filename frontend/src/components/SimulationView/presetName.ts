import {
  DEFAULT_GRADING_RULES,
  EXTRA_TEMPLATES,
} from "../../utils/gradingTemplates";

/**
 * Labels the rules currently in the textarea, for the collapsed grading pill:
 * which preset they came from, or "Custom" if they've been edited.
 *
 * Empty means the backend's own built-in rules apply, which is not the same as
 * "Default" — that one sends this app's default block explicitly.
 *
 * The template scan isn't filtered by bank type. It doesn't need to be: the
 * only way this text gets there is from the type-filtered preset row, or by
 * hand — and text typed by hand that happens to match a template verbatim is
 * that template.
 */
export function getPresetName(prompt: string, bankType: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return "Built-in";

  if (trimmed === DEFAULT_GRADING_RULES[bankType]?.trim()) {
    return defaultLabel(bankType);
  }

  for (const [, template] of Object.entries(EXTRA_TEMPLATES)) {
    if (trimmed === template.rules.trim()) return template.label;
  }

  return "Custom";
}

/** The default preset is named after its bank type, since the rules differ. */
export function defaultLabel(bankType: string): string {
  if (bankType === "cli") return "Default (CLI)";
  if (bankType === "code") return "Default (code)";
  return "Default";
}
