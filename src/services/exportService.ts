import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order, ProductMaster } from '../types';

export function exportOrdersToCSV(orders: Order[], filename: string = 'amazon_orders.csv') {
  const worksheet = XLSX.utils.json_to_sheet(
    orders.map(o => ({
      'Order ID': o.order_id,
      'Tracking ID': o.tracking_id,
      'Product Name': o.product_name || 'N/A',
      'SKU': o.sku || 'N/A',
      'ASIN': o.asin || 'N/A',
      'Selling Amount (SAR)': o.selling_amount,
      'Amazon Fees (SAR)': o.amazon_fees,
      'Net Revenue (SAR)': o.net_revenue,
      'Purchase Cost (SAR)': o.purchase_cost,
      'Additional Cost (SAR)': o.additional_cost,
      'Profit (SAR)': o.profit,
      'Profit Margin (%)': `${o.profit_margin}%`,
      'Label Status': 'Matched',
      'Transaction Status': o.transaction_status,
      'Handover Status': o.handover_status,
      'Order Status': o.order_status,
      'Scan Date': o.scan_date.split('T')[0],
    }))
  );

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

export function exportOrdersToExcel(orders: Order[], filename: string = 'amazon_orders.xlsx') {
  const worksheet = XLSX.utils.json_to_sheet(
    orders.map(o => ({
      'Order ID': o.order_id,
      'Tracking ID': o.tracking_id,
      'Product Name': o.product_name || 'N/A',
      'SKU': o.sku || 'N/A',
      'ASIN': o.asin || 'N/A',
      'Selling Amount (SAR)': o.selling_amount,
      'Amazon Fees (SAR)': o.amazon_fees,
      'Net Revenue (SAR)': o.net_revenue,
      'Purchase Cost (SAR)': o.purchase_cost,
      'Additional Cost (SAR)': o.additional_cost,
      'Net Profit (SAR)': o.profit,
      'Profit Margin (%)': o.profit_margin,
      'Transaction Status': o.transaction_status,
      'Handover Status': o.handover_status,
      'Order Status': o.order_status,
      'Scan Date': o.scan_date.split('T')[0],
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename
  );
}

export function exportOrdersToPDF(orders: Order[], title: string = 'Amazon Saudi Orders & Profit Report') {
  const doc = new jsPDF('landscape');
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(9);
  doc.text(`Generated on: ${new Date().toLocaleString()} | Currency: SAR`, 14, 25);

  const tableData = orders.map(o => [
    o.order_id,
    o.tracking_id,
    (o.product_name || 'Pending').substring(0, 24),
    `SAR ${o.selling_amount.toFixed(2)}`,
    `SAR ${o.amazon_fees.toFixed(2)}`,
    `SAR ${o.net_revenue.toFixed(2)}`,
    `SAR ${o.purchase_cost.toFixed(2)}`,
    `SAR ${o.profit.toFixed(2)}`,
    `${o.profit_margin}%`,
    o.transaction_status === 'MATCHED' && o.handover_status === 'MATCHED' ? 'Fully Matched' : 'Pending',
  ]);

  autoTable(doc, {
    startY: 30,
    head: [
      [
        'Order ID',
        'Tracking ID',
        'Product',
        'Sales',
        'Fees',
        'Net Rev',
        'Cost',
        'Profit',
        'Margin',
        'Status',
      ],
    ],
    body: tableData,
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] }, // slate-800
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
}

export function exportProductsToExcel(products: (ProductMaster & { unitsSold: number; totalSales: number; totalProfit: number })[]) {
  const worksheet = XLSX.utils.json_to_sheet(
    products.map(p => ({
      'Product Name': p.product_name,
      'ASIN': p.asin || '',
      'SKU': p.sku || '',
      'Barcode': p.barcode || '',
      'Current Purchase Cost (SAR)': p.current_purchase_cost,
      'Previous Cost (SAR)': p.previous_purchase_cost || '',
      'Units Sold': p.unitsSold,
      'Total Sales (SAR)': p.totalSales,
      'Total Profit (SAR)': p.totalProfit,
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Product Master');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'product_master.xlsx'
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
