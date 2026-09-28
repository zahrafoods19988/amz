import React, { useState, useEffect, useCallback } from 'react';
import { db } from './services/db';
import { Order, ProductMaster, DateFilterRange } from './types';
import { Navbar } from './components/Navbar';
import { BottomNav, TabType } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { OrdersView } from './components/OrdersView';
import { ProductsView } from './components/ProductsView';
import { ExceptionsView } from './components/ExceptionsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { ScannerModal } from './components/ScannerModal';
import { OrderDetailModal } from './components/OrderDetailModal';
import { ProductCostModal } from './components/ProductCostModal';
import { UploadModal } from './components/UploadModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [dateRange, setDateRange] = useState<DateFilterRange>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadInitialTab, setUploadInitialTab] = useState<'transaction' | 'handover'>('transaction');
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedProductForCost, setSelectedProductForCost] = useState<ProductMaster | null>(null);

  // Data state refresh trigger
  const [dataVersion, setDataVersion] = useState(0);
  const refreshData = useCallback(() => {
    setDataVersion(v => v + 1);
  }, []);

  // Sync DB records
  const allOrders = db.getOrders();
  const metrics = db.getDashboardMetrics(dateRange, customStart, customEnd);
  const exceptionsCount = metrics.unmatchedOrders;

  // Open Upload Modal with specific tab
  const handleOpenUpload = (tab: 'transaction' | 'handover' = 'transaction') => {
    setUploadInitialTab(tab);
    setIsUploadOpen(true);
  };

  // Inspect the prompt's acceptance test order
  const handleOpenTestAcceptance = () => {
    const testOrder = allOrders.find(o => o.order_id === '402-2652435-6373954');
    if (testOrder) {
      setSelectedOrder(testOrder);
    } else {
      // If not present, create it
      const { order } = db.recordLabelScan('402-2652435-6373954', 'ASA1278249245', 99);
      setSelectedOrder(order);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenUpload={() => handleOpenUpload('transaction')}
        pendingExceptionsCount={exceptionsCount}
        onOpenExceptions={() => setCurrentTab('exceptions')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24">
        {currentTab === 'dashboard' && (
          <DashboardView
            metrics={metrics}
            selectedRange={dateRange}
            onRangeChange={setDateRange}
            customStartDate={customStart}
            customEndDate={customEnd}
            onCustomDateChange={(start, end) => {
              setCustomStart(start);
              setCustomEnd(end);
              refreshData();
            }}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenUpload={handleOpenUpload}
            onSelectOrder={setSelectedOrder}
            onNavigateTab={tab => setCurrentTab(tab as TabType)}
            onOrdersUpdated={refreshData}
          />
        )}

        {currentTab === 'orders' && (
          <OrdersView
            orders={allOrders}
            onSelectOrder={setSelectedOrder}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOrdersUpdated={refreshData}
          />
        )}

        {currentTab === 'products' && (
          <ProductsView
            onOpenCostUpdate={setSelectedProductForCost}
            onSelectOrder={setSelectedOrder}
            onProductsUpdated={refreshData}
          />
        )}

        {currentTab === 'exceptions' && (
          <ExceptionsView
            orders={allOrders}
            onOpenUpload={handleOpenUpload}
            onSelectOrder={setSelectedOrder}
            onOpenCostModal={setSelectedProductForCost}
            onOrderUpdated={refreshData}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView orders={allOrders} />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            onDataChanged={refreshData}
            onOpenTestAcceptance={handleOpenTestAcceptance}
          />
        )}
      </main>

      {/* Mobile-First Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenScanner={() => setIsScannerOpen(true)}
        exceptionsCount={exceptionsCount}
      />

      {/* Camera / OCR Scanner Modal */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          refreshData();
        }}
        onOrderSaved={order => {
          refreshData();
        }}
        onOpenExistingOrder={order => {
          setSelectedOrder(order);
          refreshData();
        }}
      />

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => {
          setSelectedOrder(null);
          refreshData();
        }}
        onOrderUpdated={updated => {
          setSelectedOrder(updated);
          refreshData();
        }}
        onOrderDeleted={() => {
          setSelectedOrder(null);
          refreshData();
        }}
        onOpenCostUpdate={prodId => {
          const prod = db.getProducts().find(p => p.id === prodId);
          if (prod) setSelectedProductForCost(prod);
        }}
      />

      {/* Product Purchase Cost Modal */}
      <ProductCostModal
        product={selectedProductForCost}
        isOpen={Boolean(selectedProductForCost)}
        onClose={() => {
          setSelectedProductForCost(null);
          refreshData();
        }}
        onProductUpdated={() => {
          refreshData();
        }}
      />

      {/* File Upload Modal (Transaction CSV/XLSX & Handover PDF) */}
      <UploadModal
        isOpen={isUploadOpen}
        initialTab={uploadInitialTab}
        onClose={() => {
          setIsUploadOpen(false);
          refreshData();
        }}
        onUploadSuccess={() => {
          refreshData();
        }}
      />
    </div>
  );
}
