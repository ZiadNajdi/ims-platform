"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Package, Settings, Database } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface/80 backdrop-blur-md">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center bg-foreground text-background">
          <Database className="w-4 h-4" />
        </div>
        <div>
          <h1 className="font-heading text-sm font-bold tracking-widest uppercase">IMS-Viviana</h1>
          <p className="font-mono text-[10px] text-muted uppercase tracking-wider">v0.1.0-alpha</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        <p className="mb-4 px-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted/80">
          Core Modules
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.label.toLowerCase()}`}
              className={`group flex items-center gap-3 px-3 py-2 transition-all duration-200 border-l-2 ${
                isActive
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-transparent text-muted hover:border-border hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              <item.icon className={`w-4 h-4 transition-colors ${isActive ? "text-primary" : "text-muted group-hover:text-foreground"}`} />
              <span className="font-mono text-xs uppercase tracking-wider font-medium">{item.label}</span>
              {isActive && (
                <span className="ml-auto flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Operator Profile */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 border border-border bg-surface-hover/50 p-2 hover:bg-surface-hover transition-colors cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center bg-primary/10 text-primary font-heading font-bold text-sm">
            V
          </div>
          <div className="flex-1 truncate">
            <p className="truncate font-mono text-xs font-bold uppercase tracking-wider">Viviana</p>
            <p className="truncate font-mono text-[10px] text-muted uppercase">Terminal 01</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
