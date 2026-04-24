export default function DashboardPage() {
  return (
    <div className="animate-fade-in space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Welcome back. Here&apos;s an overview of your warehouse operations.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Items", value: "—", icon: "📦", trend: null },
          { label: "Low Stock", value: "—", icon: "⚠️", trend: null },
          { label: "Inbound Today", value: "—", icon: "📥", trend: null },
          { label: "Outbound Today", value: "—", icon: "📤", trend: null },
        ].map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-xl border border-border bg-surface p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums">
                  {stat.value}
                </p>
              </div>
              <span className="text-2xl">{stat.icon}</span>
            </div>
            {/* Decorative gradient line */}
            <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-primary/40 via-accent/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
        ))}
      </div>

      {/* Content Columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Recent Activity
          </h2>
          <div className="mt-6 flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <p className="mt-3 text-sm text-muted">
              Activity feed will appear here once connected.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Quick Actions
          </h2>
          <div className="mt-4 space-y-2">
            {[
              { label: "Scan Item", icon: "📷" },
              { label: "Add Product", icon: "➕" },
              { label: "Generate Report", icon: "📊" },
              { label: "Stock Transfer", icon: "🔄" },
            ].map((action) => (
              <button
                key={action.label}
                id={`action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-all duration-200 hover:bg-surface-hover hover:text-foreground"
              >
                <span>{action.icon}</span>
                {action.label}
                <svg
                  className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
