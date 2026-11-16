"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Lists that follow a signed-in reader across devices. Everything else stays on the device. */
const SYNCED = new Set(["watchlists", "portfolios"]);

/**
 * Saved on this device, and also in the reader's account when they are signed in.
 * The account copy wins when it exists; a device copy made before signing in is uploaded once.
 * Storage can be blocked, so every access is guarded. The third value says whether the account is in use.
 */
export function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [inAccount, setInAccount] = useState(false);
  const event = `local:${key}`;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const account = useRef(false);

  const push = useCallback((next: T) => {
    fetch("/api/v1/me/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: key, value: next }) }).catch(() => undefined);
  }, [key]);

  useEffect(() => {
    let local: T | null = null;
    const read = () => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) { local = JSON.parse(raw); setValue(local as T); }
      } catch {
        // Keep the in-memory value.
      }
    };
    read();
    window.addEventListener(event, read);
    let alive = true;
    if (SYNCED.has(key)) {
      fetch(`/api/v1/me/state?kind=${key}`).then(async (r) => {
        if (!alive || !r.ok) return;
        const body = (await r.json()) as { signed_in: boolean; value?: T | null };
        if (!body.signed_in) return;
        account.current = true;
        setInAccount(true);
        if (body.value !== null && body.value !== undefined) {
          setValue(body.value);
          try { localStorage.setItem(key, JSON.stringify(body.value)); } catch { /* This visit only. */ }
        } else if (Array.isArray(local) && local.length) push(local);
      }).catch(() => undefined);
    }
    return () => { alive = false; window.removeEventListener(event, read); };
  }, [key, event, push]);

  const save = useCallback((next: T) => {
    setValue(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event(event));
    } catch {
      // Applies for this visit only.
    }
    if (account.current) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => push(next), 600);
    }
  }, [key, event, push]);
  return [value, save, inAccount] as const;
}
