import type { ReactNode } from "react";

const toneClassName = {
  success: "border-green-200 bg-green-50 text-green-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700"
} as const;

export function StatusBadge({
  tone = "neutral",
  children
}: {
  tone?: keyof typeof toneClassName;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-semibold ${toneClassName[tone]}`}
    >
      {children}
    </span>
  );
}
