import { useState } from "react";
import type { BankType } from "../../types";

/** Everything `useGenerateConfig` returns. */
export type GenerateConfig = ReturnType<typeof useGenerateConfig>;

/**
 * The knobs that shape a generation request. Grouped because they travel
 * together — the panel that renders them and the request that consumes them
 * both want the whole set.
 */
export function useGenerateConfig() {
  const [bankType, setBankType] = useState<BankType>("theory");
  const [language, setLanguage] = useState<string | null>("javascript");
  const [count, setCount] = useState(10);
  const [direction, setDirection] = useState("");
  const [isDirectionOpen, setIsDirectionOpen] = useState(false);

  return {
    bankType,
    setBankType,
    language,
    setLanguage,
    count,
    setCount,
    direction,
    setDirection,
    isDirectionOpen,
    toggleDirection: () => setIsDirectionOpen((open) => !open),
    /** Only code banks carry a language; the others must send null. */
    requestLanguage: bankType === "code" ? language : null,
  };
}
