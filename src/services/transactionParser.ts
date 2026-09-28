import * as XLSX from 'xlsx';
import { TransactionRecord } from '../types';

export interface ParseTransactionResult {
  records: TransactionRecord[];
  duplicates: number;
  totalParsed: number;
  errors: string[];
}

// Clean and normalize keys from spreadsheet headers
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function parseTransactionFile(file: File): Promise<ParseTransactionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          return resolve({ records: [], duplicates: 0, totalParsed: 0, errors: ['File is empty'] });
        }

        const workbook = XLSX.read(buffer, { type: 'array' });
        // Take the first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON array of objects
        const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          return resolve({ records: [], duplicates: 0, totalParsed: 0, errors: ['No tabular data found in file'] });
        }

        const records: TransactionRecord[] = [];
        const errors: string[] = [];

        rawRows.forEach((row, index) => {
          // Normalize row keys
          const normRow: Record<string, any> = {};
          Object.keys(row).forEach(k => {
            normRow[normalizeKey(k)] = row[k];
          });

          // Detect Order ID
          const orderIdCandidate =
            normRow['orderid'] ||
            normRow['amazonorderid'] ||
            normRow['orderidentification'] ||
            normRow['orders'] ||
            normRow['order'] ||
            '';

          const orderIdStr = String(orderIdCandidate).trim();

          // If no order ID or doesn't resemble Amazon format, check if row contains an order ID in any column
          let finalOrderId = '';
          const directMatch = orderIdStr.match(/\d{3}-\d{7}-\d{7}/);
          if (directMatch) {
            finalOrderId = directMatch[0];
          } else {
            // Check any column value
            for (const val of Object.values(row)) {
              const m = String(val).match(/\d{3}-\d{7}-\d{7}/);
              if (m) {
                finalOrderId = m[0];
                break;
              }
            }
          }

          if (!finalOrderId) {
            // Not a transaction row (maybe summary header)
            return;
          }

          // Transaction ID
          const txIdCandidate =
            normRow['transactionid'] ||
            normRow['settlementid'] ||
            normRow['id'] ||
            normRow['referenceid'] ||
            `TX-${finalOrderId}-${index}`;
          const transactionId = String(txIdCandidate).trim();

          // Transaction Date
          const dateCandidate =
            normRow['datetime'] ||
            normRow['date'] ||
            normRow['posteddate'] ||
            normRow['transactiondate'] ||
            normRow['posteddateandtime'] ||
            new Date().toISOString();
          let transactionDate = new Date().toISOString();
          if (dateCandidate) {
            const parsedD = new Date(dateCandidate);
            if (!isNaN(parsedD.getTime())) {
              transactionDate = parsedD.toISOString();
            }
          }

          // Product Title / Name
          const productName =
            normRow['productname'] ||
            normRow['productdetails'] ||
            normRow['title'] ||
            normRow['itemdescription'] ||
            normRow['description'] ||
            normRow['itemtitle'] ||
            'Amazon Product';

          // SKU & ASIN
          const sku = normRow['sku'] || normRow['sellersku'] || normRow['merchantsku'] || undefined;
          const asin = normRow['asin'] || undefined;

          // Selling amount / Product sales
          const salesVal =
            normRow['productsales'] ||
            normRow['sellingamount'] ||
            normRow['productsalesprice'] ||
            normRow['principalsales'] ||
            normRow['itemprice'] ||
            normRow['sales'] ||
            normRow['amount'] ||
            0;
          const sellingAmount = Math.abs(parseFloat(String(salesVal).replace(/[^0-9.-]/g, '')) || 0);

          // Amazon fees (usually negative in Amazon reports, so take absolute)
          const feesVal =
            normRow['amazonfees'] ||
            normRow['sellingfees'] ||
            normRow['fbafoundationfees'] ||
            normRow['totalfees'] ||
            normRow['fees'] ||
            normRow['commission'] ||
            0;
          const amazonFees = Math.abs(parseFloat(String(feesVal).replace(/[^0-9.-]/g, '')) || 0);

          // Net amount
          const netVal = normRow['netamount'] || normRow['net'] || normRow['total'] || normRow['transferamount'];
          let netAmount = parseFloat(String(netVal).replace(/[^0-9.-]/g, '')) || 0;
          if (netAmount === 0 && sellingAmount > 0) {
            netAmount = Number((sellingAmount - amazonFees).toFixed(2));
          }

          // Refund amount
          const refundVal = normRow['refundamount'] || normRow['refundedamount'] || normRow['refund'] || 0;
          const refundAmount = Math.abs(parseFloat(String(refundVal).replace(/[^0-9.-]/g, '')) || 0);

          records.push({
            id: `tx-${finalOrderId}-${Date.now()}-${index}`,
            order_id: finalOrderId,
            transaction_id: transactionId,
            transaction_date: transactionDate,
            product_name: String(productName).trim(),
            sku: sku ? String(sku).trim() : undefined,
            asin: asin ? String(asin).trim() : undefined,
            selling_amount: sellingAmount,
            amazon_fees: amazonFees,
            net_amount: netAmount,
            refund_amount: refundAmount,
            raw_data: row,
            created_at: new Date().toISOString(),
          });
        });

        resolve({
          records,
          duplicates: 0,
          totalParsed: records.length,
          errors,
        });
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to parse Excel/CSV file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// Generate downloadable sample Amazon Transaction CSV
export function generateSampleTransactionCSV(): string {
  const headers = [
    'Date/Time',
    'Settlement ID',
    'Type',
    'Order ID',
    'SKU',
    'Description',
    'Quantity',
    'Marketplace',
    'Product Sales (SAR)',
    'Amazon Selling Fees (SAR)',
    'Other Transaction Fees (SAR)',
    'Total (SAR)',
  ];

  const rows = [
    [
      new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      'TRX-SA-2026-9001',
      'Order Payment',
      '402-2652435-6373954',
      'HLK-MALT-1KG',
      'Horlicks Classic Malt 1kg',
      '1',
      'amazon.sa',
      '61.00',
      '-21.84',
      '0.00',
      '39.16',
    ],
    [
      new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
      'TRX-SA-2026-9002',
      'Order Payment',
      '403-8821940-1192843',
      'NID-FORTI-2500',
      'Nestle Nido FortiGrow Milk Powder 2.5kg',
      '1',
      'amazon.sa',
      '110.00',
      '-27.50',
      '0.00',
      '82.50',
    ],
    [
      new Date().toISOString().split('T')[0],
      'TRX-SA-2026-9003',
      'Order Payment',
      '405-7719203-4412958',
      'ALM-GHEE-800',
      'Almarai Pure Butter Ghee 800g',
      '1',
      'amazon.sa',
      '49.00',
      '-14.70',
      '0.00',
      '34.30',
    ],
    [
      new Date().toISOString().split('T')[0],
      'TRX-SA-2026-9004',
      'Order Payment',
      '407-1123456-7890123',
      'ABU-RICE-5KG',
      'Abu Kass Mazza Basmati Rice 5kg',
      '1',
      'amazon.sa',
      '55.00',
      '-16.50',
      '0.00',
      '38.50',
    ],
  ];

  return [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
}
