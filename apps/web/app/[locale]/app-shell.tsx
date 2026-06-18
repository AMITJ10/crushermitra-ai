"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CrusherMitraLogo } from "../../components/crushermitra-logo";

interface AppShellProps {
  children: ReactNode;
  locale: string;
  title: string;
  subtitle?: string;
}

const navigationItems = [
  { key: "dashboard", label: "Dashboard", href: "dashboard" },
  { key: "master-data", label: "Master data", href: "master-data" },
  { key: "orders", label: "Orders", href: "orders" },
  { key: "dispatch", label: "Dispatch", href: "dispatch" },
  { key: "operations", label: "Operations", href: "operations" },
  { key: "inventory", label: "Inventory", href: "inventory" },
  { key: "reports", label: "Reports", href: "reports" },
  { key: "profile", label: "Profile", href: "profile" },
  { key: "billing", label: "Billing", href: "billing" }
];

export function AppShell({ children, locale, subtitle, title }: AppShellProps) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950 lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-slate-950 px-4 py-5 text-white lg:block">
        <CrusherMitraLogo inverse />
        <nav className="mt-8 grid gap-2 text-sm font-semibold" aria-label="Primary navigation">
          {navigationItems.map((item) => {
            const href = `/${locale}/${item.href}`;
            const active = pathname === href || (item.key === "dashboard" && pathname === `/${locale}`);

            return (
              <a
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-3 focus:outline-none ${
                  active
                    ? "bg-cyan-700 text-white"
                    : "text-slate-100 hover:bg-slate-800 focus:bg-slate-800"
                }`}
                href={href}
                key={item.key}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-normal md:text-3xl">{title}</h1>
              {subtitle ? <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p> : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <a
                className="min-h-10 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                href={`/${locale}/profile`}
              >
                Account
              </a>
              <form action="/api/v1/auth/logout" method="post">
                <button
                  className="min-h-10 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  type="submit"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </header>

        {children}

        <nav className="fixed inset-x-0 bottom-0 grid grid-cols-3 border-t border-slate-200 bg-white text-center text-xs font-semibold text-slate-700 lg:hidden">
          {navigationItems.slice(0, 6).map((item) => {
            const href = `/${locale}/${item.href}`;
            const active = pathname === href || (item.key === "dashboard" && pathname === `/${locale}`);

            return (
              <a
                aria-current={active ? "page" : undefined}
                className={`min-h-14 px-1 py-3 ${active ? "bg-cyan-50 text-cyan-800" : ""}`}
                href={href}
                key={item.key}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
    </main>
  );
}
