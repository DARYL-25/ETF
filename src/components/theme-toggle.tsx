"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

/** Runs before first paint, so a saved theme never flashes the wrong colours. */
export const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {
      // Storage can be blocked; the system theme still applies.
    }
  }, []);

  const change = (next: Theme) => {
    setTheme(next);
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      // Applies for this visit only.
    }
    if (next === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
    window.dispatchEvent(new Event("themechange"));
  };

  return (
    <label className="flex items-center justify-between gap-2 text-[0.85rem] text-muted">
      Theme
      <select className="rounded border border-line bg-transparent px-1.5 py-1 text-ink" value={theme} onChange={(e) => change(e.target.value as Theme)}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
