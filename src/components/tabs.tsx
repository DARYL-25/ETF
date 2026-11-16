"use client";

import { useState } from "react";

/** A row of choices that swaps the panel below. Panels are rendered on the server and passed in ready. */
export function Tabs({ label, tabs }: { label: string; tabs: { id: string; label: string; panel: React.ReactNode }[] }) {
  const [on, setOn] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === on) ?? tabs[0];
  return (
    <div>
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-2"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          const i = tabs.findIndex((t) => t.id === on);
          const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
          setOn(next.id);
          (e.currentTarget.querySelector(`[data-tab="${next.id}"]`) as HTMLElement | null)?.focus();
        }}>
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" data-tab={t.id} aria-selected={t.id === on} aria-controls={`panel-${t.id}`} tabIndex={t.id === on ? 0 : -1}
            className={t.id === on ? "chip chip-on" : "chip"} onClick={() => setOn(t.id)}>{t.label}</button>
        ))}
      </div>
      {current ? <div key={current.id} id={`panel-${current.id}`} role="tabpanel" className="mt-4">{current.panel}</div> : null}
    </div>
  );
}
