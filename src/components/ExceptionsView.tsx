import React, { useState } from 'react';
import {
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  DollarSign,
  Edit2,
  CheckCircle2,
} from 'lucide-react';
import { Order, ProductMaster } from '../types';
import { db, isValidOrderId, isValidTrackingId } from '../services/db';

interface ExceptionsViewProps {
  orders: Order[];
  onOpenUpload: (tab?: 'transaction' | 'handover') => void;
  onSelectOrder: (order: Order) => void;
  onOpenCostModal: (product: ProductMaster) => void;
  onOrderUpdated: () => void;
}

export const ExceptionsView: React.FC<ExceptionsViewProps> = ({
  orders,
  onOpenUpload,
  onSelectOrder,
  onOpenCostModal,
  onOrderUpdated,
}) => {
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editOrderIdVal, setEditOrderIdVal] = useState('');
  const [editTrackingIdVal, setEditTrackingIdVal] = useState('');

  // Partition exceptions
  const missingTransactions = orders.filter(o => o.transaction_status === 'PENDING');
  const missingHandovers = orders.filter(o => o.handover_status === 'PENDING');
  const missingPurchaseCosts = orders.filter(
    o => o.transaction_status === 'MATCHED' && (!o.purchase_cost || o.purchase_cost === 0)
  );

  const startEdit = (order: Order) => {
    setEditingOrderId(order.id);
    setEditOrderIdVal(order.order_id);
    setEditTrackingIdVal(order.tracking_id);
  };

  const handleSaveEdit = (order: Order) => {
    if (!isValidOrderId(editOrderIdVal)) {
      alert('Order ID must follow standard format: XXX-XXXXXXX-XXXXXXX');
      return;
    }
    if (!isValidTrackingId(editTrackingIdVal)) {
      alert('Tracking ID must follow standard format: ASA + numbers');
      return;
    }

    order.order_id = editOrderIdVal.trim();
    order.tracking_id = editTrackingIdVal.trim().toUpperCase();

    // Re-trigger matching
    db.matchSingleOrder(order);
    db.saveOrder(order);

    setEditingOrderId(null);
    onOrderUpdated();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Exceptions & Unmatched Orders
        </h2>
        <p className="text-xs text-slate-500">
          Orders awaiting transaction files, handover manifests, or product purchase cost entry.
        </p>
      </div>

      {/* Quick Upload Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload Transaction Report banner */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              <span>{missingTransactions.length} Pending Transactions</span>
            </div>
            <p className="text-[11px] text-amber-800">
              Upload Amazon transaction CSV/Excel to resolve selling prices and fees.
            </p>
          </div>
          <button
            onClick={() => onOpenUpload('transaction')}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl whitespace-nowrap shadow-xs transition"
          >
            Upload CSV/XLSX
          </button>
        </div>

        {/* Upload Handover PDF banner */}
        <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-900">
              <FileText className="w-4 h-4 text-orange-600" />
              <span>{missingHandovers.length} Pending Handovers</span>
            </div>
            <p className="text-[11px] text-orange-800">
              Upload Amazon Handover / Dispatch PDF to match carrier tracking IDs.
            </p>
          </div>
          <button
            onClick={() => onOpenUpload('handover')}
            className="px-3.5 py-2 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold rounded-xl whitespace-nowrap shadow-xs transition"
          >
            Upload PDF
          </button>
        </div>
      </div>

      {/* SECTION 1: Missing Purchase Cost (High Priority for Profit Accuracy) */}
      {missingPurchaseCosts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-600" />
              Missing Purchase Cost ({missingPurchaseCosts.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Enter cost once; the app remembers it for all orders of this product
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {missingPurchaseCosts.map(order => {
              const prod = order.product_id ? db.getProducts().find(p => p.id === order.product_id) : null;
              return (
                <div key={order.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900">{order.product_name || 'Amazon Product'}</div>
                    <div className="font-mono text-slate-500 text-[10px]">
                      Order: {order.order_id} • Sales: SAR {order.selling_amount.toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (prod) {
                        onOpenCostModal(prod);
                      } else {
                        onSelectOrder(order);
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition"
                  >
                    Enter Purchase Cost
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: Orders Pending Transaction Data */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-amber-600" />
          Scanned Labels Pending Transaction File ({missingTransactions.length})
        </h3>

        {missingTransactions.length === 0 ? (
          <div className="p-6 text-center text-xs text-emerald-700 bg-emerald-50 rounded-2xl flex items-center justify-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-4 h-4" /> All scanned orders have matching transactions!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {missingTransactions.map(order => {
              const isEditing = editingOrderId === order.id;

              return (
                <div key={order.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  {isEditing ? (
                    <div className="space-y-2 flex-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block font-medium">Order ID:</label>
                          <input
                            type="text"
                            value={editOrderIdVal}
                            onChange={e => setEditOrderIdVal(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block font-medium">Tracking ID:</label>
                          <input
                            type="text"
                            value={editTrackingIdVal}
                            onChange={e => setEditTrackingIdVal(e.target.value.toUpperCase())}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono text-slate-900"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(order)}
                          className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded text-xs shadow-xs"
                        >
                          Save & Rematch
                        </button>
                        <button
                          onClick={() => setEditingOrderId(null)}
                          className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-slate-900 flex items-center gap-2">
                          <span>{order.order_id}</span>
                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-mono font-semibold">
                            {order.tracking_id}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Scanned on: {new Date(order.scan_date).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => startEdit(order)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs flex items-center gap-1 border border-slate-200 transition"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => onSelectOrder(order)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-lg text-xs border border-slate-200 transition"
                        >
                          Details
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: Orders Pending Handover Manifest */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-orange-600" />
          Scanned Labels Pending Handover Dispatch PDF ({missingHandovers.length})
        </h3>

        {missingHandovers.length === 0 ? (
          <div className="p-6 text-center text-xs text-emerald-700 bg-emerald-50 rounded-2xl flex items-center justify-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-4 h-4" /> All orders have verified handover dispatch records!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {missingHandovers.map(order => (
              <div key={order.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="font-mono font-bold text-amber-800">{order.tracking_id}</div>
                  <div className="text-[10px] font-mono text-slate-500">Order ID: {order.order_id}</div>
                </div>
                <button
                  onClick={() => onSelectOrder(order)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200 transition"
                >
                  View Order
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
