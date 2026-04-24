export default function InventoryPage() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="mt-1 text-sm text-muted">
            Browse, search, and manage your warehouse stock.
          </p>
        </div>
        <button
          id="btn-add-item"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 hover:brightness-110 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Item
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            id="search-inventory"
            type="text"
            placeholder="Search by SKU, name, or location..."
            className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm outline-none transition-all duration-200 placeholder:text-muted/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          id="filter-category"
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-muted outline-none transition-all duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        >
          <option>All Categories</option>
        </select>
        <select
          id="filter-status"
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-muted outline-none transition-all duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        >
          <option>All Status</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-hover/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                SKU
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Product Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Category
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                Quantity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-4 py-16 text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-muted">
                    No inventory items yet
                  </p>
                  <p className="text-xs text-muted/70">
                    Items will appear here once the system is connected.
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
