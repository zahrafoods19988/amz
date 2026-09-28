import React from 'react';
import { LayoutDashboard, Camera, Package, Boxes, BarChart3, Settings } from 'lucide-react';

export type TabType = 'dashboard' | 'orders' | 'products' | 'exceptions' | 'reports' | 'settings';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenScanner: () => void;
  exceptionsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenScanner,
  exceptionsCount,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-lg pb-safe">
      <div className="max-w-lg mx-auto px-2 h-16 flex items-center justify-around relative">
        {/* Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            currentTab === 'dashboard' ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Dashboard</span>
        </button>

        {/* Orders */}
        <button
          onClick={() => onSelectTab('orders')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            currentTab === 'orders' ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Orders</span>
        </button>

        {/* SCAN - THE BIGGEST AND EASIEST BUTTON (Elevated in Center) */}
        <div className="relative -top-5 flex flex-col items-center">
          <button
            onClick={onOpenScanner}
            aria-label="Scan Amazon Shipping Label"
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/35 active:scale-90 border-4 border-white transition"
          >
            <Camera className="w-7 h-7 stroke-[2.5]" />
          </button>
          <span className="text-[10px] font-black text-amber-600 tracking-wider mt-0.5 uppercase">
            SCAN
          </span>
        </div>

        {/* Products */}
        <button
          onClick={() => onSelectTab('products')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            currentTab === 'products' ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Products</span>
        </button>

        {/* Reports */}
        <button
          onClick={() => onSelectTab('reports')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            currentTab === 'reports' ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Reports</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => onSelectTab('settings')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition relative ${
            currentTab === 'settings' ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {exceptionsCount > 0 && (
            <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
          )}
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Settings</span>
        </button>
      </div>
    </div>
  );
};
