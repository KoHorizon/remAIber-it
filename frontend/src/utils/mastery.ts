import type { Bank } from "../types";

export function getMasteryLevel(mastery: number): string {
  if (mastery >= 80) return "excellent";
  if (mastery >= 60) return "good";
  if (mastery >= 40) return "fair";
  if (mastery > 0) return "needs-work";
  return "none";
}

export function getMasteryColor(mastery: number): string {
  if (mastery >= 80) return "mastery-excellent";
  if (mastery >= 60) return "mastery-good";
  if (mastery >= 40) return "mastery-fair";
  if (mastery > 0) return "mastery-needs-work";
  return "mastery-none";
}

export function getMasteryLabel(mastery: number): string {
  if (mastery >= 80) return "Mastered";
  if (mastery >= 60) return "Good";
  if (mastery >= 40) return "Learning";
  if (mastery > 0) return "Needs work";
  return "Not practiced";
}

export function getBankTypeBadge(bank: Bank): {
  icon: string;
  label: string;
  className: string;
} {
  if (bank.bank_type === "code") {
    const langLabel = bank.language
      ? bank.language.charAt(0).toUpperCase() + bank.language.slice(1)
      : "Code";
    return { icon: "💻", label: langLabel, className: "badge-code" };
  }
  if (bank.bank_type === "cli") {
    return { icon: "⌨️", label: "CLI", className: "badge-cli" };
  }
  return { icon: "📝", label: "Theory", className: "badge-theory" };
}
