import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  Package,
  DollarSign,
  TrendingUp,
  Truck,
  FileSpreadsheet,
  QrCode,
  Edit3,
  Save,
  Check,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { Order } from '../types';
import { db } from '../services/db';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated?: (updated: Order) => void;
  onOrderDeleted?: (orderId: string) => void;
  onOpenCostUpdate?: (productId: string) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
  onOrderDeleted,
}) => {
  if (!isOpen || !order) return null;

  const [isEditingCosts, setIsEditingCosts] = useState(false);
  const [purchaseCost, setPurchaseCost] = useState(order.purchase_cost || 0);
  const [additionalCost, setAdditionalCost] = useState(order.additional_cost || 0);
  const [orderStatus, setOrderStatus] = useState(order.order_status);
  const [updateProductMasterToo, setUpdateProductMasterToo] = useState(true);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleDeleteThisOrder = () => {
    db.deleteOrder(order.id);
    if (onOrderDeleted) {
      onOrderDeleted(order.id);
    }
    onClose();
  };

  const handleSaveCosts = () => {
    order.purchase_cost = Number(purchaseCost);
    order.additional_cost = Number(additionalCost);
    order.order_status = orderStatus;

    db.recalculateOrderFinancials(order);
    db.saveOrder(order);

    // If update Product Master requested and product exists
    if (updateProductMasterToo && order.product_id) {
      db.updateProductCost(order.product_id, Number(purchaseCost));
    }

    setIsEditingCosts(false);
    if (onOrderUpdated) {
      onOrderUpdated({ ...order });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                Amazon Order Details
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  order.order_status === 'Refunded'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {order.order_status}
              </span>
            </div>
            <h2 className="text-xl font-bold font-mono text-slate-900 tracking-wide">{order.order_id}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Three-Way Matching Status Banner */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
              Three-Way Matching Status
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              {/* Label Status */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5 shadow-xs">
                <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Label</div>
                  <div className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 inline" /> Scanned
                  </div>
                </div>
              </div>

              {/* Transaction Status */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5 shadow-xs">
                <FileSpreadsheet className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Transaction</div>
                  {order.transaction_status === 'MATCHED' ? (
                    <div className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 inline" /> Matched
                    </div>
                  ) : (
                    <div className="font-bold text-amber-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 inline" /> Pending
                    </div>
                  )}
                </div>
              </div>

              {/* Handover Status */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5 shadow-xs">
                <Truck className="w-4 h-4 text-orange-600 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Handover</div>
                  {order.handover_status === 'MATCHED' ? (
                    <div className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 inline" /> Matched
                    </div>
                  ) : (
                    <div className="font-bold text-amber-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 inline" /> Pending
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Status */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5 shadow-xs">
                <DollarSign className="w-4 h-4 text-sky-600 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Disbursement</div>
                  <div className="font-bold text-sky-700">{order.payment_status}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Order Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-amber-700 font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              Order Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">Order ID</span>
                <span className="font-mono font-bold text-slate-900 text-base">{order.order_id}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">Tracking ID</span>
                <span className="font-mono font-bold text-amber-800 text-base">{order.tracking_id}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 block font-medium">Product</span>
                  {order.sku && <span className="text-[10px] font-mono text-slate-500">SKU: {order.sku}</span>}
                </div>
                <span className="font-semibold text-slate-900 text-sm">
                  {order.product_name || (
                    <span className="text-amber-700 italic font-normal">Awaiting transaction file upload to resolve product title</span>
                  )}
                </span>
                {order.asin && <div className="text-[11px] font-mono text-slate-500 mt-1">ASIN: {order.asin}</div>}
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">Quantity</span>
                <span className="font-semibold text-slate-900">{order.quantity || 1} Unit</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">Scan Date / Time</span>
                <span className="font-mono text-slate-700 text-xs">
                  {new Date(order.scan_date).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Financial Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-amber-700 font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                Financial Information
              </h3>
              {!isEditingCosts ? (
                <button
                  onClick={() => setIsEditingCosts(true)}
                  className="text-xs text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1.5 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Costs
                </button>
              ) : (
                <button
                  onClick={handleSaveCosts}
                  className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </button>
              )}
            </div>

            {/* Financial Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">Selling Amount</span>
                <span className="text-base font-bold text-slate-900">SAR {order.selling_amount.toFixed(2)}</span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">Amazon Fees</span>
                <span className="text-base font-bold text-rose-600">- SAR {order.amazon_fees.toFixed(2)}</span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">Net Revenue</span>
                <span className="text-base font-bold text-sky-700">SAR {order.net_revenue.toFixed(2)}</span>
              </div>

              {/* Purchase Cost (Editable) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">Purchase Cost</span>
                {isEditingCosts ? (
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseCost}
                    onChange={e => setPurchaseCost(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 bg-white border border-slate-300 px-2 py-1 rounded text-sm text-slate-900 font-mono focus:border-amber-500"
                  />
                ) : (
                  <span className="text-base font-bold text-amber-800">
                    {order.purchase_cost > 0 ? `SAR ${order.purchase_cost.toFixed(2)}` : (
                      <span className="text-xs text-amber-700 font-semibold">Missing (SAR 0.00)</span>
                    )}
                  </span>
                )}
              </div>

              {/* Additional Cost (Editable) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">Additional Cost</span>
                {isEditingCosts ? (
                  <input
                    type="number"
                    step="0.01"
                    value={additionalCost}
                    onChange={e => setAdditionalCost(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 bg-white border border-slate-300 px-2 py-1 rounded text-sm text-slate-900 font-mono focus:border-amber-500"
                  />
                ) : (
                  <span className="text-base font-bold text-slate-800">SAR {order.additional_cost.toFixed(2)}</span>
                )}
              </div>

              {/* Net Profit Card */}
              <div
                className={`p-3.5 rounded-xl border col-span-2 sm:col-span-1 shadow-xs ${
                  order.profit >= 0
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider block font-bold">Net Profit</span>
                  <span className="text-xs font-mono font-bold">({order.profit_margin}%)</span>
                </div>
                <span className="text-xl font-black font-mono">SAR {order.profit.toFixed(2)}</span>
              </div>
            </div>

            {/* Editable checkbox to sync cost to Product Master */}
            {isEditingCosts && order.product_id && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateProductMasterToo}
                    onChange={e => setUpdateProductMasterToo(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-white border-slate-300"
                  />
                  <span>Also update Product Master purchase cost for future orders</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {order.transaction_status === 'MATCHED' && order.handover_status === 'MATCHED' ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> Three-Way Matched Successfully
              </span>
            ) : (
              <span className="text-amber-700 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Awaiting pending files
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!showConfirmDelete ? (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-1.5 transition"
                title="Delete this order"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete Order</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-xl border border-rose-200 text-xs">
                <span className="text-[11px] text-rose-800 font-bold px-1.5">Confirm?</span>
                <button
                  type="button"
                  onClick={handleDeleteThisOrder}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-2 py-1 text-slate-600 hover:text-slate-900 text-xs"
                >
                  No
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
