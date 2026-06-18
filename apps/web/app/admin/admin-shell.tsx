"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CrusherMitraLogo } from "../../components/crushermitra-logo";

const adminItems = [
  { label: "Admin Dashboard", href: "/admin/dashboard" },
  { label: "Users", href: "/admin/users" },
  { label: "Plans", href: "/admin/plans" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Reports", href: "/admin/reports" },
  { label: "Leads", href: "/admin/leads" },
  { label: "Settings", href: "/admin/settings" }
];

export function AdminShell({ children, title }: { children: ReactNode; title: string }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950 lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-slate-950 px-4 py-5 text-white lg:block">
        <CrusherMitraLogo inverse />
        <nav className="mt-8 grid gap-2 text-sm font-semibold" aria-label="Admin navigation">
          {adminItems.map((item) => {
            const active = pathname === item.href;
            return (
              <a
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-3 ${active ? "bg-cyan-700 text-white" : "text-slate-100 hover:bg-slate-800"}`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            );
          })}
          <form action="/api/v1/admin/auth/logout" method="post">
            <button className="mt-2 w-full rounded-md px-3 py-3 text-left text-sm font-semibold text-slate-100 hover:bg-slate-800" type="submit">
              Logout
            </button>
          </form>
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <h1 className="text-2xl font-black md:text-3xl">{title}</h1>
            <a className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold lg:hidden" href="/admin/dashboard">
              Admin
            </a>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
