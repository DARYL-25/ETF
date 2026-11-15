"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * A plain GET form, so filters work without JavaScript. With JavaScript, ticking a box updates
 * results straight away. Checkbox groups collapse into one comma-separated URL parameter.
 */
export function AutoSubmitForm({ children, className }: { children: React.ReactNode; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const submit = (form: HTMLFormElement) => {
    const grouped = new Map<string, string[]>();
    for (const [key, value] of new FormData(form).entries()) {
      if (typeof value === "string" && value.trim() !== "") grouped.set(key, [...(grouped.get(key) ?? []), value.trim()]);
    }
    const query = new URLSearchParams();
    for (const [key, values] of grouped) query.set(key, values.join(","));
    const text = query.toString();
    start(() => router.push(text ? `/screener?${text}` : "/screener", { scroll: false }));
  };

  return (
    <form
      action="/screener"
      method="get"
      className={className}
      aria-busy={pending}
      onChange={(e) => {
        // Number boxes update on leaving the field or pressing Enter, not on each keystroke.
        if ((e.target as unknown as HTMLInputElement).type !== "number") submit(e.currentTarget);
      }}
      onBlur={(e) => {
        if ((e.target as unknown as HTMLInputElement).type === "number") submit(e.currentTarget);
      }}
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
    >
      {children}
    </form>
  );
}
