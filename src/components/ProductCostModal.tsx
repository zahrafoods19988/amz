import React, { useState, useEffect } from 'react';
import { X, DollarSign, History, Save, Check } from 'lucide-react';
import { ProductMaster, PurchaseCostHistory } from '../types';
import { db } from '../services/db';

interface ProductCostModalProps {
  product: ProductMaster | null;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated?: (updated: ProductMaster) => void;
}

export const ProductCostModal: React.FC<ProductCostModalProps> = ({
  product,
  isOpen,
  onClose,
  onProductUpdated,
}) => {
  if (!isOpen || !product) return null;

  const [newCost, setNewCost] = useState<number>(product.current_purchase_cost || 0);
  const [, setHistory] = useState<PurchaseCostHistory[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (product) {
      setNewCost(product.current_purchase_cost || 0);
      setHistory(db.getCostHistory(product.id));
      setSaveSuccess(false);
    }
  }, [product]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCost < 0) return;

    const updated = db.updateProductCost(product.id, Number(newCost));
    if (updated) {
      setHistory(db.getCostHistory(product.id));
      setSaveSuccess(true);
      if (onProductUpdated) onProductUpdated(updated);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Product Purchase Cost</h2>
              <p className="text-xs text-slate-500">Remember cost for all future orders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Product details */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Selected Product</span>
            <h3 className="text-sm font-bold text-slate-900">{product.product_name}</h3>
            <div className="flex flex-wrap gap-3 text-xs font-mono text-slate-500 pt-1">
              {product.sku && <span className="bg-white px-2 py-0.5 rounded border border-slate-200">SKU: {product.sku}</span>}
              {product.asin && <span className="bg-white px-2 py-0.5 rounded border border-slate-200">ASIN: {product.asin}</span>}
              {product.barcode && <span>Barcode: {product.barcode}</span>}
            </div>
          </div>

          {/* Current & New Cost Inputs */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 block">
              Enter Purchase Cost (SAR)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-700 font-black text-sm">
                SAR
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={newCost}
                onChange={e => setNewCost(parseFloat(e.target.value) || 0)}
                placeholder="30.00"
                className="w-full pl-14 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              The app automatically saves this price and applies it whenever this product is sold.
            </p>
          </div>

          {/* Cost History & Preservation Notice */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <History className="w-4 h-4 text-amber-600" />
              <span>Historical Cost Integrity</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Historical orders maintain their original purchase cost. Updating to a new cost applies effective from today forward.
            </p>
            {product.previous_purchase_cost !== undefined && (
              <div className="text-xs font-mono text-slate-600 pt-1 border-t border-slate-200 flex justify-between">
                <span>Previous Cost:</span>
                <span className="text-slate-900 font-bold">SAR {product.previous_purchase_cost.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Success Banner */}
          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" /> Cost updated and remembered for future orders!
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-md shadow-amber-500/20"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              SAVE COST (SAR {Number(newCost).toFixed(2)})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
