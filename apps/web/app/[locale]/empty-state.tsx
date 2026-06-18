interface EmptyStateProps {
  title?: string;
}

export function EmptyState({ title = "No data available yet. Add records from Master Data." }: EmptyStateProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 pb-24 lg:pb-8">
      <div className="border border-slate-200 bg-white p-6">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
      </div>
    </section>
  );
}
