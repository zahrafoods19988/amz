import { supabase, isSupabaseConfigured } from './supabaseClient';
import { SyncStatus, PendingSyncItem, Order, ProductMaster, PurchaseCostHistory, TransactionRecord, HandoverRecord } from '../types';

type SyncListener = (status: SyncStatus, lastSynced: string | null) => void;

class CloudSyncService {
  private status: SyncStatus = 'SYNCED';
  private lastSynced: string | null = null;
  private listeners: SyncListener[] = [];
  private currentUserId: string | null = null;
  private realtimeChannel: any = null;
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.setStatus('SYNCING');
        this.flushPendingQueue();
      });
      window.addEventListener('offline', () => {
        this.setStatus('OFFLINE');
      });
      if (!navigator.onLine) {
        this.status = 'OFFLINE';
      }
    }
  }

  public getStatus(): SyncStatus {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'OFFLINE';
    }
    return this.status;
  }

  public getLastSyncedTime(): string | null {
    return this.lastSynced;
  }

  public onStatusChange(fn: SyncListener): () => void {
    this.listeners.push(fn);
    fn(this.getStatus(), this.lastSynced);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private setStatus(newStatus: SyncStatus) {
    this.status = newStatus;
    if (newStatus === 'SYNCED') {
      this.lastSynced = new Date().toLocaleTimeString();
    }
    this.notify();
  }

  private notify() {
    const current = this.getStatus();
    this.listeners.forEach(fn => fn(current, this.lastSynced));
  }

  public setUserId(userId: string | null) {
    if (this.currentUserId === userId) return;
    this.currentUserId = userId;
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }
  }

  private getQueueKey(userId: string): string {
    return `aspt_pending_queue_${userId}`;
  }

  public getPendingQueue(userId: string): PendingSyncItem[] {
    try {
      const raw = localStorage.getItem(this.getQueueKey(userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private setPendingQueue(userId: string, queue: PendingSyncItem[]) {
    try {
      localStorage.setItem(this.getQueueKey(userId), JSON.stringify(queue));
    } catch (e) {
      console.warn('Queue save error:', e);
    }
  }

  // Queue an operation when offline or for asynchronous sync
  public enqueue(item: Omit<PendingSyncItem, 'id' | 'created_at'>) {
    const userId = item.user_id;
    if (!userId) return;

    const fullItem: PendingSyncItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      created_at: new Date().toISOString(),
    };

    const queue = this.getPendingQueue(userId);
    queue.push(fullItem);
    this.setPendingQueue(userId, queue);

    if (navigator.onLine) {
      this.setStatus('PENDING SYNC');
      this.flushPendingQueue();
    } else {
      this.setStatus('OFFLINE');
    }
  }

  // Flush queued operations to Supabase
  public async flushPendingQueue(): Promise<void> {
    if (!this.currentUserId || this.isSyncing) return;
    if (!navigator.onLine) {
      this.setStatus('OFFLINE');
      return;
    }

    const userId = this.currentUserId;
    const queue = this.getPendingQueue(userId);
    if (queue.length === 0) {
      this.setStatus('SYNCED');
      return;
    }

    if (!isSupabaseConfigured() || !supabase) {
      // Offline / Simulated mode — mark processed
      this.setPendingQueue(userId, []);
      this.setStatus('SYNCED');
      return;
    }

    this.isSyncing = true;
    this.setStatus('SYNCING');

    try {
      const remaining: PendingSyncItem[] = [];

      for (const item of queue) {
        try {
          if (item.action === 'UPSERT') {
            const { error } = await supabase.from(item.table_name).upsert({
              ...item.payload,
              user_id: userId,
            });
            if (error) {
              console.warn(`Sync upsert error on ${item.table_name}:`, error);
              remaining.push(item);
            }
          } else if (item.action === 'DELETE') {
            const { error } = await supabase
              .from(item.table_name)
              .delete()
              .eq('id', item.payload.id)
              .eq('user_id', userId);
            if (error) {
              console.warn(`Sync delete error on ${item.table_name}:`, error);
              remaining.push(item);
            }
          }
        } catch (itemErr) {
          console.warn('Sync item exception:', itemErr);
          remaining.push(item);
        }
      }

      this.setPendingQueue(userId, remaining);

      if (remaining.length === 0) {
        this.setStatus('SYNCED');
      } else {
        this.setStatus('PENDING SYNC');
      }
    } catch (e) {
      console.warn('Flush error:', e);
      this.setStatus('SYNC ERROR');
    } finally {
      this.isSyncing = false;
    }
  }

  // Pull all cloud records for user to synchronize local cache
  public async pullAllFromCloud(userId: string): Promise<{
    orders?: Order[];
    products?: ProductMaster[];
    costHistory?: PurchaseCostHistory[];
    transactions?: TransactionRecord[];
    handovers?: HandoverRecord[];
  } | null> {
    if (!isSupabaseConfigured() || !supabase || !navigator.onLine) {
      return null;
    }

    this.setStatus('SYNCING');

    try {
      const [ordersRes, productsRes, costRes, txRes, hoRes] = await Promise.all([
        supabase.from('orders').select('*').eq('user_id', userId),
        supabase.from('products').select('*').eq('user_id', userId),
        supabase.from('purchase_cost_history').select('*').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('handover_records').select('*').eq('user_id', userId),
      ]);

      this.setStatus('SYNCED');

      return {
        orders: ordersRes.data || undefined,
        products: productsRes.data || undefined,
        costHistory: costRes.data || undefined,
        transactions: txRes.data || undefined,
        handovers: hoRes.data || undefined,
      };
    } catch (err) {
      console.warn('Cloud pull error:', err);
      this.setStatus('SYNC ERROR');
      return null;
    }
  }

  // Subscribe to real-time changes across all tables for multi-device sync
  public subscribeToRealtime(userId: string, onUpdate: () => void): () => void {
    if (!isSupabaseConfigured() || !supabase) {
      return () => {};
    }

    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }

    this.realtimeChannel = supabase
      .channel(`user-sync-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', filter: `user_id=eq.${userId}` },
        payload => {
          console.log('Realtime cloud update received:', payload);
          this.setStatus('SYNCING');
          setTimeout(() => {
            this.setStatus('SYNCED');
            onUpdate();
          }, 400);
        }
      )
      .subscribe();

    return () => {
      if (this.realtimeChannel) {
        this.realtimeChannel.unsubscribe();
        this.realtimeChannel = null;
      }
    };
  }
}

export const cloudSync = new CloudSyncService();
