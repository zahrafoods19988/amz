import React, { useState } from 'react';
import { Database, CloudUpload, X, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { db } from '../services/db';
import { sound } from '../services/sound';

interface MigrationModalProps {
  isOpen: boolean;
  userId: string;
  onClose: () => void;
  onMigrated: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({
  isOpen,
  userId,
  onClose,
  onMigrated,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ orders: number; products: number } | null>(null);

  if (!isOpen) return null;

  const handleImport = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const stats = db.migrateLegacyDataToUser(userId);
      setResult({ orders: stats.ordersCount, products: stats.productsCount });
      sound.playSuccessSound();
      setIsProcessing(false);
      setTimeout(() => {
        onMigrated();
        onClose();
      }, 1200);
    }, 400);
  };

  const handleSkip = () => {
    db.dismissLegacyMigration(userId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Existing Local Data Found
              </h3>
              <p className="text-xs text-amber-800 font-medium">
                One-Time Cloud Import Assistant
              </p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {result ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-sm">Migration Complete!</div>
                <div className="text-xs text-emerald-700">
                  Transferred <strong>{result.orders}</strong> orders and <strong>{result.products}</strong> products to your cloud account.
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-600 leading-relaxed">
                We detected orders, labels, and products stored locally on this device before signing in. Would you like to import them to your new cloud account so they sync across all your phones, tablets, and computers?
              </p>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Database className="w-4 h-4 text-amber-600" />
                  <span>Cloud Safety Protections:</span>
                </div>
                <ul className="list-disc pl-5 text-[11px] text-slate-600 space-y-1">
                  <li>Automatic duplicate detection prevents duplicate Order IDs.</li>
                  <li>Purchase cost memory and profit records will be preserved.</li>
                  <li>Local backup/export option remains available at all times.</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!result && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button
              type="button"
              onClick={handleSkip}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200 transition"
            >
              Skip
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleImport}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-amber-500/25 flex items-center gap-2 transition active:scale-95"
            >
              {isProcessing ? (
                <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  <span>Import to Cloud</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
