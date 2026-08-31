import { describe, expect, test } from "vitest";
import { matchShortcut } from "./shortcuts";

function key(k: string, mods: { meta?: boolean; ctrl?: boolean; shift?: boolean; alt?: boolean } = {}) {
  return {
    key: k,
    metaKey: mods.meta ?? false,
    ctrlKey: mods.ctrl ?? false,
    shiftKey: mods.shift ?? false,
    altKey: mods.alt ?? false,
  };
}

describe("matchShortcut", () => {
  test("Cmd+Enter submits", () => {
    expect(matchShortcut(key("Enter", { meta: true }))).toBe("submit");
  });

  test("Ctrl+Enter submits, for Windows and Linux", () => {
    expect(matchShortcut(key("Enter", { ctrl: true }))).toBe("submit");
  });

  test("bare Enter does not submit — it's a newline in a textarea", () => {
    expect(matchShortcut(key("Enter"))).toBeNull();
  });

  test("Escape cancels", () => {
    expect(matchShortcut(key("Escape"))).toBe("escape");
  });

  test("ignores keys it doesn't own", () => {
    expect(matchShortcut(key("a", { meta: true }))).toBeNull();
    expect(matchShortcut(key("ArrowDown", { meta: true }))).toBeNull();
    expect(matchShortcut(key("Tab"))).toBeNull();
  });

  // Cmd+Shift+Enter and Alt+Enter are distinct gestures a view may want later;
  // treating them as plain submit would silently swallow them.
  test("does not claim Enter with extra modifiers", () => {
    expect(matchShortcut(key("Enter", { meta: true, shift: true }))).toBeNull();
    expect(matchShortcut(key("Enter", { meta: true, alt: true }))).toBeNull();
  });

  test("does not claim modified Escape", () => {
    expect(matchShortcut(key("Escape", { meta: true }))).toBeNull();
    expect(matchShortcut(key("Escape", { shift: true }))).toBeNull();
  });
});
