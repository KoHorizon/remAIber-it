import { useEffect, useState } from "react";
import { api } from "../../api";
import type { Bank, BankType } from "../../types";
import type { BankMode } from "./types";

/**
 * Where the generated questions are headed: an existing bank, or a new one that
 * gets exported as JSON.
 */
export function useBankTarget(bankType: BankType) {
  const [allBanks, setAllBanks] = useState<Bank[]>([]);
  const [mode, setMode] = useState<BankMode>("new");
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [categoryName, setCategoryName] = useState("");

  useEffect(() => {
    // The list is a convenience, not a requirement: with the backend
    // unreachable you can still name a new bank and export the result.
    api.getBanks().then(setAllBanks).catch(() => setAllBanks([]));
  }, []);

  // Only banks of the current type can receive these questions — a theory bank
  // has nowhere to put a CLI answer.
  const banks = allBanks.filter((b) => b.bank_type === bankType);

  // Changing the type re-lists the banks, so a selection made under the old one
  // would point at a bank that is no longer offered.
  useEffect(() => {
    setSelectedBankId(null);
  }, [bankType]);

  function selectExisting(bankId: string) {
    setMode("existing");
    setSelectedBankId(bankId);
  }

  function selectNew() {
    setMode("new");
    setSelectedBankId(null);
  }

  return {
    banks,
    mode,
    selectedBankId,
    subject,
    categoryName,
    hasTarget:
      mode === "existing" ? selectedBankId !== null : subject.trim().length > 0,
    setSubject,
    setCategoryName,
    selectExisting,
    selectNew,
    clearSelection: () => setSelectedBankId(null),
  };
}
