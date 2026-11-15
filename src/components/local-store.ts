"use client";

import { useCallback, useEffect, useState } from "react";

/** Saved on this device until accounts are on. Storage can be blocked, so every access is guarded. */
export function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const event = `local:${key}`;
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) setValue(JSON.parse(raw));
      } catch {
        // Keep the in-memory value.
      }
    };
    read();
    window.addEventListener(event, read);
    return () => window.removeEventListener(event, read);
  }, [key, event]);
  const save = useCallback((next: T) => {
    setValue(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event(event));
    } catch {
      // Applies for this visit only.
    }
  }, [key, event]);
  return [value, save] as const;
}
