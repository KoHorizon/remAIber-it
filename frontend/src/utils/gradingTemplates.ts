// Grading rule templates
//
// These replace ONLY the "RULES:" block in the backend prompt. The backend
// handles everything else: splitting expected answers into numbered key points,
// asking the model to classify each as COVERED/MISSED, and parsing the JSON.
//
// Keep these SHORT (3-6 lines). Small local models (4-8B) lose track of long
// instruction blocks. Focus on judgment criteria, not on output format or
// decomposition - the backend owns that.

export const DEFAULT_GRADING_RULES: Record<string, string> = {
  theory: `- Accept synonyms and different wording if the core concept is correct
- Practical examples that demonstrate understanding count as COVERED
- Vague or technically incorrect statements = MISSED
- The user doesn't need to match the exact terminology`,

  code: `- Compare logic and structure, not variable names or formatting
- Functionally equivalent approaches are equally correct
- Code that wouldn't compile or produces wrong results = MISSED
- Don't penalize missing imports unless critical to the logic
- If the question explicitly specifies a function name or signature, mismatching it is MISSED.`,

  cli: `- Accept alternative commands that achieve the same goal
- Flag order doesn't matter
- Modern and legacy syntax both acceptable (e.g. git switch = git checkout)
- Extra harmless flags are fine
- Dangerous flags (--force, --hard) must match exactly when specified`,
};

// Optional specialized templates users can pick from
export const EXTRA_TEMPLATES: Record<
  string,
  { label: string; rules: string; bankTypes: string[] }
> = {
  strict_theory: {
    label: "Strict (exact concepts)",
    bankTypes: ["theory"],
    rules: `- Require the correct technical term, not just a vague description
- Partial answers that miss the core mechanism = MISSED
- No credit for analogies without the actual concept`,
  },
  lenient_theory: {
    label: "Lenient (understanding)",
    bankTypes: ["theory"],
    rules: `- Accept any phrasing that shows the user understands the concept
- Analogies and real-world examples count as COVERED
- Partial understanding = COVERED if the core idea is present
- Only mark MISSED if completely wrong or absent`,
  },
  exact_match: {
    label: "Exact match",
    bankTypes: ["code", "cli"],
    rules: `- Require near-exact match with the expected answer
- Variable names and structure must match closely
- No partial credit - either correct or wrong
- Whitespace and formatting differences are acceptable`,
  },
  sql: {
    label: "SQL queries",
    bankTypes: ["code"],
    rules: `- SQL keywords are case-insensitive (SELECT = select)
- Table and column names must be correct
- Whitespace and formatting don't matter
- Functionally equivalent queries are acceptable (subquery vs JOIN)
- Missing clauses that change the result = MISSED`,
  },
  conceptual_code: {
    label: "Conceptual (logic only)",
    bankTypes: ["code"],
    rules: `- Only check if the algorithmic approach is correct
- Ignore all syntax details, variable names, and formatting
- Pseudocode-level correctness is sufficient
- Focus on data flow and control flow, not language specifics`,
  },
};

export function getDefaultRules(bankType: string): string {
  return DEFAULT_GRADING_RULES[bankType] || DEFAULT_GRADING_RULES.theory;
}

export function getAvailableTemplates(bankType: string) {
  return Object.entries(EXTRA_TEMPLATES).filter(([, t]) =>
    t.bankTypes.includes(bankType)
  );
}
