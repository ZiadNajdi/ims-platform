"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Plus, FileDown, MoreHorizontal, ArrowUpDown, Loader2, X, QrCode, Edit3, Settings2, Eye, Trash2, Archive, RotateCcw, Truck, UserCheck, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Modal } from "../components/Modal";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { supabase } from "@ims-platform/database";
import { formatDateTime } from "@ims-platform/utils";
import { useNotification } from "../components/NotificationProvider";
import { validateSKU, validateQuantity, formatInput } from "../utils/validation";

interface InventoryItem {
  stock_code: string;
  name: string;
  category: string;
  unit: string;
  min_stock: number;
  total_qty: number;
  locations_json: Record<string, number>;
  last_updated: string | null;
  status: 'active' | 'archived';
  health_status: "Optimal" | "Low" | "Critical";
}

const PAGE_SIZE = 10;

const fetchInventory = async (query: string, categoryFilter: string, statusFilter: string | null, warehouseFilter: string, page: number, viewArchived: boolean): Promise<{ data: InventoryItem[], count: number }> => {
  let dbQuery = supabase
    .from('inventory_summary')
    .select('*', { count: 'exact' });
  // Filter by database status (active/archived)
  dbQuery = dbQuery.eq('status', viewArchived ? 'archived' : 'active');

  if (categoryFilter) {
    dbQuery = dbQuery.eq('category', categoryFilter);
  }

  if (warehouseFilter) {
    dbQuery = dbQuery.filter(`locations_json->${warehouseFilter}`, 'not.is', null);
  }

  if (statusFilter) {
    dbQuery = dbQuery.eq('health_status', statusFilter);
  }

  if (query) {
    dbQuery = dbQuery.or(`stock_code.ilike.%${query}%,name.ilike.%${query}%`);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  dbQuery = dbQuery.range(from, to).order('stock_code', { ascending: true });

  const { data, count, error } = await dbQuery;

  if (error) {
    console.error("Error fetching inventory:", error);
    return { data: [], count: 0 };
  }
  return { data: data || [], count: count || 0 };
};

export default function InventoryPage() {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'info' } | null>(null);
  const { notify } = useNotification();

  const loadWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('name').order('name');
    if (data) setWarehouses(data.map(w => w.name));
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  // Form State
  const [newEntity, setNewEntity] = useState({ name: '', sku: '', category: 'Electronics', unit: 'pcs', minStock: 0 });
  const [isSaving, setIsSaving] = useState(false);

  // Manage State
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [menuOpenSku, setMenuOpenSku] = useState<string | null>(null);
  const [adjustStockPartner, setAdjustStockPartner] = useState('');
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [viewArchived, setViewArchived] = useState(false);
  const [lastSupplier, setLastSupplier] = useState<string | null>(null);

  const loadData = () => {
    setIsLoading(true);
    fetchInventory(searchQuery, categoryFilter, statusFilter, warehouseFilter, currentPage, viewArchived).then((res) => {
      setData(res.data);
      setTotalCount(res.count);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    if (activeModal?.startsWith("Entity Details:") && selectedItem) {
      supabase
        .from('transactions')
        .select('partner_name')
        .eq('item_stock_code', selectedItem.stock_code)
        .eq('type', 'Inbound')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setLastSupplier(data.partner_name);
          else setLastSupplier('N/A');
        });
    }
  }, [activeModal, selectedItem]);

  const handleRestore = async (sku: string) => {
    setIsSaving(true);
    const { error } = await supabase.from('items').update({ status: 'active' }).eq('stock_code', sku);
    if (error) notify('error', 'Restore Failed', error.message);
    else {
      notify('success', 'Entity Restored', `SKU ${sku} is now active again.`);
      loadData();
    }
    setIsSaving(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, categoryFilter, statusFilter, warehouseFilter, currentPage, viewArchived]);

  const UNITS = ["pcs", "kg", "m", "box", "roll", "liter", "set", "unit"];

  const handleSaveEntity = async () => {
    const skuValidation = validateSKU(newEntity.sku);
    if (!skuValidation.isValid) {
      notify('error', 'Validation Error', skuValidation.error || "Invalid SKU");
      return;
    }

    if (!newEntity.name) {
      notify('error', 'Missing Data', 'Entity name is required.');
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.from('items').insert({
      stock_code: formatInput(newEntity.sku),
      name: newEntity.name,
      category: newEntity.category,
      unit: newEntity.unit,
      min_stock: newEntity.minStock
    });

    if (error) {
      notify('error', 'System Error', error.message);
    } else {
      notify('success', 'Entity Registered', `${newEntity.sku} is now live in the master database.`);
      setActiveModal(null);
      setNewEntity({ name: '', sku: '', category: 'Electronics', unit: 'pcs', minStock: 0 });
      loadData();
    }
    setIsSaving(false);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      // Fetch all matching records for export (ignoring pagination)
      let dbQuery = supabase
        .from('inventory_summary')
        .select('*')
        .eq('status', viewArchived ? 'archived' : 'active');

      if (categoryFilter) dbQuery = dbQuery.eq('category', categoryFilter);
      if (warehouseFilter) dbQuery = dbQuery.filter(`locations_json->${warehouseFilter}`, 'not.is', null);
      if (statusFilter) dbQuery = dbQuery.eq('health_status', statusFilter);
      if (searchQuery) dbQuery = dbQuery.or(`stock_code.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`);

      const { data: exportData, error } = await dbQuery.order('stock_code', { ascending: true });

      if (error || !exportData) throw error;

      const headers = ["SKU", "Name", "Category", "Location", "Quantity", "Unit", "Min Stock", "Status", "Last Updated"];

      const escapeCSV = (str: any) => {
        const val = str === null || str === undefined ? "" : String(str);
        if (val.includes(",") || val.includes("\"") || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      const rows = exportData.map(item => {
        return [
          escapeCSV(item.stock_code),
          escapeCSV(item.name),
          escapeCSV(item.category),
          escapeCSV(Object.entries(item.locations_json || {}).map(([loc, qty]) => `${loc}: ${qty}`).join(' | ')),
          item.total_qty || 0,
          escapeCSV(item.unit),
          item.min_stock || 0,
          item.health_status,
          item.last_updated ? new Date(item.last_updated).toISOString() : "Never"
        ];
      });

      const csvString = [headers, ...rows].map(row => row.join(",")).join("\n");
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `ims_inventory_${viewArchived ? 'archived_' : ''}${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notify('success', 'Export Complete', `Exported ${exportData.length} records to CSV.`);
      setActiveModal(null);
    } catch (err: any) {
      console.error("Export error:", err);
      notify('error', 'Export Failed', err.message || 'Could not generate CSV export.');
    } finally {
      setIsExporting(false);
    }
  };

  const [adjustStockQty, setAdjustStockQty] = useState(0);
  const [adjustStockType, setAdjustStockType] = useState("Inbound");
  const [adjustStockLoc, setAdjustStockLoc] = useState("");
  const [editEntity, setEditEntity] = useState<any>(null);

  const handleManageAction = async (action: string, item: InventoryItem) => {
    setSelectedItem(item);
    if (action === "Edit Profile") {
      setEditEntity({ ...item, minStock: item.min_stock });
      setActiveModal(`Edit Entity Profile`);
    } else if (action === "Adjust Stock") {
      setAdjustStockQty(0);
      setAdjustStockType("Inbound");
      setAdjustStockLoc("");
      setActiveModal(`Adjust Stock`);
    } else if (action === "Print QR Code") {
      setActiveModal(`Barcode: ${item.stock_code}`);
    } else if (action === "All Entity Details") {
      setActiveModal(`Entity Details: ${item.stock_code}`);
    } else if (action === "Restore Entity") {
      handleRestore(item.stock_code);
    } else if (action === "Archive Entity") {
      handleArchive(item.stock_code);
    }
  };

  const handleArchive = (sku: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Archive Entity",
      message: `Are you sure you want to archive SKU: ${sku}? This will remove it from the active inventory directory. You can restore it later if needed.`,
      variant: 'danger',
      onConfirm: async () => {
        setIsSaving(true);
        const { error } = await supabase.from('items').update({ status: 'archived' }).eq('stock_code', sku);
        if (error) {
          notify('error', 'Archive Failed', error.message);
        } else {
          notify('success', 'Entity Archived', `SKU ${sku} has been relocated to archives.`);
          loadData();
        }
        setIsSaving(false);
        setConfirmModal(null);
        setActiveModal(null);
      }
    });
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('items').update({
      name: editEntity.name,
      category: editEntity.category,
      unit: editEntity.unit,
      min_stock: editEntity.minStock
    }).eq('stock_code', editEntity.stock_code);

    if (error) notify('error', 'Update Failed', error.message);
    else {
      notify('success', 'Profile Updated', `SKU ${editEntity.stock_code} details updated.`);
      setActiveModal(null);
      loadData();
    }
    setIsSaving(false);
  };

  const handleSaveStock = async () => {
    const skuValidation = validateSKU(selectedItem?.stock_code || "");
    if (!skuValidation.isValid) return;

    const qtyValidation = validateQuantity(adjustStockQty);
    if (!qtyValidation.isValid) {
      notify('error', 'Validation Error', qtyValidation.error || "Invalid Quantity");
      return;
    }

    if (!adjustStockLoc) {
      notify('error', 'Missing Data', 'Location is required.');
      return;
    }

    setIsSaving(true);
    const { error: rpcError } = await supabase.rpc('process_inventory_adjustment', {
      p_sku: selectedItem?.stock_code,
      p_qty: adjustStockQty,
      p_type: adjustStockType,
      p_loc: adjustStockLoc,
      p_partner: adjustStockPartner
    });

    if (rpcError) {
      notify('error', 'Adjustment Failed', rpcError.message);
    } else {
      notify('success', 'Stock Adjusted', `Updated levels for SKU ${selectedItem?.stock_code}`);
      setLastTransaction({
        sku: selectedItem?.stock_code,
        name: selectedItem?.name,
        qty: adjustStockQty,
        type: adjustStockType,
        loc: adjustStockLoc,
        partner: adjustStockPartner,
        date: new Date().toISOString()
      });
      setActiveModal('Transaction Receipt');
      loadData();
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 pb-12 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6"
      >
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight uppercase leading-none">
            Inventory Directory
          </h1>
          <p className="mt-2 text-sm text-muted">
            Master database of all active and archived SKUs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveModal("Export Data")}
            className="flex items-center gap-2 px-4 py-2 border border-border bg-surface font-mono text-xs uppercase tracking-wider hover:bg-surface-hover transition-colors"
          >
            <FileDown className="w-4 h-4" /> Export CSV
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setViewArchived(!viewArchived)}
              className={`flex items-center gap-2 px-4 py-2 border font-mono text-[10px] uppercase tracking-wider transition-colors ${viewArchived ? 'bg-accent border-accent text-white' : 'border-border text-muted hover:text-foreground'
                }`}
            >
              <Archive className="w-4 h-4" /> {viewArchived ? 'Viewing Archives' : 'View Archives'}
            </button>
            <button
              onClick={() => setActiveModal('Register New Entity')}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Register Entity
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center justify-between gap-4 bg-surface border border-border p-3 relative overflow-hidden"
      >
        <div className="relative flex-1 md:min-w-[400px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search by SKU, Description or Category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border pl-11 pr-4 py-3 font-mono text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-1 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full appearance-none flex items-center justify-center gap-2 px-8 py-2 border border-border bg-background font-mono text-xs text-muted focus:text-foreground hover:bg-surface-hover transition-colors outline-none cursor-pointer"
            >
              <option value="">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Packaging">Packaging</option>
              <option value="Tools">Tools</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          </div>
          <div className="relative flex-1 md:flex-none">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none flex items-center justify-center gap-2 px-8 py-2 border border-border bg-background font-mono text-xs text-muted focus:text-foreground hover:bg-surface-hover transition-colors outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Optimal">Optimal</option>
              <option value="Low">Low</option>
              <option value="Critical">Critical</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          </div>
          <div className="relative flex-1 md:flex-none">
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="w-full appearance-none flex items-center justify-center gap-2 px-8 py-2 border border-border bg-background font-mono text-xs text-muted focus:text-foreground hover:bg-surface-hover transition-colors outline-none cursor-pointer"
            >
              <option value="">All Warehouses</option>
              {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full overflow-x-auto border border-border bg-surface relative min-h-[300px]"
      >
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-surface/50 backdrop-blur-[2px] z-10 flex items-center justify-center"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </motion.div>
          )}
        </AnimatePresence>

        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="font-mono text-[10px] uppercase tracking-wider text-muted bg-surface-hover/50 border-b border-border">
            <tr>
              <th className="px-4 py-4 font-medium flex items-center gap-1 cursor-pointer hover:text-foreground">SKU <ArrowUpDown className="w-3 h-3" /></th>
              <th className="px-4 py-4 font-medium">Entity Name</th>
              <th className="px-4 py-4 font-medium">Category</th>
              <th className="px-4 py-4 font-medium text-right flex items-center justify-end gap-1 cursor-pointer hover:text-foreground">Qty <ArrowUpDown className="w-3 h-3" /></th>
              <th className="px-4 py-4 font-medium">Status</th>
              <th className="px-4 py-4 font-medium">Location</th>
              <th className="px-4 py-4 font-medium">Last Modified</th>
              <th className="px-4 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted font-mono text-xs uppercase tracking-wider">
                  No entities found matching query.
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr key={i} className="hover:bg-surface-hover/30 transition-colors group">
                  <td className="px-4 py-4 font-mono font-bold text-xs group-hover:text-primary transition-colors">{item.stock_code}</td>
                  <td className="px-4 py-4 font-medium text-foreground/90">{item.name}</td>
                  <td className="px-4 py-4 font-mono text-[10px] uppercase tracking-wider text-muted">{item.category}</td>
                  <td className="px-4 py-4 font-mono text-right font-bold">{item.total_qty} <span className="text-[10px] text-muted font-normal">{item.unit}</span></td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider border
                      ${item.health_status === 'Optimal' ? 'border-success text-success bg-success/5' : ''}
                      ${item.health_status === 'Low' ? 'border-warning text-warning bg-warning/5' : ''}
                      ${item.health_status === 'Critical' ? 'border-danger text-danger bg-danger/5' : ''}
                    `}>
                      {item.health_status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      {Object.entries(item.locations_json || {}).length > 0 ? (
                        Object.entries(item.locations_json).map(([loc, qty]) => (
                          <div key={loc} className="flex items-center gap-1.5 font-mono text-[10px] text-muted">
                            <span className="text-foreground/70">{loc}:</span>
                            <span className="font-bold text-foreground">{qty}</span>
                          </div>
                        ))
                      ) : (
                        <span className="font-mono text-[10px] text-muted italic">Unassigned</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-muted">{item.last_updated ? formatDateTime(new Date(item.last_updated)) : 'Never'}</td>
                  <td className="px-4 py-4 text-right relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenSku(menuOpenSku === item.stock_code ? null : item.stock_code);
                      }}
                      className={`transition-colors p-1 rounded hover:bg-surface-hover ${menuOpenSku === item.stock_code ? 'text-primary bg-primary/10' : 'text-muted'}`}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {/* Action Menu */}
                    <AnimatePresence>
                      {menuOpenSku === item.stock_code && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setMenuOpenSku(null)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border shadow-2xl z-50 py-1"
                          >
                            <button onClick={() => { handleManageAction('All Entity Details', item); setMenuOpenSku(null); }} className="w-full text-left px-4 py-2 text-[10px] font-mono uppercase tracking-wider hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2">
                              <Eye className="w-3 h-3" /> Details
                            </button>
                            <button onClick={() => { handleManageAction('Adjust Stock', item); setMenuOpenSku(null); }} className="w-full text-left px-4 py-2 text-[10px] font-mono uppercase tracking-wider hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2">
                              <Settings2 className="w-3 h-3" /> Adjust Stock
                            </button>
                            <button onClick={() => { handleManageAction('Edit Profile', item); setMenuOpenSku(null); }} className="w-full text-left px-4 py-2 text-[10px] font-mono uppercase tracking-wider hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2">
                              <Edit3 className="w-3 h-3" /> Edit Profile
                            </button>
                            <button onClick={() => { handleManageAction('Print QR Code', item); setMenuOpenSku(null); }} className="w-full text-left px-4 py-2 text-[10px] font-mono uppercase tracking-wider hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2">
                              <QrCode className="w-3 h-3" /> Print QR
                            </button>
                            <div className="h-px bg-border my-1" />
                            {item.status === 'archived' ? (
                              <button onClick={() => { handleRestore(item.stock_code); setMenuOpenSku(null); }} className="w-full text-left px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-success hover:bg-success/10 transition-colors flex items-center gap-2">
                                <RotateCcw className="w-3 h-3" /> Restore
                              </button>
                            ) : (
                              <button onClick={() => { handleArchive(item.stock_code); setMenuOpenSku(null); }} className="w-full text-left px-4 py-2 text-[10px] font-mono uppercase tracking-wider hover:text-danger hover:bg-danger/10 transition-colors flex items-center gap-2">
                                <Trash2 className="w-3 h-3" /> Archive
                              </button>
                            )}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-between border border-border bg-surface px-4 py-3"
      >
        <span className="font-mono text-xs text-muted">Showing {data.length} of {totalCount} entries</span>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            className="px-3 py-1 border border-border bg-background font-mono text-xs text-muted disabled:opacity-50 hover:bg-surface-hover"
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <button className="px-3 py-1 border border-primary bg-primary/10 font-mono text-xs text-primary">{currentPage}</button>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-3 py-1 border border-border bg-background font-mono text-xs hover:bg-surface-hover disabled:opacity-50"
            disabled={currentPage * PAGE_SIZE >= totalCount}
          >
            Next
          </button>
        </div>
      </motion.div>

      <Modal
        isOpen={!!activeModal}
        onClose={() => setActiveModal(null)}
        title={activeModal || "Inventory Action"}
        variant={
          activeModal === 'Register New Entity' ? 'info' :
            activeModal === 'Adjust Stock' ? 'success' :
              activeModal === 'Export Data' ? 'info' : 'default'
        }
      >
        {activeModal === "Register New Entity" && (
          <div className="space-y-4">
            <p className="font-mono text-xs text-muted">Initialize a new master record in the central repository.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Entity SKU (Numbers Only)</label>
                <input
                  type="text"
                  value={newEntity.sku}
                  onChange={e => setNewEntity({ ...newEntity, sku: e.target.value })}
                  className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors"
                  placeholder="e.g. 100203"
                />
              </div>
              <div className="col-span-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Entity Description</label>
                <input
                  type="text"
                  value={newEntity.name}
                  onChange={e => setNewEntity({ ...newEntity, name: e.target.value })}
                  className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Category</label>
                <select value={newEntity.category} onChange={e => setNewEntity({ ...newEntity, category: e.target.value })} className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors appearance-none">
                  <option>Electronics</option>
                  <option>Hardware</option>
                  <option>Furniture</option>
                  <option>Office</option>
                </select>
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Unit</label>
                <select
                  value={newEntity.unit}
                  onChange={e => setNewEntity({ ...newEntity, unit: e.target.value })}
                  className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Minimum Stock Threshold</label>
                <input type="number" value={newEntity.minStock} onChange={e => setNewEntity({ ...newEntity, minStock: parseInt(e.target.value) })} className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors" />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 border border-border font-mono text-xs uppercase tracking-wider hover:bg-surface-hover transition-colors text-muted hover:text-foreground">Cancel</button>
              <button onClick={handleSaveEntity} disabled={isSaving} className="px-6 py-2 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                Commit to Registry
              </button>
            </div>
          </div>
        )}        {activeModal === "Export Data" && (
          <div className="space-y-6 py-2">
            <div className="space-y-2">
              <p className="font-mono text-xs text-muted">Generate a comprehensive report of the current directory.</p>
              <div className="p-4 bg-surface border border-border space-y-3">
                <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-muted">
                  <span>Scope</span>
                  <span className="text-foreground">{viewArchived ? 'Archived Records' : 'Active Inventory'}</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-muted">
                  <span>Filters</span>
                  <span className="text-foreground">
                    {categoryFilter || statusFilter || warehouseFilter || searchQuery ? 'Active' : 'None'}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-muted border-t border-border pt-2">
                  <span>Format</span>
                  <span className="text-foreground">Comma Separated Values (.csv)</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="w-full bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider py-3 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                {isExporting ? 'Generating Report...' : 'Download Inventory Data'}
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="w-full border border-border font-mono text-xs uppercase tracking-wider py-3 hover:bg-surface-hover transition-colors text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {activeModal === "Adjust Stock" && (
          <div className="space-y-4">
            <p className="font-mono text-xs text-muted">Record stock level variations for {selectedItem?.name}.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Transaction Type</label>
                <select
                  value={adjustStockType}
                  onChange={e => setAdjustStockType(e.target.value)}
                  className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option value="Inbound">Inbound (Add)</option>
                  <option value="Outbound">Outbound (Deduct)</option>
                </select>
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Quantity</label>
                <input
                  type="number"
                  value={adjustStockQty}
                  onChange={e => setAdjustStockQty(Number(e.target.value))}
                  className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors"
                  min="1"
                />
              </div>
              <div className="col-span-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Location</label>
                <select
                  value={adjustStockLoc}
                  onChange={e => setAdjustStockLoc(e.target.value)}
                  className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors cursor-pointer appearance-none"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">
                  {adjustStockType === 'Inbound' ? 'Supplier Name' : 'Recipient / Customer'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={adjustStockPartner}
                    onChange={e => setAdjustStockPartner(e.target.value)}
                    className="w-full bg-background border border-border pl-10 pr-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors"
                    placeholder={adjustStockType === 'Inbound' ? 'e.g. Samsung Logistics' : 'e.g. John Doe / Project X'}
                  />
                  {adjustStockType === 'Inbound' ? <Truck className="w-4 h-4 absolute left-3 top-2.5 text-muted" /> : <UserCheck className="w-4 h-4 absolute left-3 top-2.5 text-muted" />}
                </div>
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 border border-border font-mono text-xs uppercase tracking-wider hover:bg-surface-hover transition-colors text-muted hover:text-foreground">Cancel</button>
              <button
                onClick={handleSaveStock}
                disabled={isSaving || adjustStockQty <= 0}
                className="px-6 py-2 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                Confirm Adjustment
              </button>
            </div>
          </div>
        )}

        {activeModal === 'Transaction Receipt' && lastTransaction && (
          <div className="space-y-6">
            <div className="p-8 bg-white text-black border border-border shadow-sm print:shadow-none" id="receipt-area">
              <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-end">
                <div>
                  <h2 className="font-heading text-2xl font-bold uppercase tracking-tighter">Inventory Voucher</h2>
                  <p className="font-mono text-[10px] opacity-60">IMS-VIVIANA OFFICIAL TRANSACTION RECORD</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-bold">{formatDateTime(new Date(lastTransaction.date))}</p>
                  <p className="font-mono text-[10px] uppercase">Ref: {lastTransaction.ref || lastTransaction.sku || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-[10px] font-mono uppercase opacity-50 mb-1">Entity Details</p>
                  <p className="font-bold">{lastTransaction.name}</p>
                  <p className="font-mono text-xs">SKU: {lastTransaction.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono uppercase opacity-50 mb-1">Location</p>
                  <p className="font-bold">{lastTransaction.loc}</p>
                </div>
              </div>

              <div className="bg-black/5 p-4 flex justify-between items-center mb-8">
                <div>
                  <p className="text-[10px] font-mono uppercase opacity-50 mb-1">Transaction Type</p>
                  <p className={`font-bold ${lastTransaction.type === 'Inbound' ? 'text-green-700' : 'text-red-700'}`}>{lastTransaction.type.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono uppercase opacity-50 mb-1">Quantity</p>
                  <p className="text-2xl font-bold font-mono">{lastTransaction.qty} Units</p>
                </div>
              </div>

              {lastTransaction.partner && (
                <div className="mb-8 border-t border-black/10 pt-4">
                  <p className="text-[10px] font-mono uppercase opacity-50 mb-1">
                    {lastTransaction.type === 'Inbound' ? 'Supplier Source' : 'Recipient Entity'}
                  </p>
                  <p className="font-bold">{lastTransaction.partner}</p>
                </div>
              )}

              <div className="pt-8 border-t border-black/10 flex justify-between text-[8px] font-mono uppercase opacity-40">
                <p>Digital Signature Valid</p>
                <p>IMS-Platform Protocol v1.0</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setActiveModal(null)} className="px-6 py-2 border border-border font-mono text-xs uppercase tracking-wider hover:bg-surface-hover transition-colors">Close</button>
              <button
                onClick={() => {
                  const printContents = document.getElementById('receipt-area')?.innerHTML;
                  if (!printContents) return;

                  const iframe = document.createElement('iframe');
                  iframe.style.position = 'absolute';
                  iframe.style.width = '0px';
                  iframe.style.height = '0px';
                  iframe.style.border = 'none';
                  document.body.appendChild(iframe);

                  const doc = iframe.contentWindow?.document;
                  if (!doc) return;

                  doc.open();
                  doc.write(`
                    <html>
                      <head>
                        <title>Inventory Voucher</title>
                        <style>
                          body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; }
                          .font-mono { font-family: monospace; }
                          .text-xs { font-size: 12px; }
                          .text-\\[10px\\] { font-size: 10px; }
                          .font-bold { font-weight: bold; }
                          .uppercase { text-transform: uppercase; }
                          .border-b-2 { border-bottom: 2px solid black; }
                          .mb-4 { margin-bottom: 16px; }
                          .mb-8 { margin-bottom: 32px; }
                          .flex { display: flex; }
                          .justify-between { justify-content: space-between; }
                          .items-end { align-items: flex-end; }
                          .grid { display: grid; grid-template-columns: 1fr 1fr; }
                          .gap-8 { gap: 32px; }
                          .bg-black\/5 { background: rgba(0,0,0,0.05); }
                          .p-4 { padding: 16px; }
                          .border-t { border-top: 1px solid rgba(0,0,0,0.1); }
                          .pt-4 { padding-top: 16px; }
                          .text-green-700 { color: #15803d; }
                          .text-red-700 { color: #b91c1c; }
                        </style>
                      </head>
                      <body>
                        ${printContents}
                      </body>
                    </html>
                  `);
                  doc.close();

                  setTimeout(() => {
                    iframe.contentWindow?.print();
                    document.body.removeChild(iframe);
                  }, 500);
                }}
                className="px-6 py-2 bg-black text-white font-mono text-xs uppercase tracking-wider hover:bg-black/90 transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Export PDF / Print
              </button>
            </div>
          </div>
        )}

        {activeModal?.startsWith("Edit Entity Profile") && editEntity && (
          <div className="space-y-4">
            <p className="font-mono text-xs text-muted">Update administrative parameters for SKU: {editEntity.stock_code}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Entity Name</label>
                <input
                  type="text"
                  value={editEntity.name}
                  onChange={e => setEditEntity({ ...editEntity, name: e.target.value })}
                  className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Category</label>
                <select
                  value={editEntity.category}
                  onChange={e => setEditEntity({ ...editEntity, category: e.target.value })}
                  className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                >
                  <option>Electronics</option>
                  <option>Hardware</option>
                  <option>Furniture</option>
                  <option>Office</option>
                </select>
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Unit</label>
                <select
                  value={editEntity.unit}
                  onChange={e => setEditEntity({ ...editEntity, unit: e.target.value })}
                  className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Min Stock Threshold</label>
                <input type="number" value={editEntity.minStock} onChange={e => setEditEntity({ ...editEntity, minStock: parseInt(e.target.value) })} className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors" />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 border border-border font-mono text-xs uppercase tracking-wider hover:bg-surface-hover transition-colors text-muted hover:text-foreground">Cancel</button>
              <button onClick={handleSaveEdit} disabled={isSaving} className="px-6 py-2 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50">
                {isSaving && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
                Commit Changes
              </button>
            </div>
          </div>
        )}

        {activeModal?.startsWith("Entity Details:") && selectedItem && (
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b border-border pb-4">
              <div>
                <h3 className="font-heading text-xl font-bold">{selectedItem.name}</h3>
                <p className="font-mono text-xs text-muted uppercase tracking-widest">{selectedItem.stock_code} | {selectedItem.category}</p>
              </div>
              <div className={`px-3 py-1 border font-mono text-[10px] uppercase tracking-wider ${selectedItem.health_status === 'Optimal' ? 'border-success text-success bg-success/5' :
                selectedItem.health_status === 'Low' ? 'border-warning text-warning bg-warning/5' :
                  'border-danger text-danger bg-danger/5'
                }`}>
                {selectedItem.health_status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-mono uppercase text-muted mb-1">Global Inventory</p>
                  <p className="text-3xl font-bold font-mono leading-none">{selectedItem.total_qty} <span className="text-sm font-normal text-muted">{selectedItem.unit}</span></p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-muted mb-1">Minimum Threshold</p>
                  <p className="text-xl font-bold font-mono text-muted">{selectedItem.min_stock} {selectedItem.unit}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-muted mb-1">Last Supplier</p>
                  <p className="text-xl font-bold font-mono text-primary flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    {lastSupplier}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-surface border border-border space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted font-bold">Location Breakdown</p>
                <div className="space-y-2">
                  {Object.entries(selectedItem.locations_json || {}).map(([loc, qty]) => (
                    <div key={loc} className="flex justify-between items-center text-[11px] font-mono">
                      <span className="text-muted">{loc}</span>
                      <span className="font-bold">{qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button onClick={() => setActiveModal(null)} className="px-6 py-2 border border-border font-mono text-xs uppercase tracking-wider hover:bg-surface-hover transition-colors">Close Directory</button>
            </div>
          </div>
        )}

        {activeModal?.startsWith("Barcode:") && (
          <div className="flex flex-col items-center py-6 space-y-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Scan to Access Product Registry</p>
            <div className="p-8 bg-white border border-border shadow-sm print:shadow-none" id="qr-code-area">
              <QRCodeSVG
                value={activeModal.replace("Barcode: ", "")}
                size={200}
                level="H"
                includeMargin={true}
              />
              <div className="mt-4 text-center">
                <p className="font-mono text-sm font-bold text-black">{activeModal.replace("Barcode: ", "")}</p>
                <p className="font-mono text-[9px] text-black/60 uppercase">{selectedItem?.name}</p>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setActiveModal(null)} className="px-6 py-2 border border-border font-mono text-xs uppercase tracking-wider hover:bg-surface-hover transition-colors">Close</button>
              <button
                onClick={() => {
                  const printContents = document.getElementById('qr-code-area')?.innerHTML;
                  if (!printContents) return;

                  const iframe = document.createElement('iframe');
                  iframe.style.position = 'absolute';
                  iframe.style.width = '0px';
                  iframe.style.height = '0px';
                  iframe.style.border = 'none';
                  document.body.appendChild(iframe);

                  const doc = iframe.contentWindow?.document;
                  if (!doc) return;

                  doc.open();
                  doc.write(`
                    <html>
                      <head>
                        <title>QR Label</title>
                        <style>
                          body { font-family: 'Inter', sans-serif; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                          .font-mono { font-family: monospace; }
                          .font-bold { font-weight: bold; }
                          .text-center { text-align: center; }
                          .mt-4 { margin-top: 16px; }
                        </style>
                      </head>
                      <body>
                        ${printContents}
                      </body>
                    </html>
                  `);
                  doc.close();

                  setTimeout(() => {
                    iframe.contentWindow?.print();
                    document.body.removeChild(iframe);
                  }, 500);
                }}
                className="px-6 py-2 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" /> Print Label
              </button>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmationModal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={confirmModal?.onConfirm || (() => { })}
        title={confirmModal?.title || ""}
        message={confirmModal?.message || ""}
        variant={confirmModal?.variant}
      />
    </div>
  );
}

