"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Activity,
  Box,
  Search,
  RefreshCcw,
  TrendingUp,
  MapPin,
  Loader2,
  MinusSquare,
  Truck,
  UserCheck,
  Printer,
} from "lucide-react";
import { Modal } from "../components/Modal";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { formatDateTime } from "@ims-viviana/utils";
import { supabase } from "@ims-viviana/database";
import { useNotification } from "../components/NotificationProvider";
import { validateSKU, validateQuantity, formatInput } from "../utils/validation";

// --- Types ---

interface KPI {
  label: string;
  value: string;
  icon: any;
  trend: string;
  status: "success" | "danger" | "accent" | "primary";
}

interface ChartDataPoint {
  name: string;
  value: number;
  out: number;
}

interface FeedItem {
  id: string;
  time: string;
  raw_date?: string;
  action: string;
  sku: string;
  ref: string;
  qty: string | null;
  loc: string;
  user: string;
  partner_name?: string;
  source_location?: string;
  destination_location?: string;
  items?: { sku: string; qty: number }[] | null;
  type?: string;
}



interface DashboardData {
  kpis: KPI[];
  chartData: ChartDataPoint[];
  feed: FeedItem[];
}

// --- Data Fetcher ---

const fetchDashboardData = async (timeRange: string): Promise<DashboardData> => {
  // 1. Fetch active SKUs
  const { count: skuCount } = await supabase.from('items').select('*', { count: 'exact', head: true });

  // 2. Fetch critical stock
  const { data: inventoryData } = await supabase.from('inventory_summary').select('stock_code, total_qty, min_stock, last_updated');
  const criticalItems = (inventoryData || []).filter(item => item.total_qty <= item.min_stock);
  const criticalCount = criticalItems.length;

  // 3. Fetch latest transactions for feed
  const { data: txData } = await supabase
    .from('transactions')
    .select(`
      id, created_at, type, qty_changed, item_stock_code, location, partner_name,
      source_location, destination_location, operation_id, reference_number
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  // 4. Inbound / Outbound totals & Chart Data
  const dateLimit = new Date();
  if (timeRange === "7d") dateLimit.setDate(dateLimit.getDate() - 7);
  else if (timeRange === "30d") dateLimit.setDate(dateLimit.getDate() - 30);
  else if (timeRange === "1y") dateLimit.setFullYear(dateLimit.getFullYear() - 1);
  else dateLimit.setDate(dateLimit.getDate() - 7);

  const { data: chartTx } = await supabase
    .from('transactions')
    .select('created_at, qty_changed, type')
    .gte('created_at', dateLimit.toISOString());

  let inboundTotal = 0;
  let outboundTotal = 0;

  // Build chart bins
  const bins: Record<string, { value: number, out: number }> = {};

  (chartTx || []).forEach(tx => {
    const isIncoming = tx.type === 'Inbound';
    const isOutgoing = tx.type === 'Outbound';

    if (isIncoming) inboundTotal += Math.abs(tx.qty_changed || 0);
    if (isOutgoing) outboundTotal += Math.abs(tx.qty_changed || 0);

    const d = new Date(tx.created_at);
    let binKey = "";
    if (timeRange === "1y") {
      binKey = d.toLocaleString('en-US', { month: 'short' });
    } else {
      binKey = d.toLocaleString('en-US', { weekday: 'short' });
    }

    if (!bins[binKey]) bins[binKey] = { value: 0, out: 0 };
    if (isIncoming) bins[binKey].value += Math.abs(tx.qty_changed || 0);
    if (isOutgoing) bins[binKey].out += Math.abs(tx.qty_changed || 0);
  });

  const chartData = Object.keys(bins).map(key => ({
    name: key,
    value: bins[key].value,
    out: bins[key].out
  }));

  if (chartData.length === 0) {
    chartData.push({ name: "No Data", value: 0, out: 0 });
  }

  const groups: Record<string, any[]> = {};
  const singles: any[] = [];

  (txData || []).forEach(tx => {
    if (tx.operation_id) {
      if (!groups[tx.operation_id]) groups[tx.operation_id] = [];
      groups[tx.operation_id].push(tx);
    } else {
      singles.push(tx);
    }
  });

  const groupedFeed = Object.values(groups).map(group => {
    const first = group[0];
    const totalQty = group.reduce((sum, item) => sum + Math.abs(item.qty_changed || 0), 0);
    const uniqueSkus = Array.from(new Set(group.map(item => item.item_stock_code)));

    return {
      id: first.operation_id,
      time: formatDateTime(new Date(first.created_at)),
      raw_date: first.created_at,
      action: group.length > 1 ? `Bulk ${first.type}` : first.type,
      sku: uniqueSkus.length === 1 ? uniqueSkus[0] : `${uniqueSkus.length} Items`,
      ref: first.reference_number || 'N/A',
      qty: first.type === 'Inbound' ? `+${totalQty}` : `-${totalQty}`,
      loc: first.location || "N/A",
      user: 'System',
      partner_name: first.partner_name,
      items: group.map(g => ({ sku: g.item_stock_code, qty: Math.abs(g.qty_changed) })),
      type: first.type,
      isBulk: group.length > 1
    };
  });

  const processedSingles = singles.map(tx => ({
    id: tx.id,
    time: formatDateTime(new Date(tx.created_at)),
    raw_date: tx.created_at,
    action: tx.type || 'Activity',
    sku: tx.item_stock_code || 'Multiple',
    ref: tx.reference_number || 'N/A',
    qty: tx.qty_changed ? (tx.qty_changed > 0 ? `+${tx.qty_changed}` : `${tx.qty_changed}`) : null,
    loc: tx.type === 'Transfer' ? `${tx.source_location} → ${tx.destination_location}` : (tx.location || "N/A"),
    user: 'System',
    partner_name: tx.partner_name,
    source_location: tx.source_location,
    destination_location: tx.destination_location,
    type: tx.type,
    items: tx.type === 'Transfer' ? null : [{ sku: tx.item_stock_code, qty: Math.abs(tx.qty_changed) }]
  }));

  const mappedFeed = [...groupedFeed, ...processedSingles].sort((a, b) =>
    new Date(b.raw_date).getTime() - new Date(a.raw_date).getTime()
  );

  return {
    kpis: [
      { label: "Active SKUs", value: (skuCount || 0).toLocaleString(), icon: Package, trend: "Live", status: "success" },
      { label: "Critical Stock", value: (criticalCount || 0).toString(), icon: AlertTriangle, trend: "Live", status: "danger" },
      { label: "Inbound Volume", value: inboundTotal.toLocaleString(), icon: ArrowDownToLine, trend: "Live", status: "accent" },
      { label: "Outbound Volume", value: Math.abs(outboundTotal).toLocaleString(), icon: ArrowUpFromLine, trend: "Live", status: "primary" },
    ],
    chartData,
    feed: mappedFeed.length > 0 ? mappedFeed : [
      { id: "empty", time: "Now", action: "System Initialized", sku: "N/A", ref: "N/A", qty: "0", loc: "N/A", user: "System" }
    ]
  };
};

// --- Animations ---

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Clock tick
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Data fetching
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchDashboardData(timeRange)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch dashboard data:", err);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [timeRange]);

  const handleAction = (actionLabel: string) => {
    setActiveModal(actionLabel);
    setLookupResult(null);
  };

  // Quick Actions State
  const [lookupSkuInput, setLookupSkuInput] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const { notify } = useNotification();

  const loadWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('name').order('name');
    if (data) setWarehouses(data.map(w => w.name));
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const [bulkLines, setBulkLines] = useState([{ sku: '', qty: '' }]);
  const [bulkLoc, setBulkLoc] = useState('');
  const [bulkPartner, setBulkPartner] = useState('');

  const [transferSku, setTransferSku] = useState("");
  const [transferQty, setTransferQty] = useState("");
  const [transferSrc, setTransferSrc] = useState("");
  const [transferDest, setTransferDest] = useState("");

  const addBulkLine = () => setBulkLines([...bulkLines, { sku: '', qty: '' }]);
  const removeBulkLine = (index: number) => setBulkLines(bulkLines.filter((_, i) => i !== index));
  const updateBulkLine = (index: number, field: string, value: string) => {
    const newLines = [...bulkLines];
    (newLines[index] as any)[field] = value;
    setBulkLines(newLines);
  };
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleLookupSku = async () => {
    if (!lookupSkuInput) return;
    setIsActionLoading(true);
    const { data: itemData, error } = await supabase.from('inventory_summary').select('stock_code, name, category, total_qty, unit, status, locations_json').eq('stock_code', lookupSkuInput.toUpperCase()).single();
    if (error) {
      setLookupResult({ error: "SKU Not Found" });
    } else {
      setLookupResult(itemData);
    }
    setIsActionLoading(false);
  };

  const handleBulkOperation = async (type: 'Inbound' | 'Outbound') => {
    if (!bulkLoc) {
      notify('error', 'Missing Location', 'Please select a location for this operation.');
      return;
    }

    const validLines = bulkLines.filter(l => l.sku && l.qty);
    if (validLines.length === 0) {
      notify('error', 'Missing Data', 'Please add at least one item.');
      return;
    }

    // Individual line validation
    for (const line of validLines) {
      const skuVal = validateSKU(line.sku);
      if (!skuVal.isValid) {
        notify('error', 'Line Error', `SKU ${line.sku}: ${skuVal.error}`);
        return;
      }
      const qtyVal = validateQuantity(parseInt(line.qty));
      if (!qtyVal.isValid) {
        notify('error', 'Line Error', `SKU ${line.sku}: ${qtyVal.error}`);
        return;
      }
    }

    setIsActionLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { data: refNumber, error: rpcError } = await supabase.rpc('process_inventory_adjustment_bulk', {
        p_items: validLines.map(l => ({
          sku: formatInput(l.sku),
          qty: parseInt(l.qty),
          type,
          loc: bulkLoc,
          partner: bulkPartner,
          notes: `Bulk ${type} via Dashboard`
        })),
        p_operator_id: userData.user?.id || null
      });

      if (rpcError) {
        notify('error', 'Operation Failed', rpcError.message);
      } else {
        notify('success', 'Operation Complete', `Successfully processed ${validLines.length} items.`);
        setLastTransaction({
          items: validLines.map(l => ({ sku: l.sku, qty: parseInt(l.qty) })),
          type,
          loc: bulkLoc,
          partner: bulkPartner,
          date: new Date().toISOString(),
          ref: refNumber || 'Pending'
        });
        setActiveModal('Transaction Receipt');
        setBulkLines([{ sku: '', qty: '' }]);
        setBulkLoc('');
        setBulkPartner('');
        const refreshed = await fetchDashboardData(timeRange);
        setData(refreshed);
      }
    } catch (err: any) {
      notify('error', 'System Error', err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleTransfer = async () => {
    const qty = parseInt(transferQty);
    if (!transferSku || !qty || !transferSrc || !transferDest) {
      notify('error', 'Missing Data', 'All transfer fields are required.');
      return;
    }

    const skuVal = validateSKU(transferSku);
    if (!skuVal.isValid) {
      notify('error', 'Validation Error', skuVal.error || 'Invalid SKU');
      return;
    }

    setIsActionLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { data: refNumber, error: rpcError } = await supabase.rpc('transfer_stock', {
        p_sku: formatInput(transferSku),
        p_qty: qty,
        p_src: transferSrc,
        p_dest: transferDest,
        p_operator_id: userData.user?.id || null
      });

      if (rpcError) {
        notify('error', 'Transfer Denied', rpcError.message);
      } else {
        notify('success', 'Transfer Complete', `Relocated ${qty} units to ${transferDest}`);
        setLastTransaction({
          sku: transferSku,
          qty,
          type: 'Transfer',
          loc: `${transferSrc} → ${transferDest}`,
          source: transferSrc,
          dest: transferDest,
          date: new Date().toISOString(),
          ref: refNumber || 'Pending'
        });
        setActiveModal('Transaction Receipt');
        setTransferSku("");
        setTransferQty("");
        setTransferSrc("");
        setTransferDest("");
        const refreshed = await fetchDashboardData(timeRange);
        setData(refreshed);
      }
    } catch (err: any) {
      notify('error', 'System Error', err.message);
    } finally {
      setIsActionLoading(false);
    }
  };



  return (
    <div className="space-y-8 pb-12">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6 animate-slide-in">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Activity className="w-3 h-3" />
            )}
            System Status: {isLoading ? "Syncing Telemetry..." : "Operational"}
          </p>
          <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight uppercase leading-none">
            Command Center
          </h1>
          <p className="mt-3 text-muted max-w-xl">
            Real-time overview of warehouse telemetry and throughput volume.
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end">
          <p className="font-mono text-xs text-muted uppercase tracking-wider mb-1">Local Time</p>
          <div className="font-mono text-sm bg-surface px-3 py-1.5 border border-border shadow-sm min-w-[180px] text-center">
            {currentTime ? formatDateTime(currentTime) : "Loading..."}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isLoading && !data ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-20"
          >
            <div className="flex flex-col items-center gap-4 text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="font-mono text-xs uppercase tracking-widest">Establishing DB Connection...</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* KPI Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data?.kpis.map((stat, i) => (
                <div
                  key={i}
                  className="group relative overflow-hidden border border-border bg-surface p-6 transition-all duration-300 hover:border-primary/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted mb-4">
                        {stat.label}
                      </p>
                      <p className="font-heading text-4xl font-bold tracking-tighter">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-2 rounded-none bg-${stat.status}/10 text-${stat.status}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-2 font-mono text-xs">
                    <span className={`text-${stat.status === 'danger' ? 'danger' : 'success'} flex items-center gap-1`}>
                      <TrendingUp className="w-3 h-3" /> {stat.trend}
                    </span>
                    <span className="text-muted">vs last period</span>
                  </div>

                  {/* Minimalist accent corner */}
                  <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-border to-transparent opacity-50 group-hover:from-primary/20 transition-colors" />
                </div>
              ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Main Telemetry Chart */}
              <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h2 className="font-heading text-lg font-semibold uppercase tracking-wide">Throughput Telemetry</h2>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="bg-transparent font-mono text-xs border-none outline-none text-muted cursor-pointer hover:text-foreground"
                    disabled={isLoading}
                  >
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="ytd">Year to Date</option>
                  </select>
                </div>

                <div className="h-[350px] w-full border border-border bg-surface p-4 relative overflow-hidden group">
                  {/* Decorative background grid pattern */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

                  {isLoading && (
                    <div className="absolute inset-0 bg-surface/50 backdrop-blur-[2px] z-10 flex items-center justify-center transition-all duration-300">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}

                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.chartData || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--muted)' }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--muted)' }}
                        width={60}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--surface)',
                          borderColor: 'var(--border-color)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          borderRadius: '0px',
                          color: 'var(--foreground)'
                        }}
                        itemStyle={{ color: 'var(--foreground)' }}
                      />
                      <Area type="monotone" dataKey="value" name="Inbound" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                      <Area type="monotone" dataKey="out" name="Outbound" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorOut)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Action Panel */}
              <motion.div variants={itemVariants} className="space-y-8">

                {/* Quick Actions */}
                <div className="space-y-4">
                  <h2 className="font-heading text-lg font-semibold uppercase tracking-wide border-b border-border pb-2">Quick Actions</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Search, label: "Lookup SKU" },
                      { icon: Box, label: "Add Stock" },
                      { icon: RefreshCcw, label: "Transfer" },
                      { icon: MinusSquare, label: "Dispatch Item" },
                    ].map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleAction(action.label)}
                        className="flex flex-col items-center justify-center p-4 gap-3 bg-surface border border-border hover:border-primary hover:bg-primary/5 transition-colors group active:scale-[0.98]"
                      >
                        <action.icon className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
                        <span className="font-mono text-xs uppercase tracking-wider">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
            {/* Recent Activity Table */}
            <motion.div variants={itemVariants} className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-semibold uppercase tracking-wide">Live Feed</h2>
                <span className="flex items-center gap-2 font-mono text-xs text-success">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  Connected
                </span>
              </div>

              <div className="w-full overflow-x-auto border border-border bg-surface relative min-h-[200px]">
                {isLoading && (
                  <div className="absolute inset-0 bg-surface/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
                <table className="w-full text-sm text-left">
                  <thead className="font-mono text-[10px] uppercase tracking-wider text-muted bg-surface-hover/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-medium">Timestamp</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                      <th className="px-4 py-3 font-medium">Ref Number</th>
                      <th className="px-4 py-3 font-medium">Location</th>
                      <th className="px-4 py-3 font-medium">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data?.feed.map((row) => (
                      <tr key={row.id} className="hover:bg-surface-hover/30 transition-colors group cursor-pointer" onClick={() => {
                        setLastTransaction({
                          ...row,
                          qty: row.qty?.replace('+', '').replace('-', ''),
                          type: row.type || (row.action.includes('Outbound') || row.action.includes('Dispatch') ? 'Outbound' : 'Inbound'),
                          date: row.raw_date || row.time
                        });
                        setActiveModal('Transaction Receipt');
                      }}>
                        <td className="px-4 py-3 font-mono text-xs text-muted whitespace-nowrap">{row.time}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider border
                            ${row.action.includes('Inbound') || row.action.includes('Added') || row.action.includes('Received') ? 'border-success text-success bg-success/5' : ''}
                            ${row.action.includes('Outbound') || row.action.includes('Dispatch') ? 'border-accent text-accent bg-accent/5' : ''}
                            ${row.action.includes('Transfer') ? 'border-primary text-primary bg-primary/5' : ''}
                            ${row.action.includes('Count') ? 'border-muted text-foreground bg-muted/5' : ''}
                          `}>
                            {row.action} {row.qty && `(${row.qty})`}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-medium group-hover:text-primary transition-colors whitespace-nowrap">{row.ref}</td>
                        <td className="px-4 py-3 text-muted">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 opacity-50" />
                            <span className="truncate max-w-[200px]">{row.loc}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs truncate max-w-[120px]">{row.user}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={!!activeModal}
        onClose={() => setActiveModal(null)}
        title={activeModal || "Action"}
        variant={
          activeModal === 'Add Stock' ? 'success' :
            activeModal === 'Transfer' ? 'info' :
              activeModal === 'Dispatch Item' ? 'danger' : 'default'
        }
      >
        {activeModal === "Lookup SKU" && (
          <div className="space-y-4">
            <p className="font-mono text-xs text-muted">Scan or enter an SKU to retrieve current telemetry, location, and history.</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={lookupSkuInput}
                onChange={e => setLookupSkuInput(e.target.value)}
                placeholder="Enter Numeric SKU (e.g. 100203)"
                className="w-full bg-background border border-border pl-10 pr-4 py-3 font-mono text-xs outline-none focus:border-primary transition-colors"
                autoFocus
              />
            </div>
            {lookupResult && (
              <div className="mt-4 overflow-hidden border border-border bg-surface-hover/30">
                {lookupResult.error ? (
                  <div className="p-6 text-center space-y-2">
                    <AlertTriangle className="w-8 h-8 text-danger mx-auto" />
                    <p className="font-mono text-xs uppercase tracking-wider text-danger font-bold">{lookupResult.error}</p>
                    <p className="text-[10px] text-muted">The SKU entered does not match any registered entities in the master database.</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <div className="p-4 border-b border-border bg-surface flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 bg-primary/10 text-primary font-mono text-[9px] uppercase tracking-tighter border border-primary/20">Active Entity</span>
                          <span className="text-muted font-mono text-[10px] uppercase">{lookupResult.category}</span>
                        </div>
                        <h3 className="font-heading text-lg font-bold leading-none">{lookupResult.name}</h3>
                        <p className="text-[10px] font-mono text-muted mt-1 uppercase tracking-widest">{lookupResult.stock_code}</p>
                      </div>
                      <div className={`px-3 py-1 border font-mono text-[10px] uppercase tracking-wider ${lookupResult.status === 'Optimal' ? 'border-success text-success bg-success/5' :
                        lookupResult.status === 'Low' ? 'border-warning text-warning bg-warning/5' :
                          'border-danger text-danger bg-danger/5'
                        }`}>
                        {lookupResult.status}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                      <div className="p-4 bg-surface">
                        <p className="text-[10px] font-mono uppercase text-muted mb-1">Global Inventory</p>
                        <p className="text-2xl font-bold font-mono leading-none">{lookupResult.total_qty} <span className="text-xs font-normal text-muted">{lookupResult.unit}</span></p>
                      </div>
                      <div className="p-4 bg-surface">
                        <p className="text-[10px] font-mono uppercase text-muted mb-1">Active Batches</p>
                        <p className="text-2xl font-bold font-mono leading-none">{Object.keys(lookupResult.locations_json || {}).length}</p>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <p className="text-[10px] uppercase tracking-widest text-muted font-bold">Location Distribution</p>
                      <div className="grid gap-2">
                        {lookupResult.locations_json && Object.entries(lookupResult.locations_json).length > 0 ? (
                          Object.entries(lookupResult.locations_json).map(([loc, qty]) => (
                            <div key={loc} className="flex justify-between items-center p-2 bg-background border border-border/50 group hover:border-primary transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                <span className="font-mono text-[11px] uppercase tracking-wider text-foreground/90">{loc}</span>
                              </div>
                              <span className="font-mono text-[11px] font-bold">{qty as number}</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center border border-dashed border-border rounded">
                            <p className="text-[10px] text-muted italic">No active stock in any location.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="pt-4 flex justify-end">
              <button
                onClick={handleLookupSku}
                disabled={isActionLoading || !lookupSkuInput}
                className="px-6 py-2 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Initiate Query"}
              </button>
            </div>
          </div>
        )}

        {activeModal === "Add Stock" && (
          <div className="space-y-6">
            <p className="font-mono text-xs text-muted">Register multiple inbound entities to the warehouse registry.</p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Destination Warehouse</label>
                  <select
                    value={bulkLoc}
                    onChange={e => setBulkLoc(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors cursor-pointer appearance-none"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Supplier Source</label>
                  <div className="relative">
                    <input type="text" value={bulkPartner} onChange={e => setBulkPartner(e.target.value)} className="w-full bg-background border border-border pl-10 pr-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors" placeholder="e.g. Global Supplies" />
                    <Truck className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
                  </div>
                </div>
              </div>

              <div className="border border-border bg-surface-hover/20">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border font-mono text-[9px] uppercase tracking-widest text-muted">
                      <th className="px-3 py-2">Entity SKU</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkLines.map((line, idx) => (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="p-1">
                          <input
                            type="text"
                            value={line.sku}
                            onChange={e => updateBulkLine(idx, 'sku', e.target.value)}
                            className="w-full bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:bg-primary/5 transition-colors"
                            placeholder="Numbers Only"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={line.qty}
                            onChange={e => updateBulkLine(idx, 'qty', e.target.value)}
                            className="w-full bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:bg-primary/5 transition-colors"
                            placeholder="0"
                          />
                        </td>
                        <td className="p-1 text-center">
                          {bulkLines.length > 1 && (
                            <button onClick={() => removeBulkLine(idx)} className="text-danger hover:scale-110 transition-transform">
                              <MinusSquare className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={addBulkLine} className="w-full py-2 font-mono text-[10px] uppercase tracking-wider text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                  <Box className="w-3 h-3" /> Add Row
                </button>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button onClick={() => { setActiveModal(null); setBulkLines([{ sku: '', qty: '' }]); }} className="px-4 py-2 border border-border font-mono text-xs uppercase tracking-wider hover:bg-surface-hover transition-colors text-muted hover:text-foreground">
                Cancel
              </button>
              <button onClick={() => handleBulkOperation('Inbound')} disabled={isActionLoading} className="px-6 py-2 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                {isActionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Commit Bulk Entry
              </button>
            </div>
          </div>
        )}

        {activeModal === "Transfer" && (
          <div className="space-y-4">
            <p className="font-mono text-xs text-muted">Relocate existing entities within the facility grid.</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Entity SKU</label>
                  <input type="text" value={transferSku} onChange={e => setTransferSku(e.target.value)} className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors" placeholder="e.g. 12345" />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Quantity</label>
                  <input type="number" value={transferQty} onChange={e => setTransferQty(e.target.value)} className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Source Loc</label>
                  <select
                    value={transferSrc}
                    onChange={e => setTransferSrc(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors cursor-pointer appearance-none"
                  >
                    <option value="">Select Source</option>
                    {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Dest Loc</label>
                  <select
                    value={transferDest}
                    onChange={e => setTransferDest(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors cursor-pointer appearance-none"
                  >
                    <option value="">Select Destination</option>
                    {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 border border-border font-mono text-xs uppercase tracking-wider hover:bg-surface-hover transition-colors text-muted hover:text-foreground">
                Cancel
              </button>
              <button onClick={handleTransfer} disabled={isActionLoading} className="px-6 py-2 bg-accent text-accent-foreground font-mono text-xs uppercase tracking-wider hover:bg-accent/90 transition-colors disabled:opacity-50">
                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Execute Transfer"}
              </button>
            </div>
          </div>
        )}

        {activeModal === "Dispatch Item" && (
          <div className="space-y-6">
            <p className="font-mono text-xs text-muted">Authorized bulk stock deduction for fulfillment or inventory correction.</p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Source Warehouse</label>
                  <select
                    value={bulkLoc}
                    onChange={e => setBulkLoc(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors cursor-pointer appearance-none"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1 block">Recipient / Customer</label>
                  <div className="relative">
                    <input type="text" value={bulkPartner} onChange={e => setBulkPartner(e.target.value)} className="w-full bg-background border border-border pl-10 pr-3 py-2 font-mono text-xs outline-none focus:border-primary transition-colors" placeholder="e.g. Project Site Alpha" />
                    <UserCheck className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
                  </div>
                </div>
              </div>

              <div className="border border-border bg-surface-hover/20">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border font-mono text-[9px] uppercase tracking-widest text-muted">
                      <th className="px-3 py-2">Entity SKU</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkLines.map((line, idx) => (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="p-1">
                          <input
                            type="text"
                            value={line.sku}
                            onChange={e => updateBulkLine(idx, 'sku', e.target.value)}
                            className="w-full bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:bg-primary/5 transition-colors"
                            placeholder="Numbers Only"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={line.qty}
                            onChange={e => updateBulkLine(idx, 'qty', e.target.value)}
                            className="w-full bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:bg-primary/5 transition-colors"
                            placeholder="0"
                          />
                        </td>
                        <td className="p-1 text-center">
                          {bulkLines.length > 1 && (
                            <button onClick={() => removeBulkLine(idx)} className="text-danger hover:scale-110 transition-transform">
                              <MinusSquare className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={addBulkLine} className="w-full py-2 font-mono text-[10px] uppercase tracking-wider text-danger hover:bg-danger/5 transition-colors flex items-center justify-center gap-2">
                  <MinusSquare className="w-3 h-3" /> Add Row
                </button>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button onClick={() => { setActiveModal(null); setBulkLines([{ sku: '', qty: '' }]); }} className="px-4 py-2 border border-border font-mono text-xs uppercase tracking-wider hover:bg-surface-hover transition-colors text-muted hover:text-foreground">
                Cancel
              </button>
              <button onClick={() => handleBulkOperation('Outbound')} disabled={isActionLoading} className="px-6 py-2 bg-danger text-danger-foreground font-mono text-xs uppercase tracking-wider hover:bg-danger/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                {isActionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                Confirm Bulk Deduction
              </button>
            </div>
          </div>
        )}




        {activeModal === 'Transaction Receipt' && lastTransaction && (
          <div className="space-y-6">
            <div className="p-8 bg-white text-black border border-border shadow-sm print:shadow-none" id="receipt-area-dashboard">
              <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-end">
                <div>
                  <h2 className="font-heading text-2xl font-bold uppercase tracking-tighter">Inventory Voucher</h2>
                  <p className="font-mono text-[10px] opacity-60">IMS-VIVIANA OFFICIAL TRANSACTION RECORD</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-bold">{formatDateTime(new Date(lastTransaction.date))}</p>
                  <p className="font-mono text-[10px] uppercase">Ref: {lastTransaction.ref || lastTransaction.reference_number || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-[10px] font-mono uppercase opacity-50 mb-1">Transaction Details</p>
                  {lastTransaction.items ? (
                    <div className="space-y-2">
                      {lastTransaction.items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between border-b border-black/5 pb-1">
                          <span className="font-bold text-xs">SKU {item.sku}</span>
                          <span className="font-mono text-xs">{item.qty} UNITS</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-bold">SKU: {lastTransaction.sku}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono uppercase opacity-50 mb-1">Registry Location</p>
                  <p className="font-bold">{lastTransaction.loc}</p>
                </div>
              </div>

              <div className="bg-black/5 p-4 flex justify-between items-center mb-8">
                <div>
                  <p className="text-[10px] font-mono uppercase opacity-50 mb-1">Operation Type</p>
                  <p className={`font-bold ${lastTransaction.type === 'Inbound' ? 'text-green-700' :
                    lastTransaction.type === 'Outbound' ? 'text-red-700' : 'text-blue-700'
                    }`}>
                    {lastTransaction.type.toUpperCase()}
                  </p>
                </div>
                {!lastTransaction.items && (
                  <div className="text-right">
                    <p className="text-[10px] font-mono uppercase opacity-50 mb-1">Volume</p>
                    <p className="text-2xl font-bold font-mono">{lastTransaction.qty} Units</p>
                  </div>
                )}
              </div>

              {(lastTransaction.partner || lastTransaction.partner_name) && (
                <div className="mb-8 border-t border-black/10 pt-4">
                  <p className="text-[10px] font-mono uppercase opacity-50 mb-1">
                    {lastTransaction.type === 'Inbound' ? 'Supplier Source' : 'Recipient Entity'}
                  </p>
                  <p className="font-bold">{lastTransaction.partner || lastTransaction.partner_name}</p>
                </div>
              )}

              <div className="pt-8 border-t border-black/10 flex justify-between text-[8px] font-mono uppercase opacity-40">
                <p>Digital Signature Valid</p>
                <p>IMS-Viviana Protocol v1.0</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setActiveModal(null)} className="px-6 py-2 border border-border font-mono text-xs uppercase tracking-wider hover:bg-surface-hover transition-colors">Close</button>
              <button
                onClick={() => {
                  const printContents = document.getElementById('receipt-area-dashboard')?.innerHTML;
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
                          .text-[10px] { font-size: 10px; }
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
                          .bg-black/5 { background: rgba(0,0,0,0.05); }
                          .p-4 { padding: 16px; }
                          .border-t { border-top: 1px solid rgba(0,0,0,0.1); }
                          .pt-4 { padding-top: 16px; }
                          .text-green-700 { color: #15803d; }
                          .text-red-700 { color: #b91c1c; }
                          .text-blue-700 { color: #1d4ed8; }
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
      </Modal>
    </div>
  );
}
