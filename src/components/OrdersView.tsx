import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Plus,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Clock,
  Trash2,
  AlertTriangle,
  X,
  CheckSquare,
  Square,
  Download,
  Check,
} from 'lucide-react';
import { Order } from '../types';
import { db } from '../services/db';
import { sound } from '../services/sound';
import { exportOrdersToExcel, exportOrdersToPDF } from '../services/exportService';

interface OrdersViewProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onOpenScanner: () => void;
  onOrdersUpdated?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  onSelectOrder,
  onOpenScanner,
  onOrdersUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'matched' | 'tx_pending' | 'ho_pending' | 'refunded'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'profit_desc' | 'sales_desc'>('date_desc');

  // Bulk selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteActionType, setDeleteActionType] = useState<'selected' | 'all' | 'single' | 'unmatched'>('selected');
  const [singleOrderToDelete, setSingleOrderToDelete] = useState<Order | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Filter & Search
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Search matching across Order ID, Tracking ID, Shipment ID, Product Name, SKU, ASIN
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchOrder = order.order_id.toLowerCase().includes(q);
        const matchTracking = order.tracking_id.toLowerCase().includes(q);
        const matchShipment = order.shipment_id?.toLowerCase().includes(q);
        const matchProduct = order.product_name?.toLowerCase().includes(q);
        const matchSku = order.sku?.toLowerCase().includes(q);
        const matchAsin = order.asin?.toLowerCase().includes(q);

        if (!matchOrder && !matchTracking && !matchShipment && !matchProduct && !matchSku && !matchAsin) {
          return false;
        }
      }

      // Status filters
      if (statusFilter === 'matched') {
        return order.transaction_status === 'MATCHED' && order.handover_status === 'MATCHED';
      }
      if (statusFilter === 'tx_pending') {
        return order.transaction_status === 'PENDING';
      }
      if (statusFilter === 'ho_pending') {
        return order.handover_status === 'PENDING';
      }
      if (statusFilter === 'refunded') {
        return order.order_status === 'Refunded' || order.payment_status === 'REFUNDED';
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'profit_desc') return b.profit - a.profit;
      if (sortBy === 'sales_desc') return b.selling_amount - a.selling_amount;
      return new Date(b.scan_date).getTime() - new Date(a.scan_date).getTime();
    });
  }, [orders, searchQuery, statusFilter, sortBy]);

  // Bulk Selection Handlers
  const toggleSelectOrder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllFilteredSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.has(o.id));

  const toggleSelectAll = () => {
    if (isAllFilteredSelected) {
      // Deselect all filtered
      setSelectedOrderIds(prev => {
        const next = new Set(prev);
        filteredOrders.forEach(o => next.delete(o.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedOrderIds(prev => {
        const next = new Set(prev);
        filteredOrders.forEach(o => next.add(o.id));
        return next;
      });
    }
  };

  const handleDeselectAll = () => {
    setSelectedOrderIds(new Set());
  };

  // Trigger Bulk Delete
  const handleOpenBulkDeleteModal = (type: 'selected' | 'all') => {
    if (type === 'selected' && selectedOrderIds.size === 0) {
      // If nothing selected yet, select all currently filtered orders for convenience
      toggleSelectAll();
      setDeleteActionType('selected');
      setShowDeleteConfirmModal(true);
      return;
    }
    setDeleteActionType(type);
    setShowDeleteConfirmModal(true);
  };

  const handleOpenSingleDelete = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setSingleOrderToDelete(order);
    setDeleteActionType('single');
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteOrders = () => {
    sound.playDeleteSound();

    if (deleteActionType === 'all') {
      const total = orders.length;
      db.clearAllOrders();
      setSelectedOrderIds(new Set());
      setShowDeleteConfirmModal(false);
      setFeedbackToast(`All ${total} orders deleted successfully.`);
      if (onOrdersUpdated) onOrdersUpdated();
    } else if (deleteActionType === 'unmatched') {
      const count = db.deleteUnmatchedOrders();
      setSelectedOrderIds(new Set());
      setShowDeleteConfirmModal(false);
      setFeedbackToast(`${count} unmatched/pending orders deleted.`);
      if (onOrdersUpdated) onOrdersUpdated();
    } else if (deleteActionType === 'single' && singleOrderToDelete) {
      db.deleteOrder(singleOrderToDelete.id);
      setSelectedOrderIds(prev => {
        const next = new Set(prev);
        next.delete(singleOrderToDelete.id);
        return next;
      });
      setShowDeleteConfirmModal(false);
      setFeedbackToast(`Order ${singleOrderToDelete.order_id} deleted.`);
      setSingleOrderToDelete(null);
      if (onOrdersUpdated) onOrdersUpdated();
    } else {
      const idsToDelete = Array.from(selectedOrderIds);
      const count = db.deleteOrdersBulk(idsToDelete);
      setSelectedOrderIds(new Set());
      setShowDeleteConfirmModal(false);
      setFeedbackToast(`${count} orders deleted successfully.`);
      if (onOrdersUpdated) onOrdersUpdated();
    }

    setTimeout(() => {
      setFeedbackToast(null);
    }, 3500);
  };

  // Export selected orders
  const handleExportSelected = () => {
    const selectedList = orders.filter(o => selectedOrderIds.has(o.id));
    if (selectedList.length === 0) return;
    exportOrdersToExcel(selectedList, `selected_${selectedList.length}_orders.xlsx`);
  };

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{feedbackToast}</span>
          <button onClick={() => setFeedbackToast(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Orders & Matching Register</h2>
          <p className="text-xs text-slate-500">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} listed
            {selectedOrderIds.size > 0 && ` • ${selectedOrderIds.size} selected`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* BULK DELETE ACTION BUTTON (Always accessible in top toolbar!) */}
          {selectedOrderIds.size > 0 ? (
            <button
              onClick={() => handleOpenBulkDeleteModal('selected')}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-600/25 transition active:scale-95 animate-pulse"
              title="Delete all selected orders"
            >
              <Trash2 className="w-4 h-4 stroke-[2.5]" />
              <span>Delete Selected ({selectedOrderIds.size})</span>
            </button>
          ) : (
            orders.length > 0 && (
              <button
                onClick={() => handleOpenBulkDeleteModal('all')}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm shadow-rose-600/20 transition active:scale-95"
                title="Bulk delete orders from register"
              >
                <Trash2 className="w-4 h-4 stroke-[2.5]" />
                <span>Bulk Delete</span>
              </button>
            )
          )}

          {/* Export Dropdown / buttons */}
          <button
            onClick={() => exportOrdersToExcel(filteredOrders)}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-200 shadow-xs transition"
            title="Export Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={() => exportOrdersToPDF(filteredOrders)}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-200 shadow-xs transition"
            title="Export PDF"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            onClick={onOpenScanner}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm shadow-amber-500/20 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Scan Order</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Sticky Bar (Visible when 1+ orders selected) */}
      {selectedOrderIds.size > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
              {selectedOrderIds.size}
            </span>
            <div>
              <div className="text-xs font-bold text-white">
                {selectedOrderIds.size} {selectedOrderIds.size === 1 ? 'Order' : 'Orders'} Selected for Bulk Action
              </div>
              <div className="text-[11px] text-slate-400">
                You can delete all selected orders or export them to Excel
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSelected}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Export Selected</span>
            </button>

            {/* Prominent Red Bulk Delete Button */}
            <button
              onClick={() => handleOpenBulkDeleteModal('selected')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition active:scale-95"
            >
              <Trash2 className="w-4 h-4 stroke-[2.5]" />
              <span>Delete Selected ({selectedOrderIds.size})</span>
            </button>

            <button
              onClick={handleDeselectAll}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="Deselect All"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter, Search & Bulk Select Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Quick Select All / Deselect Toolbar Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={toggleSelectAll}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
                isAllFilteredSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isAllFilteredSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>{isAllFilteredSelected ? 'Deselect All' : `Select All (${filteredOrders.length})`}</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, Tracking ID, Product, SKU, ASIN..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
            />
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
            >
              <option value="date_desc">Latest Scanned</option>
              <option value="profit_desc">Highest Profit</option>
              <option value="sales_desc">Highest Sales</option>
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Status:</span>
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'matched', label: 'Fully Matched' },
            { id: 'tx_pending', label: 'Tx Pending' },
            { id: 'ho_pending', label: 'Handover Pending' },
            { id: 'refunded', label: 'Refunds/Returns' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1 rounded-lg whitespace-nowrap font-medium transition ${
                statusFilter === f.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List / Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-mono uppercase text-[10px] tracking-wider">
                {/* Select All Checkbox Header */}
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="p-1 rounded hover:bg-slate-200 transition text-slate-600"
                    title={isAllFilteredSelected ? 'Deselect All' : 'Select All Filtered'}
                  >
                    {isAllFilteredSelected ? (
                      <CheckSquare className="w-4 h-4 text-amber-600" />
                    ) : selectedOrderIds.size > 0 ? (
                      <div className="w-4 h-4 border-2 border-amber-600 rounded bg-amber-100 flex items-center justify-center">
                        <div className="w-2 h-0.5 bg-amber-700" />
                      </div>
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Order & Tracking ID</th>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4 text-right">Sales Amount</th>
                <th className="py-3 px-4 text-right">Amazon Fees</th>
                <th className="py-3 px-4 text-right">Net Rev</th>
                <th className="py-3 px-4 text-right">Purchase Cost</th>
                <th className="py-3 px-4 text-right font-bold text-amber-600">Net Profit</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-3 text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No orders matching your search or filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isFullyMatched =
                    order.transaction_status === 'MATCHED' && order.handover_status === 'MATCHED';
                  const isSelected = selectedOrderIds.has(order.id);

                  return (
                    <tr
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className={`cursor-pointer transition group ${
                        isSelected ? 'bg-amber-50/70 hover:bg-amber-50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-3.5 px-3 text-center"
                        onClick={e => toggleSelectOrder(order.id, e)}
                      >
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-slate-200 transition"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>
                      </td>

                      {/* Order & Tracking ID */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900 text-xs">{order.order_id}</div>
                        <div className="text-[11px] text-amber-700 font-semibold">{order.tracking_id}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(order.scan_date).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-800 truncate">
                          {order.product_name || (
                            <span className="text-amber-700 font-normal italic">Awaiting transaction import</span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {order.sku && `SKU: ${order.sku}`} {order.asin && `• ASIN: ${order.asin}`}
                        </div>
                      </td>

                      {/* Sales Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        SAR {order.selling_amount.toFixed(2)}
                      </td>

                      {/* Amazon Fees */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-600">
                        -SAR {order.amazon_fees.toFixed(2)}
                      </td>

                      {/* Net Revenue */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sky-700">
                        SAR {order.net_revenue.toFixed(2)}
                      </td>

                      {/* Purchase Cost */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-800">
                        {order.purchase_cost > 0 ? (
                          `SAR ${order.purchase_cost.toFixed(2)}`
                        ) : (
                          <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                            Set Cost
                          </span>
                        )}
                      </td>

                      {/* Profit & Margin */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div
                          className={`font-black text-sm ${
                            order.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          SAR {order.profit.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">{order.profit_margin}%</div>
                      </td>

                      {/* Matching Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isFullyMatched
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isFullyMatched ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Matched
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" /> Pending
                            </>
                          )}
                        </span>
                      </td>

                      {/* Individual Delete Action Button */}
                      <td className="py-3.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={e => handleOpenSingleDelete(order, e)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete this order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Bulk Delete */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4 my-auto">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {deleteActionType === 'all'
                    ? 'Bulk Delete Orders (Orders Delete Karein)'
                    : deleteActionType === 'unmatched'
                    ? 'Delete Unmatched Orders?'
                    : deleteActionType === 'single'
                    ? 'Delete This Order?'
                    : `Delete ${selectedOrderIds.size} Selected Orders?`}
                </h3>
                <p className="text-xs text-slate-500">
                  {deleteActionType === 'all'
                    ? `Total ${orders.length} orders register me maujood hain.`
                    : deleteActionType === 'unmatched'
                    ? 'Sirf pending/unmatched orders delete honge.'
                    : deleteActionType === 'single'
                    ? `Order ${singleOrderToDelete?.order_id} will be permanently removed.`
                    : `Are you sure you want to delete ${selectedOrderIds.size} selected orders?`}
                </p>
              </div>
            </div>

            {deleteActionType === 'all' && (
              <div className="space-y-2 py-1">
                <button
                  type="button"
                  onClick={() => setDeleteActionType('all')}
                  className={`w-full p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                    deleteActionType === 'all'
                      ? 'border-rose-400 bg-rose-50 text-rose-900 font-bold'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <span>Delete ALL {orders.length} Orders (Poore Orders)</span>
                  <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded font-bold">All</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteActionType('unmatched')}
                  className="w-full p-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-left text-xs transition flex items-center justify-between font-semibold"
                >
                  <span>Delete Unmatched / Pending Only</span>
                  <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-bold">Pending</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toggleSelectAll();
                    setShowDeleteConfirmModal(false);
                  }}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-left text-xs transition flex items-center justify-between"
                >
                  <span>Select All Filtered ({filteredOrders.length}) with Checkboxes</span>
                  <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold">Review</span>
                </button>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <p className="font-bold">This action cannot be undone.</p>
              <p className="text-[11px] leading-relaxed text-rose-700">
                {deleteActionType === 'unmatched'
                  ? 'Sirf pending/unmatched orders hataye jayenge.'
                  : 'Selected order records will be permanently removed from your register.'}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setSingleOrderToDelete(null);
                }}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteOrders}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl text-xs transition shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-4 h-4 stroke-[2.5]" />
                <span>Yes, Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
