import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { Order } from '../types';
import { db } from '../services/db';
import { exportOrdersToCSV, exportOrdersToExcel, exportOrdersToPDF } from '../services/exportService';

type ReportType =
  | 'daily_profit'
  | 'monthly_profit'
  | 'product_profit'
  | 'sku_profit'
  | 'asin_profit'
  | 'fees_report'
  | 'returns_report'
  | 'pending_tx_report'
  | 'pending_ho_report';

interface ReportsViewProps {
  orders: Order[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ orders }) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('daily_profit');
  const productsWithStats = db.getProductMasterWithStats();

  const reportList: { id: ReportType; label: string; desc: string }[] = [
    { id: 'daily_profit', label: 'Daily Profit Report', desc: 'Breakdown of sales, fees, and net profit by day' },
    { id: 'monthly_profit', label: 'Monthly Profit Report', desc: 'Monthly aggregated revenue and profit margins' },
    { id: 'product_profit', label: 'Product-wise Profit', desc: 'Profitability per product in Product Master' },
    { id: 'sku_profit', label: 'SKU-wise Profit', desc: 'Sales and profit organized by Seller SKU' },
    { id: 'asin_profit', label: 'ASIN-wise Profit', desc: 'Performance categorized by Amazon ASIN' },
    { id: 'fees_report', label: 'Amazon Fees Report', desc: 'Detailed breakdown of Amazon referral and FBA commissions' },
    { id: 'returns_report', label: 'Returns & Refunds Report', desc: 'Deductions and refund impact analysis' },
    { id: 'pending_tx_report', label: 'Pending Transactions Report', desc: 'Orders missing transaction settlement' },
    { id: 'pending_ho_report', label: 'Pending Handover Report', desc: 'Orders missing carrier dispatch record' },
  ];

  // Daily profit grouped data
  const dailyData = useMemo(() => {
    const map = new Map<string, { date: string; orders: number; sales: number; fees: number; cost: number; profit: number }>();
    orders.forEach(o => {
      const d = o.scan_date.split('T')[0];
      const entry = map.get(d) || { date: d, orders: 0, sales: 0, fees: 0, cost: 0, profit: 0 };
      entry.orders += 1;
      entry.sales += o.selling_amount;
      entry.fees += o.amazon_fees;
      entry.cost += o.purchase_cost;
      entry.profit += o.profit;
      map.set(d, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [orders]);

  // Monthly profit grouped data
  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; orders: number; sales: number; fees: number; cost: number; profit: number }>();
    orders.forEach(o => {
      const m = o.scan_date.substring(0, 7); // YYYY-MM
      const entry = map.get(m) || { month: m, orders: 0, sales: 0, fees: 0, cost: 0, profit: 0 };
      entry.orders += 1;
      entry.sales += o.selling_amount;
      entry.fees += o.amazon_fees;
      entry.cost += o.purchase_cost;
      entry.profit += o.profit;
      map.set(m, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [orders]);

  // SKU profit grouped data
  const skuData = useMemo(() => {
    const map = new Map<string, { sku: string; name: string; units: number; sales: number; fees: number; profit: number }>();
    orders.forEach(o => {
      const sku = o.sku || 'UNASSIGNED';
      const entry = map.get(sku) || { sku, name: o.product_name || 'N/A', units: 0, sales: 0, fees: 0, profit: 0 };
      entry.units += o.quantity || 1;
      entry.sales += o.selling_amount;
      entry.fees += o.amazon_fees;
      entry.profit += o.profit;
      map.set(sku, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.profit - a.profit);
  }, [orders]);

  // ASIN profit grouped data
  const asinData = useMemo(() => {
    const map = new Map<string, { asin: string; name: string; units: number; sales: number; fees: number; profit: number }>();
    orders.forEach(o => {
      const asin = o.asin || 'UNASSIGNED';
      const entry = map.get(asin) || { asin, name: o.product_name || 'N/A', units: 0, sales: 0, fees: 0, profit: 0 };
      entry.units += o.quantity || 1;
      entry.sales += o.selling_amount;
      entry.fees += o.amazon_fees;
      entry.profit += o.profit;
      map.set(asin, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.profit - a.profit);
  }, [orders]);

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const title = reportList.find(r => r.id === selectedReport)?.label || 'Amazon Report';
    if (format === 'csv') exportOrdersToCSV(orders, `${selectedReport}.csv`);
    if (format === 'excel') exportOrdersToExcel(orders, `${selectedReport}.xlsx`);
    if (format === 'pdf') exportOrdersToPDF(orders, title);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            Financial & Profit Reports
          </h2>
          <p className="text-xs text-slate-500">
            Export comprehensive Amazon Saudi Arabia profit, fee, and order analytics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('excel')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-200 shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-200 shadow-xs transition"
          >
            <Download className="w-4 h-4 text-sky-600" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-200 shadow-xs transition"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {reportList.map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedReport(r.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedReport === r.id
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Render Selected Report View */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {reportList.find(r => r.id === selectedReport)?.label}
          </h3>
          <p className="text-xs text-slate-500">
            {reportList.find(r => r.id === selectedReport)?.desc}
          </p>
        </div>

        {/* 1. Daily Profit Table */}
        {selectedReport === 'daily_profit' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-center">Orders</th>
                  <th className="py-2.5 px-3 text-right">Gross Sales</th>
                  <th className="py-2.5 px-3 text-right">Amazon Fees</th>
                  <th className="py-2.5 px-3 text-right">Product Cost</th>
                  <th className="py-2.5 px-3 text-right font-bold text-amber-700">Net Profit</th>
                  <th className="py-2.5 px-3 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {dailyData.map(d => {
                  const margin = d.sales > 0 ? ((d.profit / d.sales) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={d.date} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{d.date}</td>
                      <td className="py-3 px-3 text-center text-slate-700">{d.orders}</td>
                      <td className="py-3 px-3 text-right text-slate-900 font-semibold">SAR {d.sales.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-rose-600 font-semibold">-SAR {d.fees.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-amber-800 font-bold">SAR {d.cost.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-black text-emerald-700 text-sm">
                        SAR {d.profit.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500 font-medium">{margin}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. Monthly Profit Table */}
        {selectedReport === 'monthly_profit' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3 text-center">Orders</th>
                  <th className="py-2.5 px-3 text-right">Gross Sales</th>
                  <th className="py-2.5 px-3 text-right">Amazon Fees</th>
                  <th className="py-2.5 px-3 text-right">Product Cost</th>
                  <th className="py-2.5 px-3 text-right font-bold text-amber-700">Net Profit</th>
                  <th className="py-2.5 px-3 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {monthlyData.map(m => {
                  const margin = m.sales > 0 ? ((m.profit / m.sales) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={m.month} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{m.month}</td>
                      <td className="py-3 px-3 text-center text-slate-700">{m.orders}</td>
                      <td className="py-3 px-3 text-right text-slate-900 font-semibold">SAR {m.sales.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-rose-600 font-semibold">-SAR {m.fees.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-amber-800 font-bold">SAR {m.cost.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-black text-emerald-700 text-sm">
                        SAR {m.profit.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500 font-medium">{margin}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Product Profit */}
        {selectedReport === 'product_profit' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Total Sales</th>
                  <th className="py-2.5 px-3 text-right">Amazon Fees</th>
                  <th className="py-2.5 px-3 text-right font-bold text-amber-700">Total Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productsWithStats.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-900">{p.product_name}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-700">{p.unitsSold}</td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">SAR {p.totalSales.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono text-rose-600">-SAR {p.totalAmazonFees.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-700 text-sm">
                      SAR {p.totalProfit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. SKU Profit */}
        {selectedReport === 'sku_profit' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-3">Seller SKU</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Total Sales</th>
                  <th className="py-2.5 px-3 text-right font-bold text-amber-700">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {skuData.map(s => (
                  <tr key={s.sku} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-amber-800">{s.sku}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{s.name}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-900 font-bold">{s.units}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">SAR {s.sales.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">SAR {s.profit.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. ASIN Profit */}
        {selectedReport === 'asin_profit' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-3">ASIN</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Total Sales</th>
                  <th className="py-2.5 px-3 text-right font-bold text-amber-700">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {asinData.map(a => (
                  <tr key={a.asin} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-amber-800">{a.asin}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{a.name}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-900 font-bold">{a.units}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">SAR {a.sales.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">SAR {a.profit.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. Fees Report */}
        {selectedReport === 'fees_report' && (
          <div className="space-y-3">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs">
              <span className="font-semibold text-rose-900">Total Amazon Commission & FBA Fees Deducted:</span>
              <span className="font-mono font-bold text-rose-600 text-sm">
                -SAR {orders.reduce((sum, o) => sum + (o.amazon_fees || 0), 0).toFixed(2)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-mono text-[10px] uppercase">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-right">Sales Amount</th>
                    <th className="py-2.5 px-3 text-right text-rose-600">Amazon Fees</th>
                    <th className="py-2.5 px-3 text-right">Fee Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map(o => {
                    const ratio = o.selling_amount > 0 ? ((o.amazon_fees / o.selling_amount) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{o.order_id}</td>
                        <td className="py-3 px-3 text-slate-700">{o.product_name || 'N/A'}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">SAR {o.selling_amount.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono text-rose-600 font-bold">-SAR {o.amazon_fees.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500 font-medium">{ratio}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. Returns / Refunds */}
        {selectedReport === 'returns_report' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Deducted Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.filter(o => o.order_status === 'Refunded' || o.payment_status === 'REFUNDED').length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No refunds or returned orders recorded.
                    </td>
                  </tr>
                ) : (
                  orders
                    .filter(o => o.order_status === 'Refunded' || o.payment_status === 'REFUNDED')
                    .map(o => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{o.order_id}</td>
                        <td className="py-3 px-3 text-slate-700">{o.product_name || 'N/A'}</td>
                        <td className="py-3 px-3 text-rose-600 font-bold">{o.order_status}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                          -SAR {o.selling_amount.toFixed(2)}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 8. Pending Transactions */}
        {selectedReport === 'pending_tx_report' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-3">Scanned Order ID</th>
                  <th className="py-2.5 px-3">Tracking ID</th>
                  <th className="py-2.5 px-3">Scan Date</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.filter(o => o.transaction_status === 'PENDING').map(o => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{o.order_id}</td>
                    <td className="py-3 px-3 font-mono text-amber-800 font-bold">{o.tracking_id}</td>
                    <td className="py-3 px-3 text-slate-500">{new Date(o.scan_date).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-center text-amber-700 font-bold">Awaiting Transaction File</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 9. Pending Handover */}
        {selectedReport === 'pending_ho_report' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-3">Scanned Tracking ID</th>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Scan Date</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.filter(o => o.handover_status === 'PENDING').map(o => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-amber-800">{o.tracking_id}</td>
                    <td className="py-3 px-3 font-mono text-slate-900 font-bold">{o.order_id}</td>
                    <td className="py-3 px-3 text-slate-500">{new Date(o.scan_date).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-center text-orange-700 font-bold">Awaiting Handover PDF</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
