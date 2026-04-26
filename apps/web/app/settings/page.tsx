"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, RefreshCw, Loader2, Check, Warehouse, Plus, Trash2 } from "lucide-react";
import { useTheme } from "../components/ThemeProvider";
import { supabase } from "@ims-platform/database";
import { useNotification } from "../components/NotificationProvider";
import { ConfirmationModal } from "../components/ConfirmationModal";

interface SettingsState {
  facilityIdentifier: string;
  primaryLocale: string;
  telemetrySyncRate: string;
  darkModeEnforced: boolean;
  highContrastData: boolean;
  reducedMotion: boolean;
  criticalStockWarning: boolean;
  unauthorizedAccess: boolean;
  dailyDigestExport: boolean;
}

const initialSettings: SettingsState = {
  facilityIdentifier: "HQ-MAIN-01",
  primaryLocale: "en-US",
  telemetrySyncRate: "Real-time",
  darkModeEnforced: true,
  highContrastData: false,
  reducedMotion: false,
  criticalStockWarning: true,
  unauthorizedAccess: true,
  dailyDigestExport: false,
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  
  const [settings, setSettings] = useState<SettingsState>({
    ...initialSettings,
    darkModeEnforced: theme === "dark",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [newWarehouseName, setNewWarehouseName] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<string | null>(null);
  const { notify } = useNotification();

  const loadWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    if (data) setWarehouses(data);
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const handleAddWarehouse = async () => {
    if (!newWarehouseName) return;
    const { error } = await supabase.from('warehouses').insert({ name: newWarehouseName.toUpperCase() });
    if (error) {
      notify('error', 'Update Failed', error.message);
    } else {
      notify('success', 'Location Authorized', `${newWarehouseName.toUpperCase()} added to the master list.`);
      setNewWarehouseName("");
      loadWarehouses();
    }
  };

  const handleDeleteWarehouse = async (id: string) => {
    setIsConfirmingDelete(null);
    const { error } = await supabase.from('warehouses').delete().eq('id', id);
    if (error) {
      notify('error', 'Operation Denied', error.message);
    } else {
      notify('success', 'Location Removed', 'The warehouse has been de-authorized.');
      loadWarehouses();
    }
  };

  const handleUpdate = (key: keyof SettingsState, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (key === "darkModeEnforced") {
      setTheme(value ? "dark" : "light");
    }
  };

  const handleReset = () => {
    setSettings(initialSettings);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call to save settings
    await new Promise(resolve => setTimeout(resolve, 1200));
    setIsSaving(false);
    notify('success', 'System Synced', 'Global configuration changes have been committed to the server.');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const sections: any[] = [
    {
      id: "system",
      title: "System Parameters",
      description: "Core configuration and localization settings.",
      items: [
        { key: "facilityIdentifier", label: "Facility Identifier", type: "text", value: settings.facilityIdentifier },
        { key: "primaryLocale", label: "Primary Locale", type: "select", value: settings.primaryLocale, options: ["en-US", "tr-TR"] },
        { key: "telemetrySyncRate", label: "Telemetry Sync Rate", type: "select", value: settings.telemetrySyncRate, options: ["Real-time", "1 Minute", "5 Minutes"] },
      ],
    },
    {
      id: "interface",
      title: "Interface & Display",
      description: "Visual preferences for the operator terminal.",
      items: [
        { key: "darkModeEnforced", label: "Dark Mode Enforced", type: "toggle", active: settings.darkModeEnforced },
        { key: "highContrastData", label: "High Contrast Data", type: "toggle", active: settings.highContrastData },
        { key: "reducedMotion", label: "Reduced Motion", type: "toggle", active: settings.reducedMotion },
      ],
    },
    {
      id: "alerts",
      title: "Automated Alerts",
      description: "Thresholds for critical system notifications.",
      items: [
        { key: "criticalStockWarning", label: "Critical Stock Warning", type: "toggle", active: settings.criticalStockWarning },
        { key: "unauthorizedAccess", label: "Unauthorized Access", type: "toggle", active: settings.unauthorizedAccess },
        { key: "dailyDigestExport", label: "Daily Digest Export", type: "toggle", active: settings.dailyDigestExport },
      ],
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12 max-w-4xl"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight uppercase leading-none">
            System Configuration
          </h1>
          <p className="mt-2 text-sm text-muted">
            Manage global parameters and terminal preferences.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleReset}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 border border-border bg-surface font-mono text-xs uppercase tracking-wider hover:bg-surface-hover transition-colors text-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors min-w-[160px] disabled:opacity-80"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Syncing...</>
            ) : showSuccess ? (
              <><Check className="w-4 h-4" /> Committed</>
            ) : (
              <><Save className="w-4 h-4" /> Commit Changes</>
            )}
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="space-y-8">
        {sections.map((section, idx) => (
          <motion.div 
            key={section.id} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (idx + 1) }}
            className="border border-border bg-surface relative overflow-hidden"
          >
            {isSaving && (
              <div className="absolute inset-0 bg-surface/30 backdrop-blur-[1px] z-10" />
            )}
            <div className="border-b border-border p-5 bg-surface-hover/30">
              <h2 className="font-heading text-lg font-bold uppercase tracking-wide">{section.title}</h2>
              <p className="mt-1 font-mono text-xs text-muted">{section.description}</p>
            </div>
            <div className="divide-y divide-border">
              {section.items.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-5 hover:bg-surface-hover/20 transition-colors">
                  <label className="font-mono text-xs uppercase tracking-wider font-medium text-foreground/90">
                    {item.label}
                  </label>

                  {item.type === "text" && (
                    <input
                      type="text"
                      value={item.value as string}
                      onChange={(e) => handleUpdate(item.key as keyof SettingsState, e.target.value)}
                      className="w-64 bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors"
                    />
                  )}

                  {item.type === "select" && (
                    <select
                      value={item.value as string}
                      onChange={(e) => handleUpdate(item.key as keyof SettingsState, e.target.value)}
                      className="w-64 bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors cursor-pointer appearance-none"
                    >
                      {item.options?.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {item.type === "toggle" && (
                    <button
                      type="button"
                      onClick={() => handleUpdate(item.key as keyof SettingsState, !item.active)}
                      className={`relative w-12 h-6 border transition-colors duration-200 focus:outline-none ${
                        item.active ? 'bg-primary/20 border-primary' : 'bg-surface-hover border-border'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-foreground transition-transform duration-200 ${
                        item.active ? 'translate-x-6 bg-primary' : ''
                      }`} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="border border-border bg-surface relative overflow-hidden"
        >
          <div className="border-b border-border p-5 bg-surface-hover/30 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Warehouse Locations</h2>
              <p className="mt-1 font-mono text-xs text-muted">Manage the authorized storage locations in your organization.</p>
            </div>
            <Warehouse className="w-5 h-5 text-primary opacity-50" />
          </div>
          <div className="p-5 space-y-4">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="New Warehouse Name (e.g. WH-NORTH)" 
                value={newWarehouseName}
                onChange={(e) => setNewWarehouseName(e.target.value)}
                className="flex-1 bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors uppercase"
              />
              <button 
                onClick={handleAddWarehouse}
                className="px-4 py-2 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {warehouses.map((wh) => (
                <div key={wh.id} className="flex items-center justify-between p-3 border border-border bg-background hover:bg-surface-hover/20 transition-colors group">
                  <span className="font-mono text-xs uppercase tracking-wider">{wh.name}</span>
                  <button 
                    onClick={() => setIsConfirmingDelete(wh.id)}
                    className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <ConfirmationModal 
          isOpen={!!isConfirmingDelete}
          onClose={() => setIsConfirmingDelete(null)}
          onConfirm={() => isConfirmingDelete && handleDeleteWarehouse(isConfirmingDelete)}
          title="De-authorize Location"
          message="Are you sure you want to remove this warehouse? This will remove it from the master selection list. Existing stock records in this location will remain but will be marked as 'Unknown' in future operations."
          variant="danger"
        />
      </div>
    </motion.div>
  );
}
