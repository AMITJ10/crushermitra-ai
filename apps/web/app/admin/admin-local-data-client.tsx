"use client";

import { useEffect, useState } from "react";

interface PaymentRecord {
  amount: number;
  companyName?: string;
  paidAt: string;
  paymentMethod: string;
  paymentStatus: "failed" | "paid" | "pending";
  planName: string;
  provider?: string;
  userEmail: string;
  userName: string;
}

interface PlatformUser {
  activatedAt?: string;
  companyName?: string;
  currentPlan?: string;
  email?: string;
  name?: string;
  paymentStatus?: string;
}

export function AdminDashboardLocalData() {
  const { payments, user } = useLocalAdminData();
  const paid = payments.filter((payment) => payment.paymentStatus === "paid");
  const pending = payments.filter((payment) => payment.paymentStatus !== "paid");
  const revenue = paid.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

  return (
    <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Users" value={user ? "1" : "0"} />
        <Metric label="Active paid users" value={user?.paymentStatus === "paid" ? "1" : "0"} />
        <Metric label="Payments" value={String(payments.length)} />
        <Metric label="Monthly revenue" value={`Rs. ${revenue.toLocaleString("en-IN")}`} />
      </div>
      <div className="border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">Latest local activity</h2>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No payment data yet. Complete a payment from the Billing page.</p>
        ) : (
          <p className="mt-3 text-sm text-slate-700">
            {paid.length} paid payment(s), {pending.length} pending/failed payment(s).
          </p>
        )}
      </div>
    </section>
  );
}

export function AdminUsersLocalData() {
  const { user } = useLocalAdminData();
  return (
    <AdminTable headers={["Name", "Email", "Company", "Plan", "Payment status"]}>
      {user ? (
        <tr className="border-t border-slate-200">
          <td className="px-4 py-3">{user.name ?? "-"}</td>
          <td className="px-4 py-3">{user.email ?? "-"}</td>
          <td className="px-4 py-3">{user.companyName ?? "-"}</td>
          <td className="px-4 py-3">{user.currentPlan ?? "-"}</td>
          <td className="px-4 py-3">{user.paymentStatus ?? "-"}</td>
        </tr>
      ) : (
        <EmptyRow colSpan={5} />
      )}
    </AdminTable>
  );
}

export function AdminPaymentsLocalData() {
  const { payments } = useLocalAdminData();
  return (
    <AdminTable headers={["User", "Plan", "Amount", "Method", "Status", "Date"]}>
      {payments.length === 0 ? <EmptyRow colSpan={6} /> : null}
      {payments.map((payment, index) => (
        <tr className="border-t border-slate-200" key={`${payment.paidAt}-${index}`}>
          <td className="px-4 py-3">{payment.userEmail}</td>
          <td className="px-4 py-3">{payment.planName}</td>
          <td className="px-4 py-3">Rs. {Number(payment.amount).toLocaleString("en-IN")}</td>
          <td className="px-4 py-3">{payment.paymentMethod}</td>
          <td className="px-4 py-3">{payment.paymentStatus}</td>
          <td className="px-4 py-3">{new Date(payment.paidAt).toLocaleString("en-IN")}</td>
        </tr>
      ))}
    </AdminTable>
  );
}

export function AdminReportsLocalData() {
  const { payments, user } = useLocalAdminData();
  const [filters, setFilters] = useState({
    fromDate: "",
    paymentStatus: "",
    plan: "",
    search: "",
    toDate: ""
  });
  const filteredPayments = payments.filter((payment) => {
    const paidAt = payment.paidAt.slice(0, 10);
    const search = filters.search.trim().toLowerCase();
    if (filters.fromDate && paidAt < filters.fromDate) return false;
    if (filters.toDate && paidAt > filters.toDate) return false;
    if (filters.plan && payment.planName !== filters.plan) return false;
    if (filters.paymentStatus && payment.paymentStatus !== filters.paymentStatus) return false;
    if (
      search &&
      ![payment.userEmail, payment.userName, payment.companyName, payment.planName, payment.paymentMethod, payment.paymentStatus]
        .some((value) => String(value ?? "").toLowerCase().includes(search))
    ) {
      return false;
    }
    return true;
  });
  const paid = filteredPayments.filter((payment) => payment.paymentStatus === "paid");
  const revenue = paid.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const planName = user?.currentPlan ?? "No active plan";
  const planOptions = Array.from(new Set(payments.map((payment) => payment.planName).filter(Boolean)));
  const planGroups = groupPayments(filteredPayments, "planName");
  const revenueGroups = groupRevenue(filteredPayments);

  function exportCsv() {
    downloadText("crushermitra-admin-payments.csv", paymentsToCsv(filteredPayments), "text/csv;charset=utf-8");
  }

  function exportPdf() {
    const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!popup) {
      return;
    }
    popup.document.write(createAdminPrintableReport(filteredPayments, revenue));
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 border border-slate-200 bg-white p-4 md:grid-cols-5">
        <AdminFilterInput label="From date" onChange={(value) => setFilters((current) => ({ ...current, fromDate: value }))} type="date" value={filters.fromDate} />
        <AdminFilterInput label="To date" onChange={(value) => setFilters((current) => ({ ...current, toDate: value }))} type="date" value={filters.toDate} />
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Plan
          <select className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" onChange={(event) => setFilters((current) => ({ ...current, plan: event.target.value }))} value={filters.plan}>
            <option value="">All</option>
            {planOptions.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Payment status
          <select className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" onChange={(event) => setFilters((current) => ({ ...current, paymentStatus: event.target.value }))} value={filters.paymentStatus}>
            <option value="">All</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <AdminFilterInput label="User/company" onChange={(value) => setFilters((current) => ({ ...current, search: value }))} placeholder="Search users or company" value={filters.search} />
        <div className="flex flex-wrap gap-2 md:col-span-5">
          <button className="min-h-11 rounded-md border border-slate-300 px-4 text-sm font-bold" onClick={exportCsv} type="button">Export CSV</button>
          <button className="min-h-11 rounded-md border border-slate-300 px-4 text-sm font-bold" onClick={exportPdf} type="button">Export PDF</button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Total users" value={user ? "1" : "0"} />
        <Metric label="Active paid users" value={user?.paymentStatus === "paid" ? "1" : "0"} />
        <Metric label="Plan-wise users" value={planName} />
        <Metric label="Plan-wise revenue" value={`Rs. ${revenue.toLocaleString("en-IN")}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Chart title="Plan-wise users" values={planGroups} />
        <Chart title="Monthly revenue" values={revenueGroups} />
        <Chart title="User growth" values={groupPayments(filteredPayments, "paidAt")} />
        <Chart title="Usage by plan" values={planGroups} />
      </div>
      <AdminTable headers={["User", "Plan", "Amount", "Method", "Status", "Date"]}>
        {filteredPayments.length === 0 ? <EmptyRow colSpan={6} /> : null}
        {filteredPayments.map((payment, index) => (
          <tr className="border-t border-slate-200" key={`${payment.paidAt}-${index}`}>
            <td className="px-4 py-3">{payment.userEmail}</td>
            <td className="px-4 py-3">{payment.planName}</td>
            <td className="px-4 py-3">Rs. {Number(payment.amount).toLocaleString("en-IN")}</td>
            <td className="px-4 py-3">{payment.paymentMethod}</td>
            <td className="px-4 py-3">{payment.paymentStatus}</td>
            <td className="px-4 py-3">{new Date(payment.paidAt).toLocaleString("en-IN")}</td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}

function useLocalAdminData(): { payments: PaymentRecord[]; user: PlatformUser | null } {
  const [data, setData] = useState<{ payments: PaymentRecord[]; user: PlatformUser | null }>({
    payments: [],
    user: null
  });

  useEffect(() => {
    function load() {
      const storedPayments = readJson<PaymentRecord[]>("crushermitra_payment_records") ?? [];
      const cleanPayments = storedPayments.filter(isRealPaymentRecord);
      if (cleanPayments.length !== storedPayments.length) {
        window.localStorage.setItem("crushermitra_payment_records", JSON.stringify(cleanPayments));
      }
      setData({
        payments: cleanPayments,
        user: readJson<PlatformUser>("crushermitra_platform_user")
      });
    }

    load();
    const interval = window.setInterval(load, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return data;
}

function isRealPaymentRecord(payment: PaymentRecord): boolean {
  if (payment.userEmail === "example@shivneri") return false;
  if (payment.provider === "demo") return false;
  if (!payment.paidAt || !payment.planName || !payment.paymentMethod) return false;
  return true;
}

function AdminTable({ children, headers }: { children: React.ReactNode; headers: string[] }) {
  return (
    <div className="overflow-x-auto border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase text-slate-600">
          <tr>{headers.map((header) => <th className="px-4 py-3" key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td className="px-4 py-6 text-center text-slate-500" colSpan={colSpan}>
        No local payment/user records yet. Complete a payment from Billing.
      </td>
    </tr>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-3 text-2xl font-black">{value}</p>
    </article>
  );
}

function Chart({ title, values }: { title: string; values: Array<{ label: string; value: number }> }) {
  const max = Math.max(...values.map((item) => item.value), 1);
  const colors = ["#0891b2", "#16a34a", "#f59e0b", "#7c3aed", "#dc2626"];
  return (
    <article className="border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-4 rounded-md bg-slate-50 p-4">
        {values.length === 0 ? (
          <div className="grid h-44 place-items-center text-sm text-slate-500">No live payment records yet.</div>
        ) : (
          <>
            <div className="flex h-36 items-end justify-center gap-4">
              {values.map((item, index) => (
                <span
                  className="w-10 rounded-t"
                  key={item.label}
                  style={{ backgroundColor: colors[index % colors.length], height: `${Math.max(6, (item.value / max) * 100)}%` }}
                  title={`${item.label}: ${item.value.toLocaleString("en-IN")}`}
                />
              ))}
            </div>
            <div className="mt-3 grid gap-1 text-xs font-semibold text-slate-600">
              {values.map((item, index) => (
                <div className="flex justify-between gap-2" key={item.label}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-3 rounded-sm" style={{ backgroundColor: colors[index % colors.length] }} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span>{item.value.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function AdminFilterInput({
  label,
  onChange,
  placeholder = "All",
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "date" | "text";
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <input className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} value={value} />
    </label>
  );
}

function groupPayments(payments: PaymentRecord[], key: "paidAt" | "planName"): Array<{ label: string; value: number }> {
  const groups = new Map<string, number>();
  for (const payment of payments) {
    const label = key === "paidAt" ? payment.paidAt.slice(0, 7) : payment.planName;
    groups.set(label, (groups.get(label) ?? 0) + 1);
  }
  return Array.from(groups.entries()).map(([label, value]) => ({ label, value })).slice(0, 6);
}

function groupRevenue(payments: PaymentRecord[]): Array<{ label: string; value: number }> {
  const groups = new Map<string, number>();
  for (const payment of payments.filter((row) => row.paymentStatus === "paid")) {
    const label = payment.paidAt.slice(0, 7);
    groups.set(label, (groups.get(label) ?? 0) + Number(payment.amount ?? 0));
  }
  return Array.from(groups.entries()).map(([label, value]) => ({ label, value })).slice(0, 6);
}

function paymentsToCsv(payments: PaymentRecord[]): string {
  const headers: Array<keyof PaymentRecord> = ["userEmail", "planName", "amount", "paymentMethod", "paymentStatus", "paidAt"];
  return [headers.join(","), ...payments.map((payment) => headers.map((key) => csvCell(payment[key])).join(","))].join("\n");
}

function createAdminPrintableReport(payments: PaymentRecord[], revenue: number): string {
  const rows = payments
    .map(
      (payment) =>
        `<tr><td>${escapeHtml(payment.userEmail)}</td><td>${escapeHtml(payment.planName)}</td><td>${payment.amount}</td><td>${escapeHtml(payment.paymentMethod)}</td><td>${escapeHtml(payment.paymentStatus)}</td><td>${escapeHtml(new Date(payment.paidAt).toLocaleString("en-IN"))}</td></tr>`
    )
    .join("");
  return `<!doctype html><html><head><title>CrusherMitra Admin Report</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #cbd5e1;padding:8px;text-align:left}.metric{border:1px solid #cbd5e1;padding:12px;margin:16px 0;display:inline-block}</style></head><body><h1>CrusherMitra Admin Report</h1><div class="metric">Revenue: <strong>Rs. ${revenue.toLocaleString("en-IN")}</strong></div><table><thead><tr><th>User</th><th>Plan</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows || "<tr><td colspan='6'>No live payment records yet.</td></tr>"}</tbody></table></body></html>`;
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function readJson<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}
