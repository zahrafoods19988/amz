import React, { useState, useMemo } from 'react';
import {
  Search,
  FileSpreadsheet,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  X,
  AlertOctagon,
  Package,
} from 'lucide-react';
import { ProductMaster, Order } from '../types';
import { db } from '../services/db';
import { exportProductsToExcel } from '../services/exportService';
import { sound } from '../services/sound';

interface ProductsViewProps {
  onOpenCostUpdate: (product: ProductMaster) => void;
  onSelectOrder: (order: Order) => void;
  onProductsUpdated?: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  onOpenCostUpdate,
  onSelectOrder,
  onProductsUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<ProductMaster | null>(null);
  
  // Selection and Bulk Delete State
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deleteActionType, setDeleteActionType] = useState<'selected' | 'all' | 'zero_sales' | 'single'>('selected');
  const [singleProductToDelete, setSingleProductToDelete] = useState<ProductMaster | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load products & orders fresh
  const productsWithStats = useMemo(() => {
    return db.getProductMasterWithStats();
  }, [refreshKey]);

  const allOrders = useMemo(() => {
    return db.getOrders();
  }, [refreshKey]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Search filter
  const filteredProducts = useMemo(() => {
    return productsWithStats.filter(p => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const matchName = p.product_name.toLowerCase().includes(q);
      const matchAsin = p.asin?.toLowerCase().includes(q);
      const matchSku = p.sku?.toLowerCase().includes(q);
      const matchBarcode = p.barcode?.includes(q);
      return matchName || matchAsin || matchSku || matchBarcode;
    });
  }, [productsWithStats, searchQuery]);

  // Product sales history orders
  const productSalesHistory = useMemo(() => {
    if (!selectedProductForHistory) return [];
    return allOrders.filter(
      o => o.product_id === selectedProductForHistory.id || (selectedProductForHistory.sku && o.sku === selectedProductForHistory.sku)
    );
  }, [selectedProductForHistory, allOrders]);

  // Checkbox helpers
  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.has(p.id));
  const someFilteredSelected = filteredProducts.some(p => selectedProductIds.has(p.id));

  const handleSelectAllToggle = () => {
    if (allFilteredSelected) {
      // Deselect all filtered
      const next = new Set(selectedProductIds);
      filteredProducts.forEach(p => next.delete(p.id));
      setSelectedProductIds(next);
    } else {
      // Select all filtered
      const next = new Set(selectedProductIds);
      filteredProducts.forEach(p => next.add(p.id));
      setSelectedProductIds(next);
    }
  };

  const handleToggleProduct = (id: string) => {
    const next = new Set(selectedProductIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedProductIds(next);
  };

  // Open Bulk Delete modal
  const handleOpenBulkModal = (type: 'selected' | 'all' | 'zero_sales') => {
    setDeleteActionType(type);
    setSingleProductToDelete(null);
    setShowBulkDeleteModal(true);
  };

  // Open Single Delete modal
  const handleOpenSingleDelete = (product: ProductMaster) => {
    setSingleProductToDelete(product);
    setDeleteActionType('single');
    setShowBulkDeleteModal(true);
  };

  // Confirm and execute deletion
  const handleConfirmDelete = () => {
    let deletedCount = 0;

    if (deleteActionType === 'single' && singleProductToDelete) {
      db.deleteProduct(singleProductToDelete.id);
      deletedCount = 1;
      const next = new Set(selectedProductIds);
      next.delete(singleProductToDelete.id);
      setSelectedProductIds(next);
      showToast(`Product "${singleProductToDelete.product_name.slice(0, 30)}..." deleted.`);
    } else if (deleteActionType === 'selected') {
      const idsToDelete = Array.from(selectedProductIds);
      deletedCount = db.deleteProductsBulk(idsToDelete);
      setSelectedProductIds(new Set());
      showToast(`Successfully deleted ${deletedCount} selected product(s) from Product Master.`);
    } else if (deleteActionType === 'all') {
      deletedCount = db.clearAllProducts();
      setSelectedProductIds(new Set());
      showToast(`All ${deletedCount} products deleted from Product Master.`);
    } else if (deleteActionType === 'zero_sales') {
      const zeroSalesProducts = productsWithStats.filter(p => (p.unitsSold || 0) === 0);
      deletedCount = db.deleteProductsBulk(zeroSalesProducts.map(p => p.id));
      const next = new Set(selectedProductIds);
      zeroSalesProducts.forEach(p => next.delete(p.id));
      setSelectedProductIds(next);
      showToast(`Deleted ${deletedCount} inactive products with 0 sales.`);
    }

    sound.playDeleteSound();
    setShowBulkDeleteModal(false);
    setSingleProductToDelete(null);
    setRefreshKey(k => k + 1);
    onProductsUpdated?.();
  };

  const zeroSalesCount = productsWithStats.filter(p => (p.unitsSold || 0) === 0).length;

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900">Product Master (Auto-Generated)</h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {productsWithStats.length} Products
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Products are automatically created from transactions. Purchase cost is remembered forever.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* BULK DELETE BUTTON */}
          {selectedProductIds.size > 0 ? (
            <button
              onClick={() => handleOpenBulkModal('selected')}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-rose-600/20 transition active:scale-95 animate-pulse"
              title="Delete Selected Products"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedProductIds.size})</span>
            </button>
          ) : (
            <button
              onClick={() => handleOpenBulkModal('all')}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2 border border-rose-200 transition active:scale-95"
              title="Bulk Delete Products Options"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Bulk Delete</span>
            </button>
          )}

          {/* Quick Select All Toggle */}
          <button
            onClick={handleSelectAllToggle}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-200 shadow-xs transition"
          >
            {allFilteredSelected ? (
              <>
                <Square className="w-4 h-4 text-amber-600" />
                <span>Deselect All</span>
              </>
            ) : (
              <>
                <CheckSquare className="w-4 h-4 text-slate-500" />
                <span>Select All ({filteredProducts.length})</span>
              </>
            )}
          </button>

          {/* Export to Excel */}
          <button
            onClick={() => exportProductsToExcel(filteredProducts as any)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 border border-slate-200 shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Selected Items Action Banner */}
      {selectedProductIds.size > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center">
              {selectedProductIds.size}
            </span>
            <span className="text-xs font-bold text-rose-900">
              {selectedProductIds.size} product{selectedProductIds.size > 1 ? 's' : ''} selected
            </span>
            <span className="text-xs text-rose-600 font-medium hidden sm:inline">
              (Ready for bulk deletion)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenBulkModal('selected')}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Confirm Delete Selected</span>
            </button>
            <button
              onClick={() => setSelectedProductIds(new Set())}
              className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search products by Name, ASIN, SKU, Barcode..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
          />
        </div>

        {searchQuery && (
          <div className="text-xs text-slate-500 shrink-0">
            Showing <strong className="text-slate-900">{filteredProducts.length}</strong> of {productsWithStats.length}
          </div>
        )}
      </div>

      {/* Product Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-mono uppercase text-[10px] tracking-wider">
                {/* Select All Checkbox Header */}
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={input => {
                      if (input) {
                        input.indeterminate = someFilteredSelected && !allFilteredSelected;
                      }
                    }}
                    onChange={handleSelectAllToggle}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                    title={allFilteredSelected ? 'Deselect all' : 'Select all'}
                  />
                </th>
                <th className="py-3 px-4">Product Name & ASIN/SKU</th>
                <th className="py-3 px-4 text-right">Purchase Cost</th>
                <th className="py-3 px-4 text-center">Units Sold</th>
                <th className="py-3 px-4 text-right">Total Sales</th>
                <th className="py-3 px-4 text-right">Amazon Fees</th>
                <th className="py-3 px-4 text-right">Net Revenue</th>
                <th className="py-3 px-4 text-right font-bold text-amber-600">Total Profit</th>
                <th className="py-3 px-4 text-right">Last Sold</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No products found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Scan labels or upload transactions to auto-populate Product Master.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const isSelected = selectedProductIds.has(product.id);

                  return (
                    <tr
                      key={product.id}
                      className={`transition ${isSelected ? 'bg-amber-50/60' : 'hover:bg-slate-50/80'}`}
                    >
                      {/* Row Checkbox */}
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleProduct(product.id)}
                          className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                        />
                      </td>

                      {/* Name & Identifiers */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div
                          onClick={() => setSelectedProductForHistory(product)}
                          className="font-bold text-slate-900 text-sm hover:text-amber-600 cursor-pointer leading-snug"
                        >
                          {product.product_name}
                        </div>
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-500 mt-1">
                          {product.asin && <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">ASIN: {product.asin}</span>}
                          {product.sku && <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">SKU: {product.sku}</span>}
                          {product.barcode && <span>Barcode: {product.barcode}</span>}
                        </div>
                      </td>

                      {/* Current Purchase Cost */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <button
                          onClick={() => onOpenCostUpdate(product)}
                          className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold border border-amber-300 transition"
                          title="Click to update purchase cost"
                        >
                          <span>SAR {product.current_purchase_cost.toFixed(2)}</span>
                          <span className="text-[10px] text-amber-600">✎</span>
                        </button>
                      </td>

                      {/* Units Sold */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                        {product.unitsSold}
                      </td>

                      {/* Total Sales */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        SAR {product.totalSales.toFixed(2)}
                      </td>

                      {/* Amazon Fees */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-600">
                        -SAR {product.totalAmazonFees.toFixed(2)}
                      </td>

                      {/* Net Revenue */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sky-700">
                        SAR {product.totalNetRevenue.toFixed(2)}
                      </td>

                      {/* Total Profit */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                        SAR {product.totalProfit.toFixed(2)}
                      </td>

                      {/* Last Sold Date */}
                      <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-500">
                        {product.lastSoldDate ? new Date(product.lastSoldDate).toLocaleDateString() : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedProductForHistory(product)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                            title="View Sales History"
                          >
                            History
                          </button>
                          <button
                            onClick={() => handleOpenSingleDelete(product)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition"
                            title="Delete this product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Bar on Mobile when items are selected */}
      {selectedProductIds.size > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40 bg-slate-950 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-between sm:hidden">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center">
              {selectedProductIds.size}
            </span>
            <span className="text-xs font-bold">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenBulkModal('selected')}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
            <button
              onClick={() => setSelectedProductIds(new Set())}
              className="px-2.5 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {deleteActionType === 'all'
                      ? 'Bulk Delete Products (Product Master)'
                      : deleteActionType === 'single'
                      ? 'Delete Product?'
                      : deleteActionType === 'zero_sales'
                      ? 'Delete Inactive Products (0 Sales)'
                      : `Delete Selected Products (${selectedProductIds.size})`}
                  </h3>
                  <p className="text-xs text-rose-700 font-medium">
                    Product Master Bulk Delete Options
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBulkDeleteModal(false);
                  setSingleProductToDelete(null);
                }}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-500 flex items-center justify-center transition border border-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Type Switcher if not single item */}
              {deleteActionType !== 'single' && (
                <div className="bg-slate-50 p-1.5 rounded-2xl border border-slate-200 flex flex-col gap-1.5">
                  <div className="text-[11px] font-bold text-slate-500 px-2 py-0.5">Select Bulk Delete Scope:</div>

                  {/* Option 1: Selected */}
                  <button
                    type="button"
                    onClick={() => setDeleteActionType('selected')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                      deleteActionType === 'selected'
                        ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>Selected Products Only</span>
                    <span className="font-mono bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {selectedProductIds.size} Selected
                    </span>
                  </button>

                  {/* Option 2: Zero Sales */}
                  <button
                    type="button"
                    onClick={() => setDeleteActionType('zero_sales')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                      deleteActionType === 'zero_sales'
                        ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>Inactive Products (0 Units Sold)</span>
                    <span className="font-mono bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {zeroSalesCount} Products
                    </span>
                  </button>

                  {/* Option 3: All Products */}
                  <button
                    type="button"
                    onClick={() => setDeleteActionType('all')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                      deleteActionType === 'all'
                        ? 'bg-white text-rose-700 font-bold shadow-xs border border-rose-200'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>Delete ALL Products in Master</span>
                    <span className="font-mono bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {productsWithStats.length} Total
                    </span>
                  </button>
                </div>
              )}

              {/* Confirmation Details */}
              {deleteActionType === 'single' && singleProductToDelete && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {singleProductToDelete.product_name}
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-600">
                    {singleProductToDelete.asin && <span>ASIN: {singleProductToDelete.asin}</span>}
                    {singleProductToDelete.sku && <span>SKU: {singleProductToDelete.sku}</span>}
                    <span>Cost: SAR {singleProductToDelete.current_purchase_cost.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {deleteActionType === 'selected' && selectedProductIds.size === 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    No products are currently ticked. Tick the checkboxes on the products you wish to delete, or choose <strong>"Delete ALL Products in Master"</strong> above.
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900">
                <AlertOctagon className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Important Notice:</div>
                  <p className="text-[11px] leading-relaxed text-rose-800">
                    Deleted products will be permanently removed from Product Master. New transactions or scans will auto-regenerate products with initial zero cost.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setShowBulkDeleteModal(false);
                  setSingleProductToDelete(null);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleteActionType === 'selected' && selectedProductIds.size === 0}
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {deleteActionType === 'all'
                    ? `Confirm: Delete All ${productsWithStats.length} Products`
                    : deleteActionType === 'single'
                    ? 'Confirm: Delete Product'
                    : deleteActionType === 'zero_sales'
                    ? `Confirm: Delete ${zeroSalesCount} Inactive Products`
                    : `Confirm: Delete ${selectedProductIds.size} Products`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Sales History Drawer / Modal */}
      {selectedProductForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Product Sales History</h3>
                <p className="text-xs text-amber-700 font-semibold font-mono">{selectedProductForHistory.product_name}</p>
              </div>
              <button
                onClick={() => setSelectedProductForHistory(null)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Total Orders: <strong className="text-slate-900">{productSalesHistory.length}</strong></span>
                <span>Current Cost: <strong className="text-amber-800 font-mono">SAR {selectedProductForHistory.current_purchase_cost.toFixed(2)}</strong></span>
              </div>

              {productSalesHistory.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No orders recorded for this product yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {productSalesHistory.map(ord => (
                    <div
                      key={ord.id}
                      onClick={() => {
                        onSelectOrder(ord);
                        setSelectedProductForHistory(null);
                      }}
                      className="p-3.5 bg-white hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer transition"
                    >
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-slate-900">{ord.order_id}</div>
                        <div className="text-[10px] text-slate-500">
                          Scan Date: {new Date(ord.scan_date).toLocaleDateString()} • Tracking: {ord.tracking_id}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-700">
                          Profit: SAR {ord.profit.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Sales: SAR {ord.selling_amount.toFixed(2)} | Cost: SAR {ord.purchase_cost.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
