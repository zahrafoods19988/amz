import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { parseTransactionFile, generateSampleTransactionCSV } from '../services/transactionParser';
import { parseHandoverFile, generateSampleHandoverPDF } from '../services/handoverParser';
import { db } from '../services/db';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'transaction' | 'handover';
  onUploadSuccess?: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'transaction',
  onUploadSuccess,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'transaction' | 'handover'>(initialTab);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    description: string;
    addedCount?: number;
    duplicateCount?: number;
  } | null>(null);

  // Download Sample Amazon Saudi Arabia CSV
  const handleDownloadSampleCSV = () => {
    const csvContent = generateSampleTransactionCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Amazon_Saudi_Sample_Transactions.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download Sample Amazon Handover PDF
  const handleDownloadSamplePDF = () => {
    const pdfData = generateSampleHandoverPDF();
    const blob = new Blob([pdfData.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Amazon_SPX_Handover_Manifest_Sample.pdf';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Transaction file upload handler
  const handleTransactionFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setResultMessage(null);

    try {
      const { records, errors } = await parseTransactionFile(file);

      if (records.length === 0) {
        setResultMessage({
          type: 'error',
          title: 'Import Failed',
          description: errors[0] || 'No valid Amazon order transactions found in this file.',
        });
        return;
      }

      const { added, duplicates } = db.saveTransactions(records);

      if (added === 0 && duplicates > 0) {
        setResultMessage({
          type: 'warning',
          title: 'ALREADY IMPORTED',
          description: `All ${duplicates} transactions in this file are already in the system. Duplicate protection prevented re-importing.`,
          addedCount: 0,
          duplicateCount: duplicates,
        });
      } else {
        setResultMessage({
          type: 'success',
          title: 'Transactions Imported & Matched Successfully',
          description: `Imported ${added} new transactions (${duplicates} duplicates skipped). Product Masters & profit calculations updated automatically.`,
          addedCount: added,
          duplicateCount: duplicates,
        });
        if (onUploadSuccess) onUploadSuccess();
      }
    } catch (err: any) {
      setResultMessage({
        type: 'error',
        title: 'Error Reading Transaction File',
        description: err.message || 'Check file format (CSV, XLSX).',
      });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  // Handover file upload handler
  const handleHandoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setResultMessage(null);

    try {
      const { records, errors } = await parseHandoverFile(file);

      if (records.length === 0) {
        setResultMessage({
          type: 'error',
          title: 'Handover Import Failed',
          description: errors[0] || 'Could not find Amazon Tracking IDs (e.g., ASA1278249245) in this document.',
        });
        return;
      }

      const { added, duplicates } = db.saveHandovers(records);

      if (added === 0 && duplicates > 0) {
        setResultMessage({
          type: 'warning',
          title: 'ALREADY IMPORTED',
          description: `All ${duplicates} tracking/handover records in this file already exist in the database.`,
          addedCount: 0,
          duplicateCount: duplicates,
        });
      } else {
        setResultMessage({
          type: 'success',
          title: 'Handover PDF Processed Successfully',
          description: `Registered ${added} tracking records (${duplicates} duplicate records skipped). Matched with scanned labels.`,
          addedCount: added,
          duplicateCount: duplicates,
        });
        if (onUploadSuccess) onUploadSuccess();
      }
    } catch (err: any) {
      setResultMessage({
        type: 'error',
        title: 'Error Reading Handover File',
        description: err.message || 'Please upload a valid Amazon handover PDF or text manifest.',
      });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Upload className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Data Import & Matching Center</h2>
              <p className="text-xs text-slate-500">Upload Amazon Transaction Reports & Handover PDFs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-2 gap-2">
          <button
            onClick={() => {
              setActiveTab('transaction');
              setResultMessage(null);
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
              activeTab === 'transaction'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-600" />
            1. Transaction Report (CSV/XLSX)
          </button>

          <button
            onClick={() => {
              setActiveTab('handover');
              setResultMessage(null);
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
              activeTab === 'handover'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-orange-600" />
            2. Handover / Dispatch (PDF)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Result Alert */}
          {resultMessage && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-1.5 animate-in fade-in ${
                resultMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : resultMessage.type === 'warning'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {resultMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                )}
                <span>{resultMessage.title}</span>
              </div>
              <p className="leading-relaxed opacity-95">{resultMessage.description}</p>
            </div>
          )}

          {/* TAB 1: TRANSACTION FILE */}
          {activeTab === 'transaction' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                  Transaction Matching Logic
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The app automatically detects Order ID, Product Titles, Selling Amounts, and Amazon Fees. Matches:
                </p>
                <div className="bg-white p-2.5 rounded-xl font-mono text-xs text-slate-900 border border-slate-200 flex items-center justify-between shadow-xs">
                  <span className="text-amber-800 font-bold">Transaction Order ID</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span className="text-emerald-700 font-bold">Scanned Label Order ID</span>
                </div>
              </div>

              {/* Upload Dropzone */}
              <label className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50 hover:bg-amber-50/30 transition group">
                <FileSpreadsheet className="w-10 h-10 text-slate-400 group-hover:text-amber-600 transition mb-3" />
                <span className="text-sm font-bold text-slate-900 group-hover:text-amber-800">
                  Choose Amazon Transaction File
                </span>
                <span className="text-xs text-slate-500 mt-1">Supports .csv, .xlsx, .xls</span>
                <span className="mt-3 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-xs font-bold text-slate-800 border border-slate-300 shadow-xs">
                  Browse File
                </span>
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleTransactionFileUpload}
                  className="hidden"
                  disabled={isProcessing}
                />
              </label>

              {/* Sample file download option for immediate testing */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-500">Need a test transaction file?</span>
                <button
                  onClick={handleDownloadSampleCSV}
                  className="text-xs text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Download Sample CSV (amazon.sa)
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: HANDOVER / DISPATCH PDF */}
          {activeTab === 'handover' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                  Handover PDF Matching Logic
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Extracts Tracking ID (<span className="font-mono text-amber-800 font-bold">ASA...</span>), Carrier, Shipment ID and Manifest ID. Matches:
                </p>
                <div className="bg-white p-2.5 rounded-xl font-mono text-xs text-slate-900 border border-slate-200 flex items-center justify-between shadow-xs">
                  <span className="text-amber-800 font-bold">Handover PDF Tracking ID</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span className="text-emerald-700 font-bold">Scanned Label Tracking ID</span>
                </div>
              </div>

              {/* PDF Dropzone */}
              <label className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50 hover:bg-amber-50/30 transition group">
                <FileText className="w-10 h-10 text-slate-400 group-hover:text-amber-600 transition mb-3" />
                <span className="text-sm font-bold text-slate-900 group-hover:text-amber-800">
                  Upload Handover / Dispatch PDF
                </span>
                <span className="text-xs text-slate-500 mt-1">Supports PDF dispatch sheets or text manifests</span>
                <span className="mt-3 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-xs font-bold text-slate-800 border border-slate-300 shadow-xs">
                  Browse PDF
                </span>
                <input
                  type="file"
                  accept="application/pdf, text/plain"
                  onChange={handleHandoverFileUpload}
                  className="hidden"
                  disabled={isProcessing}
                />
              </label>

              {/* Sample PDF download option for immediate testing */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-500">Need a test Amazon Handover PDF?</span>
                <button
                  onClick={handleDownloadSamplePDF}
                  className="text-xs text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Download Sample SPX Manifest PDF
                </button>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-amber-800 py-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
              Parsing & performing 3-way reconciliation...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Duplicate Protection Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
