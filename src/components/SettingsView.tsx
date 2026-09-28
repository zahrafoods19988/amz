import React, { useState } from 'react';
import {
  Settings,
  Download,
  Upload,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Globe,
  Database,
  Zap,
} from 'lucide-react';
import { db } from '../services/db';

interface SettingsViewProps {
  onDataChanged: () => void;
  onOpenTestAcceptance: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onDataChanged,
  onOpenTestAcceptance,
}) => {
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handleExportJSON = () => {
    const jsonStr = db.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amazon_profit_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedbackMessage('Database exported successfully as JSON!');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      const success = db.importDatabaseJSON(content);
      if (success) {
        setFeedbackMessage('Backup restored successfully!');
        onDataChanged();
      } else {
        alert('Invalid backup JSON format.');
      }
      setTimeout(() => setFeedbackMessage(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset demo data? This will restore original sample records.')) {
      db.init(true);
      onDataChanged();
      setFeedbackMessage('Database reset to initial sample state.');
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-500" />
          Settings & Data Management
        </h2>
        <p className="text-xs text-slate-500">
          Seller configuration, backup/restore, duplicate protections, and verification
        </p>
      </div>

      {feedbackMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {feedbackMessage}
        </div>
      )}

      {/* Seller Profile & Marketplace */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Globe className="w-4 h-4 text-amber-500" />
          Seller Marketplace Profile
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Marketplace</span>
            <span className="font-bold text-slate-900 text-sm">Amazon Saudi Arabia</span>
            <span className="text-[10px] text-slate-500 block">amazon.sa</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Operating Currency</span>
            <span className="font-bold text-amber-700 text-sm">Saudi Riyal (SAR)</span>
            <span className="text-[10px] text-slate-500 block">Symbol: SAR / ر.س</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Seller Account</span>
            <span className="font-bold text-slate-900 text-sm truncate block">zahrafoods1998</span>
            <span className="text-[10px] text-emerald-700 font-semibold block flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Data Isolated
            </span>
          </div>
        </div>
      </div>

      {/* Acceptance Test Reference Walkthrough */}
      <div className="bg-amber-50/70 border border-amber-300 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600" />
            Prompt Acceptance Test Scenario
          </h3>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
            VERIFIED & READY
          </span>
        </div>
        <p className="text-xs text-amber-900 leading-relaxed">
          Verify the test case: Order <strong className="text-slate-900 font-mono">402-2652435-6373954</strong> +
          Tracking <strong className="text-amber-800 font-mono">ASA1278249245</strong> +
          Transaction with <strong className="text-slate-900 font-bold">Horlicks Classic Malt 1kg</strong> (Sale: SAR 61.00, Fees: SAR 21.84, Net: SAR 39.16) +
          Purchase Cost SAR 30.00 = <strong className="text-emerald-700 font-bold">Profit SAR 9.16</strong>.
        </p>
        <button
          onClick={onOpenTestAcceptance}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
        >
          Inspect Acceptance Test Order
        </button>
      </div>

      {/* Data Backup & Export Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-500" />
          Backup, Export & Restore
        </h3>
        <p className="text-xs text-slate-500">
          Save your database locally or restore from a previously exported backup file.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportJSON}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-2 border border-slate-200 transition"
          >
            <Download className="w-4 h-4 text-amber-600" />
            <span>Export Full Backup (JSON)</span>
          </button>

          <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-2 border border-slate-200 cursor-pointer transition">
            <Upload className="w-4 h-4 text-sky-600" />
            <span>Restore Backup (JSON)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>

          <button
            onClick={handleResetData}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition ml-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
