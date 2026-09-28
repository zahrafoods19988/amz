import React from 'react';
import { Camera, Upload, AlertCircle, ShoppingBag } from 'lucide-react';

interface NavbarProps {
  onOpenScanner: () => void;
  onOpenUpload: () => void;
  pendingExceptionsCount: number;
  onOpenExceptions: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenScanner,
  onOpenUpload,
  pendingExceptionsCount,
  onOpenExceptions,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
            <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">Amazon Seller Profit Tracker</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hidden sm:inline-block">
                🇸🇦 Saudi Arabia (SAR)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Automated 3-Way Matching • Order ID & Tracking ID</p>
          </div>
        </div>

        {/* Quick Actions (Desktop & Mobile) */}
        <div className="flex items-center gap-2.5">
          {/* Exceptions Alert Badge */}
          {pendingExceptionsCount > 0 && (
            <button
              onClick={onOpenExceptions}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Unmatched or pending orders"
            >
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>{pendingExceptionsCount}</span>
              <span className="hidden md:inline">Pending</span>
            </button>
          )}

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-2 border border-slate-300 transition"
          >
            <Upload className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Upload Files</span>
          </button>

          {/* Big Scan Button on Header */}
          <button
            onClick={onOpenScanner}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black flex items-center gap-2 shadow-md shadow-amber-500/25 transition"
          >
            <Camera className="w-4 h-4 stroke-[3]" />
            <span>SCAN LABEL</span>
          </button>
        </div>
      </div>
    </header>
  );
};
