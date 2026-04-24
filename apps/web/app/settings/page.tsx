export default function SettingsPage() {
  const sections = [
    {
      id: "general",
      title: "General",
      description: "Basic application preferences and configuration.",
      items: [
        { label: "Warehouse Name", type: "text" as const, placeholder: "Main Warehouse" },
        { label: "Default Language", type: "select" as const, options: ["English", "Türkçe"] },
        { label: "Timezone", type: "select" as const, options: ["UTC+3 (Istanbul)", "UTC+0 (London)", "UTC-5 (New York)"] },
      ],
    },
    {
      id: "appearance",
      title: "Appearance",
      description: "Customize the look and feel of the application.",
      items: [
        { label: "Dark Mode", type: "toggle" as const },
        { label: "Compact View", type: "toggle" as const },
        { label: "Show Animations", type: "toggle" as const },
      ],
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Configure how and when you receive alerts.",
      items: [
        { label: "Low Stock Alerts", type: "toggle" as const },
        { label: "Inbound Shipments", type: "toggle" as const },
        { label: "Daily Summary Email", type: "toggle" as const },
      ],
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Configure your warehouse management preferences.
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {sections.map((section) => (
          <div
            key={section.id}
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-semibold">{section.title}</h2>
              <p className="mt-0.5 text-xs text-muted">{section.description}</p>
            </div>
            <div className="divide-y divide-border">
              {section.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <label className="text-sm font-medium" htmlFor={`setting-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    {item.label}
                  </label>

                  {item.type === "text" && (
                    <input
                      id={`setting-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                      type="text"
                      placeholder={item.placeholder}
                      className="h-9 w-64 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-all duration-200 placeholder:text-muted/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    />
                  )}

                  {item.type === "select" && (
                    <select
                      id={`setting-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                      className="h-9 w-64 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-all duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    >
                      {item.options?.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {item.type === "toggle" && (
                    <button
                      id={`setting-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                      type="button"
                      className="group relative h-6 w-11 rounded-full bg-border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      aria-label={`Toggle ${item.label}`}
                    >
                      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Save Bar */}
      <div className="flex items-center justify-end gap-3 rounded-xl border border-border bg-surface px-6 py-4">
        <button
          id="btn-settings-cancel"
          className="h-10 rounded-lg border border-border px-5 text-sm font-medium text-muted transition-all duration-200 hover:bg-surface-hover hover:text-foreground"
        >
          Cancel
        </button>
        <button
          id="btn-settings-save"
          className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 hover:brightness-110 active:scale-[0.98]"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
