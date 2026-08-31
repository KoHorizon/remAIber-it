import { describe, expect, test } from "vitest";
import {
  DEFAULT_GRADING_RULES,
  EXTRA_TEMPLATES,
} from "../../utils/gradingTemplates";
import { getPresetName } from "./presetName";

// Characterization tests: this function moved out of SimulationView unchanged,
// and these pin what it already did.
describe("getPresetName", () => {
  // "Built-in" and "Default" are not the same thing: empty sends no rules at
  // all and lets the backend apply its own, while "Default" sends this app's
  // default block explicitly.
  test("empty rules are the backend's built-ins, not the default preset", () => {
    expect(getPresetName("", "theory")).toBe("Built-in");
    expect(getPresetName("   \n  ", "theory")).toBe("Built-in");
  });

  test("names the default preset after its bank type", () => {
    expect(getPresetName(DEFAULT_GRADING_RULES.theory, "theory")).toBe("Default");
    expect(getPresetName(DEFAULT_GRADING_RULES.code, "code")).toBe("Default (code)");
    expect(getPresetName(DEFAULT_GRADING_RULES.cli, "cli")).toBe("Default (CLI)");
  });

  // A type's default rules are only "the default" for that type. Under another
  // type they're just some text that matches no preset.
  test("another type's default rules are custom", () => {
    expect(getPresetName(DEFAULT_GRADING_RULES.cli, "theory")).toBe("Custom");
  });

  test("recognises an extra template by its rules", () => {
    expect(getPresetName(EXTRA_TEMPLATES.sql.rules, "code")).toBe("SQL queries");
  });

  test("edited rules are custom", () => {
    expect(getPresetName(DEFAULT_GRADING_RULES.theory + "\n- and be nice", "theory")).toBe(
      "Custom"
    );
  });

  test("surrounding whitespace does not make a preset custom", () => {
    expect(getPresetName(`\n  ${DEFAULT_GRADING_RULES.theory}  \n`, "theory")).toBe(
      "Default"
    );
  });
});
