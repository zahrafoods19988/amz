export type TransactionStatus = 'MATCHED' | 'PENDING' | 'ERROR';
export type HandoverStatus = 'MATCHED' | 'PENDING' | 'ERROR';
export type PaymentStatus = 'COMPLETED' | 'PENDING' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type OrderStatus = 'Completed' | 'Pending' | 'Returned' | 'Refunded' | 'Partially Refunded';

export interface Order {
  id: string;
  order_id: string; // e.g. 402-2652435-6373954
  tracking_id: string; // e.g. ASA1278249245
  shipment_id?: string;
  product_id?: string;
  product_name?: string;
  sku?: string;
  asin?: string;
  quantity: number;
  scan_date: string; // ISO date string
  transaction_status: TransactionStatus;
  handover_status: HandoverStatus;
  payment_status: PaymentStatus;
  selling_amount: number; // in SAR
  amazon_fees: number; // in SAR
  net_revenue: number; // in SAR (selling_amount - amazon_fees)
  purchase_cost: number; // in SAR
  additional_cost: number; // packaging, transport, etc. in SAR
  profit: number; // net_revenue - purchase_cost - additional_cost
  profit_margin: number; // percentage (profit / selling_amount) * 100
  order_status: OrderStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductMaster {
  id: string;
  product_name: string;
  asin?: string;
  sku?: string;
  barcode?: string;
  current_purchase_cost: number; // in SAR
  previous_purchase_cost?: number; // in SAR
  cost_effective_date: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseCostHistory {
  id: string;
  product_id: string;
  purchase_cost: number;
  effective_date: string;
  created_at: string;
}

export interface TransactionRecord {
  id: string;
  order_id: string;
  transaction_id: string;
  transaction_date: string;
  product_name: string;
  sku?: string;
  asin?: string;
  selling_amount: number;
  amazon_fees: number;
  net_amount: number;
  refund_amount: number;
  raw_data?: Record<string, any>;
  created_at: string;
}

export interface HandoverRecord {
  id: string;
  tracking_id: string;
  shipment_id?: string;
  fba_shipment_id?: string;
  manifest_id?: string;
  carrier?: string;
  handover_date: string;
  shipout_time?: string;
  total_packages?: number;
  raw_data?: Record<string, any>;
  created_at: string;
}

export interface ScannedLabelRecord {
  id: string;
  order_id: string;
  tracking_id: string;
  scan_date: string;
  scan_time: string;
  ocr_confidence: number;
  created_at: string;
}

export interface DashboardMetrics {
  totalOrders: number;
  totalSales: number;
  amazonFees: number;
  netRevenue: number;
  totalPurchaseCost: number;
  additionalCost: number;
  totalProfit: number;
  profitMargin: number;
  returnsCount: number;
  refundsCount: number;
  transactionsPending: number;
  handoverPending: number;
  unmatchedOrders: number;
  fullyMatchedOrders: number;
}

export type DateFilterRange =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'previousMonth'
  | 'custom'
  | 'all';
