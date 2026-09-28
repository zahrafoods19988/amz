import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Camera,
  Upload,
  ChevronRight,
  Trash2,
  X,
  CheckSquare,
  AlertOctagon,
} from 'lucide-react';
import { DashboardMetrics, DateFilterRange, Order } from '../types';
import { db } from '../services/db';
import { sound } from '../services/sound';

interface DashboardViewProps {
  metrics: DashboardMetrics;
  selectedRange: DateFilterRange;
  onRangeChange: (range: DateFilterRange) => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomDateChange?: (start: string, end: string) => void;
  onOpenScanner: () => void;
  onOpenUpload: (tab?: 'transaction' | 'handover') => void;
  onSelectOrder: (order: Order) => void;
  onNavigateTab: (tab: 'orders' | 'products' | 'exceptions' | 'reports') => void;
  onOrdersUpdated?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  selectedRange,
  onRangeChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  onOpenScanner,
  onOpenUpload,
  onSelectOrder,
  onNavigateTab,
  onOrdersUpdated,
}) => {
  const [showCustomRangeInputs, setShowCustomRangeInputs] = useState(false);
  const [startDate, setStartDate] = useState(customStartDate || '');
  const [endDate, setEndDate] = useState(customEndDate || '');

  // Bulk Delete Modal state
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'all' | 'unmatched'>('all');
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);

  const allOrdersList = db.getOrders();
  const recentOrders = allOrdersList.slice(0, 5);

  const executeBulkDelete = (mode: 'all' | 'unmatched') => {
    sound.playDeleteSound();
    let count = 0;
    if (mode === 'all') {
      count = allOrdersList.length;
      db.clearAllOrders();
    } else {
      count = db.deleteUnmatchedOrders();
    }

    setShowBulkDeleteModal(false);
    setDeleteSuccessMessage(
      mode === 'all'
        ? `Successfully deleted all ${count} orders.`
        : `Successfully deleted ${count} unmatched/pending orders.`
    );

    if (onOrdersUpdated) {
      onOrdersUpdated();
    }

    setTimeout(() => {
      setDeleteSuccessMessage(null);
    }, 3500);
  };

  const dateFilterOptions: { id: DateFilterRange; label: string }[] = [
    { id: 'all', label: 'All Time' },
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last7days', label: 'Last 7 Days' },
    { id: 'last30days', label: 'Last 30 Days' },
    { id: 'thisMonth', label: 'This Month' },
    { id: 'previousMonth', label: 'Previous Month' },
    { id: 'custom', label: 'Custom Range' },
  ];

  const handleFilterClick = (optId: DateFilterRange) => {
    if (optId === 'custom') {
      setShowCustomRangeInputs(true);
    } else {
      setShowCustomRangeInputs(false);
      onRangeChange(optId);
    }
  };

  const applyCustomRange = () => {
    if (onCustomDateChange && startDate) {
      onCustomDateChange(startDate, endDate);
      onRangeChange('custom');
    }
  };

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Toast Feedback */}
      {deleteSuccessMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{deleteSuccessMessage}</span>
          <button onClick={() => setDeleteSuccessMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner / Quick Action Bar */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 rounded-3xl p-6 sm:p-7 shadow-lg shadow-amber-500/10 text-slate-950 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/10 border border-slate-950/15 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Automated 3-Way Reconciliation
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-950">
              Amazon Saudi Profit Dashboard
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-900/85 leading-relaxed">
              Scan shipping labels, import transaction & handover files. Product Master & purchase costs remember automatically.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onOpenUpload('transaction')}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold flex items-center gap-2 shadow-sm border border-slate-200 transition"
            >
              <Upload className="w-4 h-4 text-amber-600" />
              <span>Import Files</span>
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-2 shadow-sm border border-rose-200 transition active:scale-95"
              title="Bulk delete orders from register"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Bulk Delete ({allOrdersList.length})</span>
            </button>
            <button
              onClick={onOpenScanner}
              className="px-5 py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 active:scale-95 text-amber-400 text-sm font-black flex items-center gap-2 shadow-md transition"
            >
              <Camera className="w-5 h-5 text-amber-400 stroke-[2.5]" />
              <span>SCAN LABEL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            Date Period Filter
          </span>
          <span className="text-xs font-semibold text-slate-500">Currency: Saudi Riyal (SAR)</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {dateFilterOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleFilterClick(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedRange === opt.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Custom Range Picker Drawer */}
        {showCustomRangeInputs && (
          <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-wrap items-center gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900"
              />
            </div>
            <button
              onClick={applyCustomRange}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Profit (Primary Highlight) */}
        <div className="col-span-2 p-5 rounded-3xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold mb-1">
            <span className="uppercase tracking-wider font-mono">Total Net Profit</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-xs">
              {metrics.profitMargin}% Margin
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-950 tracking-tight my-1">
            SAR {metrics.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-4 text-xs text-emerald-900/80 mt-3 pt-3 border-t border-emerald-200">
            <div>Net Rev: <span className="text-slate-950 font-bold">SAR {metrics.netRevenue.toFixed(2)}</span></div>
            <div>Cost: <span className="text-amber-800 font-bold">SAR {metrics.totalPurchaseCost.toFixed(2)}</span></div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Orders</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 my-1">
            {metrics.totalOrders}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold">
            {metrics.fullyMatchedOrders} fully matched
          </span>
        </div>

        {/* Total Sales */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Gross Sales</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 my-1">
            SAR {metrics.totalSales.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500">
            Avg: SAR {(metrics.totalOrders > 0 ? metrics.totalSales / metrics.totalOrders : 0).toFixed(2)}/order
          </span>
        </div>

        {/* Amazon Fees */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Amazon Fees</span>
            <span className="text-[10px] text-rose-700 font-bold bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">FBA/Ref</span>
          </div>
          <div className="text-xl font-bold font-mono text-rose-600 my-1">
            - SAR {metrics.amazonFees.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500">
            {(metrics.totalSales > 0 ? (metrics.amazonFees / metrics.totalSales) * 100 : 0).toFixed(1)}% of sales
          </span>
        </div>

        {/* Total Purchase Cost */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Product Purchase Cost</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-700 my-1">
            SAR {metrics.totalPurchaseCost.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500">
            Auto-applied from Master
          </span>
        </div>

        {/* Additional Cost */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Additional Costs</span>
            <span className="text-[10px] text-slate-500 font-medium">Packaging/Ship</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-800 my-1">
            SAR {metrics.additionalCost.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500">Optional expenses</span>
        </div>

        {/* Returns & Refunds */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Returns & Refunds</span>
            <RotateCcw className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 my-1">
            {metrics.refundsCount} / {metrics.returnsCount}
          </div>
          <span className="text-[11px] text-rose-600 font-medium">Adjusted in profit</span>
        </div>
      </div>

      {/* Matching Status Summary Tiles */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
            Reconciliation & Pipeline Status
          </h3>
          <button
            onClick={() => onNavigateTab('exceptions')}
            className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1 transition"
          >
            <span>View Unmatched</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Fully Matched */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Fully Matched</span>
            </div>
            <div className="text-2xl font-black font-mono mt-2 text-slate-900">
              {metrics.fullyMatchedOrders}
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold">Label + Tx + Handover</span>
          </div>

          {/* Transaction Pending */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Tx Pending</span>
            </div>
            <div className="text-2xl font-black font-mono mt-2 text-slate-900">
              {metrics.transactionsPending}
            </div>
            <span className="text-[10px] text-amber-700 font-semibold">Awaiting transaction file</span>
          </div>

          {/* Handover Pending */}
          <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200 text-orange-900 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className="w-4 h-4 text-orange-600" />
              <span>Handover Pending</span>
            </div>
            <div className="text-2xl font-black font-mono mt-2 text-slate-900">
              {metrics.handoverPending}
            </div>
            <span className="text-[10px] text-orange-700 font-semibold">Awaiting dispatch PDF</span>
          </div>

          {/* Unmatched / Errors */}
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Exceptions</span>
            </div>
            <div className="text-2xl font-black font-mono mt-2 text-slate-900">
              {metrics.unmatchedOrders}
            </div>
            <span className="text-[10px] text-rose-700 font-semibold">Needs attention</span>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-slate-900">Recent Scanned Orders</h3>
            <p className="text-xs text-slate-500">Click any order to inspect 3-way matching and financials</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
              title="Bulk delete orders"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bulk Delete Orders</span>
            </button>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1 transition"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {recentOrders.map(order => (
            <div
              key={order.id}
              onClick={() => onSelectOrder(order)}
              className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 rounded-xl cursor-pointer transition gap-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-900 truncate">{order.order_id}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      order.transaction_status === 'MATCHED' && order.handover_status === 'MATCHED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {order.transaction_status === 'MATCHED' && order.handover_status === 'MATCHED'
                      ? 'Fully Matched'
                      : 'Pending'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {order.product_name || `Tracking: ${order.tracking_id}`}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm font-bold font-mono text-emerald-700">
                  {order.profit > 0 ? `+SAR ${order.profit.toFixed(2)}` : `SAR ${order.profit.toFixed(2)}`}
                </div>
                <div className="text-[11px] text-slate-500">
                  Sales: SAR {order.selling_amount.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 my-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Bulk Delete Orders
                  </h3>
                  <p className="text-xs text-slate-500">
                    Orders ko ek saath delete karne ke options
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Summary */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Orders</span>
                <span className="text-xl font-black font-mono text-slate-900 mt-0.5 block">
                  {allOrdersList.length}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-rose-500 block">Exceptions / Pending</span>
                <span className="text-xl font-black font-mono text-rose-600 mt-0.5 block">
                  {allOrdersList.filter(o => o.transaction_status === 'PENDING' || o.handover_status === 'PENDING').length}
                </span>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Bulk Delete Action:
              </div>

              {/* Option 1: Delete All Orders */}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete ALL ${allOrdersList.length} orders? Yeh action undo nahi ho sakti.`)) {
                    executeBulkDelete('all');
                  }
                }}
                disabled={allOrdersList.length === 0}
                className="w-full p-4 rounded-2xl border-2 border-rose-200 hover:border-rose-400 bg-rose-50/60 hover:bg-rose-50 text-left transition flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="space-y-1">
                  <div className="text-sm font-black text-rose-700 group-hover:text-rose-800 flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4" />
                    <span>Delete All Orders (Poore Orders Delete Karein)</span>
                  </div>
                  <p className="text-xs text-rose-600/90 font-medium">
                    Tamam {allOrdersList.length} orders ko database se permanent delete karega.
                  </p>
                </div>
                <span className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs shrink-0">
                  Delete All
                </span>
              </button>

              {/* Option 2: Delete Only Unmatched / Pending Orders */}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Delete all pending/unmatched orders? Matched orders safe rahenge.')) {
                    executeBulkDelete('unmatched');
                  }
                }}
                disabled={allOrdersList.length === 0}
                className="w-full p-4 rounded-2xl border border-amber-200 hover:border-amber-400 bg-amber-50/60 hover:bg-amber-50 text-left transition flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="space-y-1">
                  <div className="text-sm font-bold text-amber-900 group-hover:text-amber-950 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Delete Unmatched / Pending Orders Only</span>
                  </div>
                  <p className="text-xs text-amber-700/90 font-medium">
                    Sirf pending/unmatched scans delete honge, fully matched orders mehfooz rahenge.
                  </p>
                </div>
                <span className="px-3 py-1 bg-amber-500 text-slate-950 text-xs font-bold rounded-xl shadow-xs shrink-0">
                  Clean Pending
                </span>
              </button>

              {/* Option 3: Choose via Checkboxes in Orders Table */}
              <button
                type="button"
                onClick={() => {
                  setShowBulkDeleteModal(false);
                  onNavigateTab('orders');
                }}
                className="w-full p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-left transition flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-slate-600" />
                    <span>Select Specific Orders with Checkboxes</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Orders register table me ja kar marzi ke orders tick karke delete karein.
                  </p>
                </div>
                <span className="px-3 py-1 bg-slate-200 text-slate-800 text-xs font-bold rounded-xl shrink-0">
                  Open Register
                </span>
              </button>
            </div>

            {/* Cancel Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition"
              >
                Cancel / Wapas Jayein
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
