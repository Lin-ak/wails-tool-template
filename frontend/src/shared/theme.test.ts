import { afterEach, describe, expect, it, vi } from "vitest";

import { initTheme } from "./theme";

// A controllable stand-in for matchMedia("(prefers-color-scheme: dark)").
function mockSystemAppearance(dark: boolean) {
  const listeners: Array<() => void> = [];
  const query = {
    matches: dark,
    addEventListener: (_: string, fn: () => void) => listeners.push(fn),
  };
  vi.stubGlobal("matchMedia", () => query);
  return (nowDark: boolean) => {
    query.matches = nowDark;
    for (const fn of listeners) fn();
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("initTheme", () => {
  it("applies the OS appearance on boot", () => {
    mockSystemAppearance(true);
    initTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("keeps following the OS when it changes", () => {
    const setSystemDark = mockSystemAppearance(false);
    initTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    setSystemDark(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    setSystemDark(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("ignores a Light/Dark choice saved by older builds", () => {
    localStorage.setItem("theme", "light");
    mockSystemAppearance(true);
    initTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
