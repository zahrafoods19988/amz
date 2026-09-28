import React from 'react';
import {
  Camera,
  Upload,
  AlertCircle,
  ShoppingBag,
  Cloud,
  RefreshCw,
  LogOut,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { AuthUser, SyncStatus } from '../types';

interface NavbarProps {
  onOpenScanner: () => void;
  onOpenUpload: () => void;
  pendingExceptionsCount: number;
  onOpenExceptions: () => void;
  currentUser: AuthUser | null;
  syncStatus: SyncStatus;
  lastSyncedTime: string | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onSyncNow: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenScanner,
  onOpenUpload,
  pendingExceptionsCount,
  onOpenExceptions,
  currentUser,
  syncStatus,
  lastSyncedTime,
  onOpenAuth,
  onLogout,
  onSyncNow,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
            <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">Amazon Seller Profit Tracker</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hidden lg:inline-block">
                🇸🇦 Saudi Arabia (SAR)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Automated 3-Way Matching • Order ID & Tracking ID</p>
          </div>
        </div>

        {/* Right Section: Sync Pill, User Account, Actions */}
        <div className="flex items-center gap-2">
          {/* Sync Status Badge / Manual Sync Button */}
          {currentUser && (
            <button
              onClick={onSyncNow}
              title={`Cloud Sync Status: ${syncStatus}. Click to Sync Now.`}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95 ${
                syncStatus === 'SYNCED'
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : syncStatus === 'SYNCING'
                  ? 'bg-sky-50 border-sky-200 text-sky-800'
                  : syncStatus === 'PENDING SYNC'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 animate-pulse'
                  : syncStatus === 'OFFLINE'
                  ? 'bg-slate-100 border-slate-300 text-slate-600'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {syncStatus === 'SYNCING' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
              ) : syncStatus === 'OFFLINE' ? (
                <WifiOff className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <span
                  className={`w-2 h-2 rounded-full ${
                    syncStatus === 'SYNCED'
                      ? 'bg-emerald-500'
                      : syncStatus === 'PENDING SYNC'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
              )}
              <span className="hidden md:inline font-mono">
                {syncStatus === 'SYNCED' ? 'SYNCED' : syncStatus}
              </span>
              {syncStatus === 'SYNCED' && lastSyncedTime && (
                <span className="text-[9px] text-emerald-600 font-normal hidden lg:inline">
                  ({lastSyncedTime})
                </span>
              )}
            </button>
          )}

          {/* User Profile / Login Button */}
          {currentUser ? (
            <div className="flex items-center gap-1.5">
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs"
                title={`Logged in as ${currentUser.email}`}
              >
                <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center shrink-0">
                  {currentUser.email.slice(0, 1).toUpperCase()}
                </div>
                <span className="font-semibold text-slate-900 max-w-[100px] sm:max-w-[130px] truncate hidden sm:inline">
                  {currentUser.full_name || currentUser.email.split('@')[0]}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                title="Log Out of Cloud Account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95"
            >
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign In / Sync</span>
            </button>
          )}

          {/* Exceptions Alert Badge */}
          {pendingExceptionsCount > 0 && (
            <button
              onClick={onOpenExceptions}
              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Unmatched or pending orders"
            >
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>{pendingExceptionsCount}</span>
              <span className="hidden xl:inline">Pending</span>
            </button>
          )}

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 border border-slate-300 transition"
          >
            <Upload className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Upload Files</span>
          </button>

          {/* Big Scan Button on Header */}
          <button
            onClick={onOpenScanner}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/25 transition shrink-0"
          >
            <Camera className="w-4 h-4 stroke-[3]" />
            <span className="hidden xs:inline">SCAN LABEL</span>
          </button>
        </div>
      </div>
    </header>
  );
};
