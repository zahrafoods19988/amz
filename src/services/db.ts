import {
  Order,
  ProductMaster,
  PurchaseCostHistory,
  TransactionRecord,
  HandoverRecord,
  ScannedLabelRecord,
  DashboardMetrics,
  DateFilterRange,
} from '../types';
import { cloudSync } from './cloudSyncService';

const STORAGE_KEYS = {
  ORDERS: 'aspt_orders_v1',
  PRODUCTS: 'aspt_products_v1',
  COST_HISTORY: 'aspt_cost_history_v1',
  TRANSACTIONS: 'aspt_transactions_v1',
  HANDOVERS: 'aspt_handovers_v1',
  SCANNED_LABELS: 'aspt_scanned_labels_v1',
  ACTIVE_USER: 'aspt_active_user_v1',
};

// Order ID pattern: XXX-XXXXXXX-XXXXXXX (e.g. 402-2652435-6373954)
export function isValidOrderId(orderId: string): boolean {
  if (!orderId) return false;
  const cleaned = orderId.trim();
  return /^\d{3}-\d{7}-\d{7}$/.test(cleaned);
}

// Tracking ID pattern: ASA followed by numbers (e.g. ASA1278249245)
export function isValidTrackingId(trackingId: string): boolean {
  if (!trackingId) return false;
  const cleaned = trackingId.trim();
  return /^ASA\d{8,16}$/i.test(cleaned);
}

export function normalizeProductName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Initial Seed Data containing the prompt's Acceptance Test order and sample orders
const SEED_PRODUCTS: ProductMaster[] = [
  {
    id: 'prod-horlicks-1kg',
    product_name: 'Horlicks Classic Malt 1kg',
    asin: 'B08F7QWXYZ',
    sku: 'HLK-MALT-1KG',
    barcode: '8901030784920',
    current_purchase_cost: 30.0,
    cost_effective_date: new Date(Date.now() - 30 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-nido-2500g',
    product_name: 'Nestle Nido FortiGrow Milk Powder 2.5kg',
    asin: 'B077Z8Q11L',
    sku: 'NID-FORTI-2500',
    barcode: '7613035349124',
    current_purchase_cost: 65.0,
    previous_purchase_cost: 60.0,
    cost_effective_date: new Date(Date.now() - 15 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-almarai-ghee',
    product_name: 'Almarai Pure Butter Ghee 800g',
    asin: 'B01MYXYZ12',
    sku: 'ALM-GHEE-800',
    barcode: '6281007010203',
    current_purchase_cost: 28.5,
    cost_effective_date: new Date(Date.now() - 40 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-abu-kass',
    product_name: 'Abu Kass Mazza Basmati Rice 5kg',
    asin: 'B00XYZ9921',
    sku: 'ABU-RICE-5KG',
    barcode: '6281045000109',
    current_purchase_cost: 35.0,
    cost_effective_date: new Date(Date.now() - 20 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SEED_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'tx-402-2652435-6373954',
    order_id: '402-2652435-6373954',
    transaction_id: 'TRX-SA-2026-9001',
    transaction_date: new Date(Date.now() - 2 * 86400000).toISOString(),
    product_name: 'Horlicks Classic Malt 1kg',
    sku: 'HLK-MALT-1KG',
    asin: 'B08F7QWXYZ',
    selling_amount: 61.0,
    amazon_fees: 21.84,
    net_amount: 39.16,
    refund_amount: 0,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'tx-403-8821940-1192843',
    order_id: '403-8821940-1192843',
    transaction_id: 'TRX-SA-2026-9002',
    transaction_date: new Date(Date.now() - 1 * 86400000).toISOString(),
    product_name: 'Nestle Nido FortiGrow Milk Powder 2.5kg',
    sku: 'NID-FORTI-2500',
    asin: 'B077Z8Q11L',
    selling_amount: 110.0,
    amazon_fees: 27.5,
    net_amount: 82.5,
    refund_amount: 0,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'tx-405-7719203-4412958',
    order_id: '405-7719203-4412958',
    transaction_id: 'TRX-SA-2026-9003',
    transaction_date: new Date().toISOString(),
    product_name: 'Almarai Pure Butter Ghee 800g',
    sku: 'ALM-GHEE-800',
    asin: 'B01MYXYZ12',
    selling_amount: 49.0,
    amazon_fees: 14.7,
    net_amount: 34.3,
    refund_amount: 0,
    created_at: new Date().toISOString(),
  },
];

const SEED_HANDOVERS: HandoverRecord[] = [
  {
    id: 'ho-ASA1278249245',
    tracking_id: 'ASA1278249245',
    shipment_id: 'FBA15K89YTT1',
    fba_shipment_id: 'FBA15K89YTT1',
    manifest_id: 'MNF-RUH-2026-041',
    carrier: 'Amazon Shipping (SPX)',
    handover_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    shipout_time: '14:30',
    total_packages: 18,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'ho-ASA9928172634',
    tracking_id: 'ASA9928172634',
    shipment_id: 'FBA15K89YTT2',
    manifest_id: 'MNF-RUH-2026-042',
    carrier: 'Amazon Shipping (SPX)',
    handover_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    shipout_time: '15:10',
    total_packages: 22,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

const SEED_ORDERS: Order[] = [
  // Acceptance Test Order: Fully matched
  {
    id: 'ord-402-2652435-6373954',
    order_id: '402-2652435-6373954',
    tracking_id: 'ASA1278249245',
    shipment_id: 'FBA15K89YTT1',
    product_id: 'prod-horlicks-1kg',
    product_name: 'Horlicks Classic Malt 1kg',
    sku: 'HLK-MALT-1KG',
    asin: 'B08F7QWXYZ',
    quantity: 1,
    scan_date: new Date(Date.now() - 2 * 86400000).toISOString(),
    transaction_status: 'MATCHED',
    handover_status: 'MATCHED',
    payment_status: 'COMPLETED',
    selling_amount: 61.0,
    amazon_fees: 21.84,
    net_revenue: 39.16,
    purchase_cost: 30.0,
    additional_cost: 0.0,
    profit: 9.16,
    profit_margin: 15.02,
    order_status: 'Completed',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  // Nido order: Handover pending demonstration
  {
    id: 'ord-403-8821940-1192843',
    order_id: '403-8821940-1192843',
    tracking_id: 'ASA9928172634',
    shipment_id: 'FBA15K89YTT2',
    product_id: 'prod-nido-2500g',
    product_name: 'Nestle Nido FortiGrow Milk Powder 2.5kg',
    sku: 'NID-FORTI-2500',
    asin: 'B077Z8Q11L',
    quantity: 1,
    scan_date: new Date(Date.now() - 1 * 86400000).toISOString(),
    transaction_status: 'MATCHED',
    handover_status: 'MATCHED',
    payment_status: 'COMPLETED',
    selling_amount: 110.0,
    amazon_fees: 27.5,
    net_revenue: 82.5,
    purchase_cost: 65.0,
    additional_cost: 2.0,
    profit: 15.5,
    profit_margin: 14.09,
    order_status: 'Completed',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  // Scanned label order: Transaction Pending demonstration
  {
    id: 'ord-406-9921445-5521990',
    order_id: '406-9921445-5521990',
    tracking_id: 'ASA5544332211',
    quantity: 1,
    scan_date: new Date().toISOString(),
    transaction_status: 'PENDING',
    handover_status: 'PENDING',
    payment_status: 'PENDING',
    selling_amount: 0,
    amazon_fees: 0,
    net_revenue: 0,
    purchase_cost: 0,
    additional_cost: 0,
    profit: 0,
    profit_margin: 0,
    order_status: 'Pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

class DatabaseService {
  private currentUserId: string | null = null;

  public setUserId(userId: string | null) {
    this.currentUserId = userId;
    cloudSync.setUserId(userId);
    if (userId) {
      const userKey = this.getKey(STORAGE_KEYS.ORDERS);
      if (!localStorage.getItem(userKey)) {
        // If brand new user with no scoped data, check if we need to seed or leave clean
        // We initialize empty arrays so user has completely isolated data
        this.setStorage(STORAGE_KEYS.ORDERS, []);
        this.setStorage(STORAGE_KEYS.PRODUCTS, []);
        this.setStorage(STORAGE_KEYS.TRANSACTIONS, []);
        this.setStorage(STORAGE_KEYS.HANDOVERS, []);
        this.setStorage(STORAGE_KEYS.COST_HISTORY, []);
        this.setStorage(STORAGE_KEYS.SCANNED_LABELS, []);
      }
    }
  }

  public getUserId(): string | null {
    return this.currentUserId;
  }

  private getKey(baseKey: string): string {
    if (this.currentUserId) {
      return `${baseKey}_${this.currentUserId}`;
    }
    return baseKey;
  }

  private getStorage<T>(key: string, defaultVal: T): T {
    try {
      const scopedKey = this.getKey(key);
      const data = localStorage.getItem(scopedKey);
      if (!data) return defaultVal;
      return JSON.parse(data);
    } catch {
      return defaultVal;
    }
  }

  private setStorage<T>(key: string, val: T): void {
    try {
      const scopedKey = this.getKey(key);
      localStorage.setItem(scopedKey, JSON.stringify(val));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }

  constructor() {
    this.init();
  }

  public init(reset: boolean = false) {
    const key = this.getKey(STORAGE_KEYS.ORDERS);
    if (reset || !localStorage.getItem(key)) {
      this.setStorage(STORAGE_KEYS.ORDERS, this.currentUserId ? [] : SEED_ORDERS);
      this.setStorage(STORAGE_KEYS.PRODUCTS, this.currentUserId ? [] : SEED_PRODUCTS);
      this.setStorage(STORAGE_KEYS.TRANSACTIONS, this.currentUserId ? [] : SEED_TRANSACTIONS);
      this.setStorage(STORAGE_KEYS.HANDOVERS, this.currentUserId ? [] : SEED_HANDOVERS);
      this.setStorage(STORAGE_KEYS.COST_HISTORY, this.currentUserId ? [] : [
        {
          id: 'ch-1',
          product_id: 'prod-horlicks-1kg',
          purchase_cost: 30.0,
          effective_date: new Date(Date.now() - 30 * 86400000).toISOString(),
          created_at: new Date().toISOString(),
        },
      ]);
      this.setStorage(STORAGE_KEYS.SCANNED_LABELS, this.currentUserId ? [] : [
        {
          id: 'lbl-1',
          order_id: '402-2652435-6373954',
          tracking_id: 'ASA1278249245',
          scan_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
          scan_time: '14:22',
          ocr_confidence: 98,
          created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
      ]);
    }
  }

  // --- ORDERS ---
  public getOrders(): Order[] {
    return this.getStorage<Order[]>(STORAGE_KEYS.ORDERS, []);
  }

  public getOrderById(id: string): Order | undefined {
    return this.getOrders().find(o => o.id === id || o.order_id === id);
  }

  public findOrderByOrderOrTracking(orderId: string, trackingId?: string): Order | undefined {
    const orders = this.getOrders();
    return orders.find(
      o => o.order_id.trim() === orderId.trim() || (trackingId && o.tracking_id.trim() === trackingId.trim())
    );
  }

  public saveOrder(order: Order): void {
    if (this.currentUserId) {
      order.user_id = this.currentUserId;
    }
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.id === order.id || o.order_id === order.order_id);
    if (index >= 0) {
      orders[index] = { ...order, updated_at: new Date().toISOString() };
    } else {
      orders.unshift({ ...order, updated_at: new Date().toISOString() });
    }
    this.setStorage(STORAGE_KEYS.ORDERS, orders);

    if (this.currentUserId) {
      cloudSync.enqueue({
        user_id: this.currentUserId,
        table_name: 'orders',
        action: 'UPSERT',
        payload: order,
      });
    }
  }

  public deleteOrder(id: string): void {
    const orders = this.getOrders().filter(o => o.id !== id && o.order_id !== id);
    this.setStorage(STORAGE_KEYS.ORDERS, orders);

    if (this.currentUserId) {
      cloudSync.enqueue({
        user_id: this.currentUserId,
        table_name: 'orders',
        action: 'DELETE',
        payload: { id },
      });
    }
  }

  public deleteOrdersBulk(ids: string[]): number {
    if (!ids || ids.length === 0) return 0;
    const idSet = new Set(ids);
    const prevOrders = this.getOrders();
    const toDelete = prevOrders.filter(o => idSet.has(o.id) || idSet.has(o.order_id));
    const remaining = prevOrders.filter(o => !idSet.has(o.id) && !idSet.has(o.order_id));
    const deletedCount = prevOrders.length - remaining.length;
    this.setStorage(STORAGE_KEYS.ORDERS, remaining);

    if (this.currentUserId) {
      toDelete.forEach(o => {
        cloudSync.enqueue({
          user_id: this.currentUserId!,
          table_name: 'orders',
          action: 'DELETE',
          payload: { id: o.id },
        });
      });
    }

    return deletedCount;
  }

  public clearAllOrders(): void {
    const prevOrders = this.getOrders();
    this.setStorage(STORAGE_KEYS.ORDERS, []);

    if (this.currentUserId) {
      prevOrders.forEach(o => {
        cloudSync.enqueue({
          user_id: this.currentUserId!,
          table_name: 'orders',
          action: 'DELETE',
          payload: { id: o.id },
        });
      });
    }
  }

  public deleteUnmatchedOrders(): number {
    const prev = this.getOrders();
    const toDelete = prev.filter(o => !(o.transaction_status === 'MATCHED' && o.handover_status === 'MATCHED'));
    const remaining = prev.filter(o => o.transaction_status === 'MATCHED' && o.handover_status === 'MATCHED');
    const count = prev.length - remaining.length;
    this.setStorage(STORAGE_KEYS.ORDERS, remaining);

    if (this.currentUserId) {
      toDelete.forEach(o => {
        cloudSync.enqueue({
          user_id: this.currentUserId!,
          table_name: 'orders',
          action: 'DELETE',
          payload: { id: o.id },
        });
      });
    }

    return count;
  }

  // --- PRODUCTS & PURCHASE COST ---
  public getProducts(): ProductMaster[] {
    return this.getStorage<ProductMaster[]>(STORAGE_KEYS.PRODUCTS, []);
  }

  public findProduct(identifier: { asin?: string; sku?: string; barcode?: string; name?: string }): ProductMaster | undefined {
    const products = this.getProducts();
    if (identifier.asin) {
      const match = products.find(p => p.asin && p.asin.toLowerCase() === identifier.asin!.toLowerCase());
      if (match) return match;
    }
    if (identifier.sku) {
      const match = products.find(p => p.sku && p.sku.toLowerCase() === identifier.sku!.toLowerCase());
      if (match) return match;
    }
    if (identifier.barcode) {
      const match = products.find(p => p.barcode && p.barcode === identifier.barcode);
      if (match) return match;
    }
    if (identifier.name) {
      const norm = normalizeProductName(identifier.name);
      const match = products.find(p => normalizeProductName(p.product_name) === norm);
      if (match) return match;
    }
    return undefined;
  }

  public getOrCreateProduct(data: {
    product_name: string;
    asin?: string;
    sku?: string;
    barcode?: string;
    purchase_cost?: number;
  }): { product: ProductMaster; isNew: boolean } {
    const existing = this.findProduct({
      asin: data.asin,
      sku: data.sku,
      barcode: data.barcode,
      name: data.product_name,
    });

    if (existing) {
      // Update missing identifiers if available
      let updated = false;
      if (!existing.asin && data.asin) { existing.asin = data.asin; updated = true; }
      if (!existing.sku && data.sku) { existing.sku = data.sku; updated = true; }
      if (!existing.barcode && data.barcode) { existing.barcode = data.barcode; updated = true; }
      if (updated) {
        this.updateProduct(existing);
      }
      return { product: existing, isNew: false };
    }

    const newProduct: ProductMaster = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      user_id: this.currentUserId || undefined,
      product_name: data.product_name,
      asin: data.asin,
      sku: data.sku,
      barcode: data.barcode,
      current_purchase_cost: data.purchase_cost ?? 0,
      cost_effective_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const products = this.getProducts();
    products.push(newProduct);
    this.setStorage(STORAGE_KEYS.PRODUCTS, products);

    if (this.currentUserId) {
      cloudSync.enqueue({
        user_id: this.currentUserId,
        table_name: 'products',
        action: 'UPSERT',
        payload: newProduct,
      });
    }

    if (data.purchase_cost !== undefined && data.purchase_cost > 0) {
      this.recordCostHistory(newProduct.id, data.purchase_cost);
    }

    return { product: newProduct, isNew: true };
  }

  public updateProductCost(productId: string, newCost: number): ProductMaster | undefined {
    const products = this.getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return undefined;

    const oldCost = product.current_purchase_cost;
    product.previous_purchase_cost = oldCost;
    product.current_purchase_cost = newCost;
    product.cost_effective_date = new Date().toISOString();
    product.updated_at = new Date().toISOString();
    if (this.currentUserId) {
      product.user_id = this.currentUserId;
    }

    this.setStorage(STORAGE_KEYS.PRODUCTS, products);
    this.recordCostHistory(productId, newCost);

    if (this.currentUserId) {
      cloudSync.enqueue({
        user_id: this.currentUserId,
        table_name: 'products',
        action: 'UPSERT',
        payload: product,
      });
    }

    // Apply to pending orders or orders created after effective date without purchase cost
    this.applyCostToOrdersWithoutCost(productId, newCost);

    return product;
  }

  public updateProduct(product: ProductMaster): void {
    const products = this.getProducts();
    const idx = products.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      if (this.currentUserId) {
        product.user_id = this.currentUserId;
      }
      products[idx] = { ...product, updated_at: new Date().toISOString() };
      this.setStorage(STORAGE_KEYS.PRODUCTS, products);

      if (this.currentUserId) {
        cloudSync.enqueue({
          user_id: this.currentUserId,
          table_name: 'products',
          action: 'UPSERT',
          payload: products[idx],
        });
      }
    }
  }

  public deleteProduct(id: string): void {
    const products = this.getProducts().filter(p => p.id !== id);
    this.setStorage(STORAGE_KEYS.PRODUCTS, products);

    if (this.currentUserId) {
      cloudSync.enqueue({
        user_id: this.currentUserId,
        table_name: 'products',
        action: 'DELETE',
        payload: { id },
      });
    }
  }

  public deleteProductsBulk(ids: string[]): number {
    if (!ids || ids.length === 0) return 0;
    const idSet = new Set(ids);
    const prev = this.getProducts();
    const toDelete = prev.filter(p => idSet.has(p.id));
    const remaining = prev.filter(p => !idSet.has(p.id));
    const deletedCount = prev.length - remaining.length;
    this.setStorage(STORAGE_KEYS.PRODUCTS, remaining);

    if (this.currentUserId) {
      toDelete.forEach(p => {
        cloudSync.enqueue({
          user_id: this.currentUserId!,
          table_name: 'products',
          action: 'DELETE',
          payload: { id: p.id },
        });
      });
    }

    return deletedCount;
  }

  public clearAllProducts(): number {
    const prev = this.getProducts();
    const count = prev.length;
    this.setStorage(STORAGE_KEYS.PRODUCTS, []);

    if (this.currentUserId) {
      prev.forEach(p => {
        cloudSync.enqueue({
          user_id: this.currentUserId!,
          table_name: 'products',
          action: 'DELETE',
          payload: { id: p.id },
        });
      });
    }

    return count;
  }

  public recordCostHistory(productId: string, cost: number): void {
    const history = this.getStorage<PurchaseCostHistory[]>(STORAGE_KEYS.COST_HISTORY, []);
    const entry: PurchaseCostHistory = {
      id: `ch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: this.currentUserId || undefined,
      product_id: productId,
      purchase_cost: cost,
      effective_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    history.push(entry);
    this.setStorage(STORAGE_KEYS.COST_HISTORY, history);

    if (this.currentUserId) {
      cloudSync.enqueue({
        user_id: this.currentUserId,
        table_name: 'purchase_cost_history',
        action: 'UPSERT',
        payload: entry,
      });
    }
  }

  public getCostHistory(productId: string): PurchaseCostHistory[] {
    const history = this.getStorage<PurchaseCostHistory[]>(STORAGE_KEYS.COST_HISTORY, []);
    return history.filter(h => h.product_id === productId);
  }

  // Updates orders for this product where purchase cost was 0 or unassigned
  private applyCostToOrdersWithoutCost(productId: string, cost: number): void {
    const orders = this.getOrders();
    let changed = false;
    orders.forEach(o => {
      if (o.product_id === productId && (o.purchase_cost === 0 || o.purchase_cost === undefined)) {
        o.purchase_cost = cost;
        this.recalculateOrderFinancials(o);
        changed = true;
      }
    });
    if (changed) {
      this.setStorage(STORAGE_KEYS.ORDERS, orders);
    }
  }

  // Recalculates net revenue, profit, margin
  public recalculateOrderFinancials(order: Order): void {
    order.net_revenue = Number((order.selling_amount - order.amazon_fees).toFixed(2));
    const addCost = order.additional_cost || 0;
    const cost = order.purchase_cost || 0;
    
    // If order was refunded, net revenue is adjusted or 0
    if (order.order_status === 'Refunded') {
      order.profit = Number((0 - cost - addCost).toFixed(2));
      order.profit_margin = 0;
    } else {
      order.profit = Number((order.net_revenue - cost - addCost).toFixed(2));
      order.profit_margin =
        order.selling_amount > 0
          ? Number(((order.profit / order.selling_amount) * 100).toFixed(2))
          : 0;
    }
  }

  // --- TRANSACTIONS ---
  public getTransactions(): TransactionRecord[] {
    return this.getStorage<TransactionRecord[]>(STORAGE_KEYS.TRANSACTIONS, []);
  }

  public saveTransactions(newRecords: TransactionRecord[]): { added: number; duplicates: number } {
    const existing = this.getTransactions();
    const existingIds = new Set(existing.map(t => t.transaction_id || `${t.order_id}-${t.transaction_date}`));
    const toAdd: TransactionRecord[] = [];
    let duplicates = 0;

    for (const rec of newRecords) {
      const key = rec.transaction_id || `${rec.order_id}-${rec.transaction_date}`;
      if (existingIds.has(key)) {
        duplicates++;
      } else {
        existingIds.add(key);
        toAdd.push(rec);
      }
    }

    if (toAdd.length > 0) {
      if (this.currentUserId) {
        toAdd.forEach(t => {
          t.user_id = this.currentUserId!;
          cloudSync.enqueue({
            user_id: this.currentUserId!,
            table_name: 'transactions',
            action: 'UPSERT',
            payload: t,
          });
        });
      }
      this.setStorage(STORAGE_KEYS.TRANSACTIONS, [...existing, ...toAdd]);
      this.matchAllPending();
    }

    return { added: toAdd.length, duplicates };
  }

  // --- HANDOVERS ---
  public getHandovers(): HandoverRecord[] {
    return this.getStorage<HandoverRecord[]>(STORAGE_KEYS.HANDOVERS, []);
  }

  public saveHandovers(newRecords: HandoverRecord[]): { added: number; duplicates: number } {
    const existing = this.getHandovers();
    const existingKeys = new Set(existing.map(h => `${h.tracking_id}-${h.manifest_id || ''}-${h.shipment_id || ''}`));
    const toAdd: HandoverRecord[] = [];
    let duplicates = 0;

    for (const rec of newRecords) {
      const key = `${rec.tracking_id}-${rec.manifest_id || ''}-${rec.shipment_id || ''}`;
      if (existingKeys.has(key)) {
        duplicates++;
      } else {
        existingKeys.add(key);
        toAdd.push(rec);
      }
    }

    if (toAdd.length > 0) {
      if (this.currentUserId) {
        toAdd.forEach(h => {
          h.user_id = this.currentUserId!;
          cloudSync.enqueue({
            user_id: this.currentUserId!,
            table_name: 'handover_records',
            action: 'UPSERT',
            payload: h,
          });
        });
      }
      this.setStorage(STORAGE_KEYS.HANDOVERS, [...existing, ...toAdd]);
      this.matchAllPending();
    }

    return { added: toAdd.length, duplicates };
  }

  // --- SCANNED LABELS ---
  public getScannedLabels(): ScannedLabelRecord[] {
    return this.getStorage<ScannedLabelRecord[]>(STORAGE_KEYS.SCANNED_LABELS, []);
  }

  public recordLabelScan(orderId: string, trackingId: string, confidence: number = 98): {
    status: 'created' | 'already_exists';
    order: Order;
  } {
    const existingOrder = this.findOrderByOrderOrTracking(orderId, trackingId);
    if (existingOrder) {
      return { status: 'already_exists', order: existingOrder };
    }

    // Save label scan log
    const scans = this.getScannedLabels();
    const now = new Date();
    scans.push({
      id: `scan-${Date.now()}`,
      order_id: orderId,
      tracking_id: trackingId,
      scan_date: now.toISOString().split('T')[0],
      scan_time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ocr_confidence: confidence,
      created_at: now.toISOString(),
    });
    this.setStorage(STORAGE_KEYS.SCANNED_LABELS, scans);

    // Create Order and trigger 3-way matching
    const newOrder: Order = {
      id: `ord-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      order_id: orderId,
      tracking_id: trackingId,
      quantity: 1,
      scan_date: now.toISOString(),
      transaction_status: 'PENDING',
      handover_status: 'PENDING',
      payment_status: 'PENDING',
      selling_amount: 0,
      amazon_fees: 0,
      net_revenue: 0,
      purchase_cost: 0,
      additional_cost: 0,
      profit: 0,
      profit_margin: 0,
      order_status: 'Pending',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    // Attempt matching right away with existing transactions and handovers
    this.matchSingleOrder(newOrder);

    this.saveOrder(newOrder);
    return { status: 'created', order: newOrder };
  }

  // --- THREE-WAY MATCHING ENGINE ---
  public matchSingleOrder(order: Order): boolean {
    let matchedSomething = false;
    const transactions = this.getTransactions();
    const handovers = this.getHandovers();

    // 1. Transaction matching: Order ID <=> Transaction Order ID
    const tx = transactions.find(t => t.order_id.trim() === order.order_id.trim());
    if (tx) {
      order.transaction_status = 'MATCHED';
      order.selling_amount = tx.selling_amount;
      order.amazon_fees = tx.amazon_fees;
      order.net_revenue = tx.net_amount || Number((tx.selling_amount - tx.amazon_fees).toFixed(2));
      order.payment_status = tx.refund_amount > 0 ? 'REFUNDED' : 'COMPLETED';
      order.order_status = tx.refund_amount > 0 ? 'Refunded' : 'Completed';
      if (tx.sku) order.sku = tx.sku;
      if (tx.asin) order.asin = tx.asin;

      // Product Master Resolution
      if (tx.product_name) {
        order.product_name = tx.product_name;
        const { product } = this.getOrCreateProduct({
          product_name: tx.product_name,
          asin: tx.asin,
          sku: tx.sku,
        });
        order.product_id = product.id;

        // Apply product purchase cost if known
        if (product.current_purchase_cost > 0) {
          order.purchase_cost = product.current_purchase_cost;
        }
      }
      matchedSomething = true;
    } else {
      order.transaction_status = 'PENDING';
    }

    // 2. Handover matching: Tracking ID <=> Handover Tracking ID
    const ho = handovers.find(h => h.tracking_id.trim().toUpperCase() === order.tracking_id.trim().toUpperCase());
    if (ho) {
      order.handover_status = 'MATCHED';
      if (ho.shipment_id) order.shipment_id = ho.shipment_id;
      matchedSomething = true;
    } else {
      order.handover_status = 'PENDING';
    }

    this.recalculateOrderFinancials(order);
    return matchedSomething;
  }

  public matchAllPending(): void {
    const orders = this.getOrders();
    let updated = false;
    orders.forEach(order => {
      const changed = this.matchSingleOrder(order);
      if (changed) updated = true;
    });
    if (updated) {
      this.setStorage(STORAGE_KEYS.ORDERS, orders);
    }
  }

  // --- METRICS & REPORTING ---
  public getFilteredOrders(range: DateFilterRange, customStart?: string, customEnd?: string): Order[] {
    const orders = this.getOrders();
    if (range === 'all') return orders;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const yesterdayEnd = todayStart - 1;

    return orders.filter(o => {
      const orderTime = new Date(o.scan_date).getTime();
      switch (range) {
        case 'today':
          return orderTime >= todayStart;
        case 'yesterday':
          return orderTime >= yesterdayStart && orderTime <= yesterdayEnd;
        case 'last7days':
          return orderTime >= now.getTime() - 7 * 86400000;
        case 'last30days':
          return orderTime >= now.getTime() - 30 * 86400000;
        case 'thisMonth': {
          const mStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          return orderTime >= mStart;
        }
        case 'previousMonth': {
          const pmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
          const pmEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).getTime();
          return orderTime >= pmStart && orderTime <= pmEnd;
        }
        case 'custom': {
          if (!customStart) return true;
          const cStart = new Date(customStart).getTime();
          const cEnd = customEnd ? new Date(customEnd + 'T23:59:59').getTime() : Date.now();
          return orderTime >= cStart && orderTime <= cEnd;
        }
        default:
          return true;
      }
    });
  }

  public getDashboardMetrics(range: DateFilterRange = 'all', customStart?: string, customEnd?: string): DashboardMetrics {
    const orders = this.getFilteredOrders(range, customStart, customEnd);

    let totalSales = 0;
    let amazonFees = 0;
    let netRevenue = 0;
    let totalPurchaseCost = 0;
    let additionalCost = 0;
    let totalProfit = 0;
    let returnsCount = 0;
    let refundsCount = 0;
    let transactionsPending = 0;
    let handoverPending = 0;
    let fullyMatchedOrders = 0;
    let unmatchedOrders = 0;

    orders.forEach(o => {
      totalSales += o.selling_amount || 0;
      amazonFees += o.amazon_fees || 0;
      netRevenue += o.net_revenue || 0;
      totalPurchaseCost += o.purchase_cost || 0;
      additionalCost += o.additional_cost || 0;
      totalProfit += o.profit || 0;

      if (o.order_status === 'Returned') returnsCount++;
      if (o.order_status === 'Refunded' || o.payment_status === 'REFUNDED') refundsCount++;

      if (o.transaction_status === 'PENDING') transactionsPending++;
      if (o.handover_status === 'PENDING') handoverPending++;

      if (o.transaction_status === 'MATCHED' && o.handover_status === 'MATCHED') {
        fullyMatchedOrders++;
      } else {
        unmatchedOrders++;
      }
    });

    const profitMargin = totalSales > 0 ? Number(((totalProfit / totalSales) * 100).toFixed(2)) : 0;

    return {
      totalOrders: orders.length,
      totalSales: Number(totalSales.toFixed(2)),
      amazonFees: Number(amazonFees.toFixed(2)),
      netRevenue: Number(netRevenue.toFixed(2)),
      totalPurchaseCost: Number(totalPurchaseCost.toFixed(2)),
      additionalCost: Number(additionalCost.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      profitMargin,
      returnsCount,
      refundsCount,
      transactionsPending,
      handoverPending,
      unmatchedOrders,
      fullyMatchedOrders,
    };
  }

  // Product Master Aggregates
  public getProductMasterWithStats(): Array<
    ProductMaster & {
      unitsSold: number;
      totalSales: number;
      totalAmazonFees: number;
      totalNetRevenue: number;
      totalProfit: number;
      lastSoldDate?: string;
    }
  > {
    const products = this.getProducts();
    const orders = this.getOrders();

    return products.map(product => {
      const prodOrders = orders.filter(o => o.product_id === product.id || (product.sku && o.sku === product.sku));
      let unitsSold = 0;
      let totalSales = 0;
      let totalAmazonFees = 0;
      let totalNetRevenue = 0;
      let totalProfit = 0;
      let lastSoldDate: string | undefined = undefined;

      prodOrders.forEach(o => {
        unitsSold += o.quantity || 1;
        totalSales += o.selling_amount || 0;
        totalAmazonFees += o.amazon_fees || 0;
        totalNetRevenue += o.net_revenue || 0;
        totalProfit += o.profit || 0;
        if (!lastSoldDate || new Date(o.scan_date) > new Date(lastSoldDate)) {
          lastSoldDate = o.scan_date;
        }
      });

      return {
        ...product,
        unitsSold,
        totalSales: Number(totalSales.toFixed(2)),
        totalAmazonFees: Number(totalAmazonFees.toFixed(2)),
        totalNetRevenue: Number(totalNetRevenue.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(2)),
        lastSoldDate,
      };
    });
  }

  // Export full DB as JSON (Filtered strictly to active user)
  public exportDatabaseJSON(): string {
    const data = {
      version: '2.0',
      user_id: this.currentUserId || 'local_user',
      exported_at: new Date().toISOString(),
      orders: this.getOrders(),
      products: this.getProducts(),
      transactions: this.getTransactions(),
      handovers: this.getHandovers(),
      scanned_labels: this.getScannedLabels(),
      cost_history: this.getStorage(STORAGE_KEYS.COST_HISTORY, []),
    };
    return JSON.stringify(data, null, 2);
  }

  // Restore DB from JSON (Imported strictly into active user's account)
  public importDatabaseJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.orders)) {
        data.orders.forEach((o: Order) => {
          if (this.currentUserId) o.user_id = this.currentUserId;
          this.saveOrder(o);
        });
      }
      if (Array.isArray(data.products)) {
        data.products.forEach((p: ProductMaster) => {
          if (this.currentUserId) p.user_id = this.currentUserId;
          this.updateProduct(p);
        });
      }
      if (Array.isArray(data.transactions)) {
        this.saveTransactions(data.transactions);
      }
      if (Array.isArray(data.handovers)) {
        this.saveHandovers(data.handovers);
      }
      if (Array.isArray(data.scanned_labels)) {
        this.setStorage(STORAGE_KEYS.SCANNED_LABELS, data.scanned_labels);
      }
      if (Array.isArray(data.cost_history)) {
        data.cost_history.forEach((ch: PurchaseCostHistory) => {
          if (this.currentUserId) ch.user_id = this.currentUserId;
          this.recordCostHistory(ch.product_id, ch.purchase_cost);
        });
      }
      return true;
    } catch (e) {
      console.error('Failed to import database:', e);
      return false;
    }
  }

  // --- CLOUD SYNC & MULTI-DEVICE RECONCILIATION ---
  public pullCloudUpdates(cloudData: {
    orders?: Order[];
    products?: ProductMaster[];
    costHistory?: PurchaseCostHistory[];
    transactions?: TransactionRecord[];
    handovers?: HandoverRecord[];
  }) {
    if (!this.currentUserId) return;

    if (cloudData.orders && Array.isArray(cloudData.orders)) {
      const currentOrders = this.getOrders();
      const orderMap = new Map<string, Order>();
      // Put existing local
      currentOrders.forEach(o => orderMap.set(o.id || o.order_id, o));
      // Overwrite/insert with latest cloud records
      cloudData.orders.forEach(o => orderMap.set(o.id || o.order_id, o));
      this.setStorage(STORAGE_KEYS.ORDERS, Array.from(orderMap.values()));
    }

    if (cloudData.products && Array.isArray(cloudData.products)) {
      const currentProducts = this.getProducts();
      const prodMap = new Map<string, ProductMaster>();
      currentProducts.forEach(p => prodMap.set(p.id, p));
      cloudData.products.forEach(p => prodMap.set(p.id, p));
      this.setStorage(STORAGE_KEYS.PRODUCTS, Array.from(prodMap.values()));
    }

    if (cloudData.costHistory && Array.isArray(cloudData.costHistory)) {
      const current = this.getStorage<PurchaseCostHistory[]>(STORAGE_KEYS.COST_HISTORY, []);
      const chMap = new Map<string, PurchaseCostHistory>();
      current.forEach(c => chMap.set(c.id, c));
      cloudData.costHistory.forEach(c => chMap.set(c.id, c));
      this.setStorage(STORAGE_KEYS.COST_HISTORY, Array.from(chMap.values()));
    }

    if (cloudData.transactions && Array.isArray(cloudData.transactions)) {
      const current = this.getTransactions();
      const txMap = new Map<string, TransactionRecord>();
      current.forEach(t => txMap.set(t.id || t.order_id, t));
      cloudData.transactions.forEach(t => txMap.set(t.id || t.order_id, t));
      this.setStorage(STORAGE_KEYS.TRANSACTIONS, Array.from(txMap.values()));
    }

    if (cloudData.handovers && Array.isArray(cloudData.handovers)) {
      const current = this.getHandovers();
      const hoMap = new Map<string, HandoverRecord>();
      current.forEach(h => hoMap.set(h.id || h.tracking_id, h));
      cloudData.handovers.forEach(h => hoMap.set(h.id || h.tracking_id, h));
      this.setStorage(STORAGE_KEYS.HANDOVERS, Array.from(hoMap.values()));
    }

    this.matchAllPending();
  }

  // --- LOCAL STORAGE MIGRATION CHECK & EXECUTION ---
  public hasLegacyLocalStorageData(): boolean {
    if (!this.currentUserId) return false;
    const migratedKey = `aspt_migrated_${this.currentUserId}`;
    if (localStorage.getItem(migratedKey)) return false;

    try {
      const rawOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (!rawOrders) return false;
      const orders = JSON.parse(rawOrders);
      return Array.isArray(orders) && orders.length > 0;
    } catch {
      return false;
    }
  }

  public migrateLegacyDataToUser(userId: string): { ordersCount: number; productsCount: number } {
    try {
      const rawOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const rawProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const rawTx = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const rawHo = localStorage.getItem(STORAGE_KEYS.HANDOVERS);
      const rawCh = localStorage.getItem(STORAGE_KEYS.COST_HISTORY);

      const legacyOrders: Order[] = rawOrders ? JSON.parse(rawOrders) : [];
      const legacyProducts: ProductMaster[] = rawProducts ? JSON.parse(rawProducts) : [];
      const legacyTx: TransactionRecord[] = rawTx ? JSON.parse(rawTx) : [];
      const legacyHo: HandoverRecord[] = rawHo ? JSON.parse(rawHo) : [];
      const legacyCh: PurchaseCostHistory[] = rawCh ? JSON.parse(rawCh) : [];

      let ordersCount = 0;
      let productsCount = 0;

      // Migrate products
      legacyProducts.forEach(p => {
        p.user_id = userId;
        this.updateProduct(p);
        productsCount++;
      });

      // Migrate transactions & handovers
      if (legacyTx.length > 0) this.saveTransactions(legacyTx);
      if (legacyHo.length > 0) this.saveHandovers(legacyHo);

      // Migrate orders
      legacyOrders.forEach(o => {
        o.user_id = userId;
        this.saveOrder(o);
        ordersCount++;
      });

      // Migrate cost history
      legacyCh.forEach(ch => {
        this.recordCostHistory(ch.product_id, ch.purchase_cost);
      });

      // Mark migrated so prompt does not reappear
      localStorage.setItem(`aspt_migrated_${userId}`, 'true');

      return { ordersCount, productsCount };
    } catch (e) {
      console.error('Migration error:', e);
      return { ordersCount: 0, productsCount: 0 };
    }
  }

  public dismissLegacyMigration(userId: string) {
    localStorage.setItem(`aspt_migrated_${userId}`, 'dismissed');
  }
}

export const db = new DatabaseService();
