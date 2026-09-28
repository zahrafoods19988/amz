import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  Check,
  RefreshCw,
  AlertTriangle,
  Edit2,
  Zap,
  ArrowRight,
  Package,
  ShieldCheck,
  Sparkles,
  Play,
  Pause,
  AlertOctagon,
  Eye,
  Sliders,
} from 'lucide-react';
import { processShippingLabel, detectBarcodeFromImage, warmupOCR } from '../services/ocr';
import { db, isValidOrderId, isValidTrackingId } from '../services/db';
import { sound } from '../services/sound';
import { Order } from '../types';
import confetti from 'canvas-confetti';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSaved?: (order: Order) => void;
  onOpenExistingOrder?: (order: Order) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onOrderSaved,
  onOpenExistingOrder,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoScanActive, setAutoScanActive] = useState<boolean>(true);
  const [handsFreeAutoSave, setHandsFreeAutoSave] = useState<boolean>(true);
  const [autoScanStatus, setAutoScanStatus] = useState<string>('Aim camera at label — auto detects live...');

  // Scan result state
  const [detectedOrderId, setDetectedOrderId] = useState<string>('');
  const [detectedTrackingId, setDetectedTrackingId] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [alreadyExistsOrder, setAlreadyExistsOrder] = useState<Order | null>(null);
  const [savedSuccessOrder, setSavedSuccessOrder] = useState<Order | null>(null);

  // Batch stats
  const [scannedBatchCount, setScannedBatchCount] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoScanTimerRef = useRef<any>(null);
  const autoSaveCountdownRef = useRef<any>(null);
  const isScanningFrameRef = useRef<boolean>(false);

  // Warmup OCR on mount
  useEffect(() => {
    warmupOCR();
  }, []);

  // Play haptic feedback
  const triggerHaptic = (type: 'success' | 'duplicate') => {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
        if (type === 'duplicate') {
          navigator.vibrate([250, 100, 250, 100, 400]);
        } else {
          navigator.vibrate([80, 40, 80]);
        }
      }
    } catch {}
  };

  const executeSave = useCallback((orderId: string, trackingId: string, conf: number) => {
    const { status, order } = db.recordLabelScan(orderId, trackingId, conf || 98);

    if (status === 'already_exists') {
      setAlreadyExistsOrder(order);
      sound.playDuplicateAlertSound();
      triggerHaptic('duplicate');
      return;
    }

    // Success save!
    sound.playSuccessSound();
    triggerHaptic('success');
    try {
      confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 } });
    } catch {}

    setScannedBatchCount(prev => prev + 1);
    setSavedSuccessOrder(order);
    if (onOrderSaved) {
      onOrderSaved(order);
    }

    // In hands-free mode, return quickly to scanner for next box
    setTimeout(() => {
      resetScanState();
    }, 1400);
  }, [onOrderSaved]);

  const handleOCRResult = useCallback((orderId: string, trackingId: string, conf: number) => {
    const cleanOrder = orderId.trim();
    const cleanTracking = trackingId.trim().toUpperCase();

    // 1. DUPLICATE CHECK: Immediately flash RED if already scanned!
    if (cleanOrder || cleanTracking) {
      const existing = db.findOrderByOrderOrTracking(cleanOrder, cleanTracking);
      if (existing) {
        setAlreadyExistsOrder(existing);
        sound.playDuplicateAlertSound();
        triggerHaptic('duplicate');
        return;
      }
    }

    // Both detected and valid: Auto-save immediately if handsFreeAutoSave is enabled!
    if (isValidOrderId(cleanOrder) && isValidTrackingId(cleanTracking)) {
      setDetectedOrderId(cleanOrder);
      setDetectedTrackingId(cleanTracking);
      setConfidence(conf);

      if (handsFreeAutoSave) {
        executeSave(cleanOrder, cleanTracking, conf);
      } else {
        sound.playSuccessSound();
        triggerHaptic('success');
      }
      return;
    }

    // Single field detected or needs user confirmation/editing
    setDetectedOrderId(cleanOrder);
    setDetectedTrackingId(cleanTracking);
    setConfidence(conf);
    setIsEditing(true);
    triggerHaptic('success');
  }, [handsFreeAutoSave, executeSave]);

  // Perform single frame inspection
  const analyzeCurrentFrame = useCallback(async () => {
    if (!videoRef.current || isScanningFrameRef.current) return;
    if (videoRef.current.readyState < 2) return;
    if (detectedOrderId || alreadyExistsOrder || savedSuccessOrder) return;

    isScanningFrameRef.current = true;
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');

      // Optimization: Scale down to 800px width for near-instant OCR
      const scale = Math.min(1, 800 / (video.videoWidth || 800));
      canvas.width = (video.videoWidth || 640) * scale;
      canvas.height = (video.videoHeight || 480) * scale;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      // 1. Try native BarcodeDetector first (takes <15ms!)
      let foundTracking: string | undefined;
      let foundOrder: string | undefined;

      const barcodeResult = await detectBarcodeFromImage(video);
      if (barcodeResult) {
        if (barcodeResult.trackingId) foundTracking = barcodeResult.trackingId;
        if (barcodeResult.orderId) foundOrder = barcodeResult.orderId;
      }

      // If barcode gave both, we don't even need OCR!
      if (foundOrder && foundTracking) {
        handleOCRResult(foundOrder, foundTracking, 99);
        return;
      }

      // 2. Perform OCR text analysis
      setAutoScanStatus('Auto-reading text from label...');
      const result = await processShippingLabel(canvas);

      const finalOrder = foundOrder || result.orderId;
      const finalTracking = foundTracking || result.trackingId;

      if (finalOrder || finalTracking) {
        if (isValidOrderId(finalOrder || '') || isValidTrackingId(finalTracking || '')) {
          handleOCRResult(finalOrder || '', finalTracking || '', result.confidence || 95);
        }
      } else {
        setAutoScanStatus('Aim camera at shipping label...');
      }
    } catch (err) {
      console.warn('Auto frame scan error:', err);
    } finally {
      isScanningFrameRef.current = false;
    }
  }, [detectedOrderId, alreadyExistsOrder, savedSuccessOrder, handleOCRResult]);

  // Continuous Auto-Scan Loop (Runs every 450ms while camera is pointing at labels)
  useEffect(() => {
    if (isOpen && autoScanActive && !detectedOrderId && !alreadyExistsOrder && !savedSuccessOrder && stream) {
      autoScanTimerRef.current = setInterval(() => {
        analyzeCurrentFrame();
      }, 450);
    } else {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
    }
    return () => {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
    };
  }, [isOpen, autoScanActive, detectedOrderId, alreadyExistsOrder, savedSuccessOrder, stream, analyzeCurrentFrame]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
      resetScanState();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported on this browser/device');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(err.message || 'Camera unavailable. You can use image upload or test simulator below.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (autoScanTimerRef.current) {
      clearInterval(autoScanTimerRef.current);
      autoScanTimerRef.current = null;
    }
    if (autoSaveCountdownRef.current) {
      clearTimeout(autoSaveCountdownRef.current);
      autoSaveCountdownRef.current = null;
    }
  };

  const resetScanState = () => {
    setDetectedOrderId('');
    setDetectedTrackingId('');
    setConfidence(0);
    setIsEditing(false);
    setAlreadyExistsOrder(null);
    setSavedSuccessOrder(null);
    setAutoScanStatus('Aim camera at shipping label...');
    isScanningFrameRef.current = false;
    if (autoSaveCountdownRef.current) {
      clearTimeout(autoSaveCountdownRef.current);
      autoSaveCountdownRef.current = null;
    }
  };

  // Manual fallback capture if user wants to force capture immediately
  const handleManualCapture = async () => {
    if (!videoRef.current) return;
    setIsProcessing(true);
    setAutoScanStatus('Scanning current frame...');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      const result = await processShippingLabel(canvas);
      handleOCRResult(result.orderId || '', result.trackingId || '', result.confidence);
    } catch (err: any) {
      setCameraError('Scan failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle uploaded image file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setAutoScanStatus('Reading uploaded image...');

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const imgUrl = event.target?.result as string;
        const result = await processShippingLabel(imgUrl);
        handleOCRResult(result.orderId || '', result.trackingId || '', result.confidence);
      } catch (err: any) {
        setCameraError('File OCR failed: ' + err.message);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmAndSave = () => {
    if (!detectedOrderId || !detectedTrackingId) return;

    if (!isValidOrderId(detectedOrderId)) {
      alert('Order ID must follow the standard format: XXX-XXXXXXX-XXXXXXX (e.g. 402-2652435-6373954)');
      return;
    }

    if (!isValidTrackingId(detectedTrackingId)) {
      alert('Tracking ID must follow the standard format: ASA + numbers (e.g. ASA1278249245)');
      return;
    }

    executeSave(detectedOrderId, detectedTrackingId, confidence || 98);
  };

  // Simulated rapid presets for testing
  const simulateTestScan = (orderId: string, trackingId: string) => {
    setIsProcessing(true);
    setAutoScanStatus('Reading label automatically...');
    setTimeout(() => {
      setIsProcessing(false);
      handleOCRResult(orderId, trackingId, 99);
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto transition-colors duration-300 ${
        alreadyExistsOrder ? 'bg-red-950/85 backdrop-blur-md' : 'bg-slate-950/65 backdrop-blur-xs'
      }`}
    >
      <div
        className={`relative w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh] transition-all duration-300 border-2 ${
          alreadyExistsOrder
            ? 'bg-rose-600 border-rose-400 text-white shadow-rose-600/50'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* ========================================================================= */}
        {/* CRITICAL USER REQUIREMENT: RED SCREEN ON ALREADY SCANNED ORDER            */}
        {/* ========================================================================= */}
        {alreadyExistsOrder ? (
          <div className="p-6 sm:p-8 bg-rose-600 text-white flex flex-col space-y-6 animate-in zoom-in-95 duration-200">
            {/* Flashing Top Alert Icon */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white text-rose-600 flex items-center justify-center shadow-lg animate-bounce">
                  <AlertOctagon className="w-8 h-8 stroke-[2.5]" />
                </div>
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black tracking-widest uppercase border border-white/30">
                    DUPLICATE DETECTED
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-white mt-1">
                    ORDER PEHLE SE SCAN HUA HAI!
                  </h2>
                </div>
              </div>
              <button
                onClick={resetScanState}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
                title="Dismiss"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Warning Message Box */}
            <div className="bg-red-700/80 border-2 border-white/40 p-4 rounded-2xl shadow-inner text-white space-y-2">
              <div className="flex items-center gap-2 font-bold text-base text-yellow-300">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>Duplicate Packing Prevented!</span>
              </div>
              <p className="text-xs text-rose-100 leading-relaxed font-medium">
                Yeh shipping label pehle se scan karke record me save ho chuka hai. Dubara save nahi kiya gaya taake inventory aur profit me koi duplicate na bane.
              </p>
            </div>

            {/* Scanned Label Data Card in Stark White */}
            <div className="bg-white text-slate-900 rounded-2xl p-5 shadow-2xl space-y-3">
              <div className="text-xs uppercase font-extrabold tracking-wider text-rose-700 flex items-center justify-between border-b border-slate-100 pb-2">
                <span>Existing Order Details</span>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                  {alreadyExistsOrder.order_status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Order ID</span>
                  <span className="text-sm font-black font-mono text-slate-900 block mt-0.5">
                    {alreadyExistsOrder.order_id}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tracking ID</span>
                  <span className="text-sm font-black font-mono text-slate-900 block mt-0.5">
                    {alreadyExistsOrder.tracking_id}
                  </span>
                </div>
              </div>

              {alreadyExistsOrder.product_name && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Product</span>
                  <span className="text-xs font-bold text-slate-800 line-clamp-1 mt-0.5">
                    {alreadyExistsOrder.product_name}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Original Scan: {new Date(alreadyExistsOrder.scan_date).toLocaleDateString()}</span>
                <span>Handover: <strong className="text-slate-800">{alreadyExistsOrder.handover_status}</strong></span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={resetScanState}
                className="flex-1 py-3.5 px-4 bg-white hover:bg-slate-100 active:scale-95 text-rose-700 font-black rounded-2xl text-sm shadow-xl flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className="w-4 h-4 stroke-[3]" />
                <span>DISMISS & SCAN NEXT BOX</span>
              </button>

              <button
                onClick={() => {
                  if (onOpenExistingOrder) onOpenExistingOrder(alreadyExistsOrder);
                  onClose();
                }}
                className="py-3.5 px-4 bg-rose-800 hover:bg-rose-900 active:scale-95 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 border border-white/20 transition"
              >
                <Eye className="w-4 h-4" />
                <span>View Order Details</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* NORMAL SCANNER SCREEN: CONTINUOUS LIVE AUTO-DETECTION                      */
          /* ========================================================================= */
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Camera className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">Amazon Label Scanner</h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Live Auto-Detect
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Auto-detects Order ID & Tracking ID without button press</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Hands-Free Auto-Save Bar */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${handsFreeAutoSave ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {handsFreeAutoSave ? '⚡ Hands-Free Auto-Save Active' : 'Manual Confirm Mode'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {handsFreeAutoSave ? 'Auto saves instantly when label is recognized' : 'Requires tap on confirm before saving'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setHandsFreeAutoSave(!handsFreeAutoSave)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                    handsFreeAutoSave
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  {handsFreeAutoSave ? 'Auto-Save: ON' : 'Auto-Save: OFF'}
                </button>
              </div>

              {/* Success Save Banner */}
              {savedSuccessOrder && (
                <div className="p-4 rounded-2xl bg-emerald-600 text-white space-y-2 animate-in zoom-in-95 shadow-lg shadow-emerald-600/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-6 h-6 text-white stroke-[2.5]" />
                      <span className="font-extrabold text-base">✓ ORDER SAVED AUTOMATICALLY!</span>
                    </div>
                    <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                      Batch: {scannedBatchCount}
                    </span>
                  </div>
                  <div className="bg-emerald-700/80 p-2.5 rounded-xl font-mono text-xs flex justify-between">
                    <span>Order: <strong>{savedSuccessOrder.order_id}</strong></span>
                    <span>Tracking: <strong>{savedSuccessOrder.tracking_id}</strong></span>
                  </div>
                  <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Ready for next box...
                  </p>
                </div>
              )}

              {/* Viewfinder: Active live scanner */}
              {!detectedOrderId && (
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-300 aspect-video flex items-center justify-center group shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Real-time laser scanning line animation */}
                  <div className="absolute inset-x-8 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_14px_#f59e0b] animate-bounce pointer-events-none opacity-85" />

                  {/* Viewfinder Target Overlay */}
                  <div className="absolute inset-5 border-2 border-dashed border-amber-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                    <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider text-amber-300 bg-slate-950/85 px-2.5 py-1 rounded-md w-max shadow-sm border border-amber-400/30">
                      <span>Live Target: Order ID & Tracking ID</span>
                    </div>

                    <div className="self-center bg-slate-950/90 px-3.5 py-1.5 rounded-full text-xs font-mono text-white flex items-center gap-2 shadow-md border border-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-amber-400 font-bold">Live Status:</span>
                      <span className="text-slate-200 text-[11px]">{autoScanStatus}</span>
                    </div>

                    <div className="text-[10px] text-right font-mono text-slate-300 bg-slate-950/85 px-2 py-0.5 rounded w-max self-end border border-slate-800">
                      No click needed • Auto reads label
                    </div>
                  </div>

                  {/* Camera Error or Fallback Message */}
                  {cameraError && (
                    <div className="absolute inset-0 bg-white/95 p-6 flex flex-col items-center justify-center text-center space-y-3 z-10">
                      <AlertTriangle className="w-10 h-10 text-amber-500" />
                      <p className="text-xs text-slate-700 max-w-sm">{cameraError}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={startCamera}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-300"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold"
                        >
                          Upload Label Photo
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Processing Spinner Overlay */}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center z-20 space-y-3">
                      <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                      <p className="text-xs font-mono text-amber-200 font-semibold">{autoScanStatus}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Detected Review Screen (when manual review is active or format is incomplete) */}
              {detectedOrderId && !savedSuccessOrder && (
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 animate-in fade-in shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-emerald-700 font-bold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      Auto-Detected Successfully!
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Confidence: {confidence > 0 ? `${confidence}%` : 'High'}
                    </span>
                  </div>

                  {/* Order ID Card */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Order ID</span>
                      {isValidOrderId(detectedOrderId) ? (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Valid Format</span>
                      ) : (
                        <span className="text-[10px] text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">Check Format</span>
                      )}
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={detectedOrderId}
                        onChange={e => setDetectedOrderId(e.target.value)}
                        placeholder="402-2652435-6373954"
                        className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                      />
                    ) : (
                      <div className="text-base font-bold font-mono text-slate-900 tracking-wide">{detectedOrderId}</div>
                    )}
                  </div>

                  {/* Tracking ID Card */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Tracking ID</span>
                      {isValidTrackingId(detectedTrackingId) ? (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Valid Format</span>
                      ) : (
                        <span className="text-[10px] text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">Check Format (ASA...)</span>
                      )}
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={detectedTrackingId}
                        onChange={e => setDetectedTrackingId(e.target.value.toUpperCase())}
                        placeholder="ASA1278249245"
                        className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white uppercase"
                      />
                    ) : (
                      <div className="text-base font-bold font-mono text-slate-900 tracking-wide">{detectedTrackingId}</div>
                    )}
                  </div>

                  {/* Action Buttons: Confirm & Save / Edit */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      {isEditing ? 'Done Editing' : 'Edit'}
                    </button>
                    <button
                      onClick={handleConfirmAndSave}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/25 transition"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      CONFIRM & SAVE
                    </button>
                  </div>
                </div>
              )}

              {/* Scanner Control Bar */}
              {!detectedOrderId && (
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => setAutoScanActive(!autoScanActive)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 transition"
                  >
                    {autoScanActive ? <Pause className="w-3.5 h-3.5 text-amber-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{autoScanActive ? 'Auto-Scan: Active' : 'Auto-Scan: Paused'}</span>
                  </button>

                  <button
                    onClick={handleManualCapture}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-200 transition"
                    title="Manual snap if camera is far"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                    <span>Snap</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-amber-800 text-xs font-bold rounded-xl border border-slate-200 transition"
                  >
                    Upload Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {/* Fast Test Simulator Buttons */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Instant Test Simulator:
                  </span>
                  <span className="text-[10px] text-slate-400">Click to test auto-detect & duplicate detection</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Button 1: Test New Label */}
                  <button
                    onClick={() => simulateTestScan(`407-${Math.floor(1000000 + Math.random() * 9000000)}-${Math.floor(1000000 + Math.random() * 9000000)}`, `ASA${Math.floor(1000000000 + Math.random() * 9000000000)}`)}
                    className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-left transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-amber-900">⚡ Test New Label</div>
                      <div className="text-[10px] text-amber-800">Auto detects & saves</div>
                    </div>
                    <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  </button>

                  {/* Button 2: Test Acceptance Label */}
                  <button
                    onClick={() => simulateTestScan('402-2652435-6373954', 'ASA1278249245')}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-left transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">Sample Order Label</div>
                      <div className="text-[10px] text-slate-500 font-mono">402-2652435...</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  </button>

                  {/* Button 3: CRITICAL RED SCREEN TEST TRIGGER */}
                  <button
                    onClick={() => {
                      // Grab any existing order to trigger RED screen immediately!
                      const existingOrders = db.getOrders();
                      if (existingOrders.length > 0) {
                        simulateTestScan(existingOrders[0].order_id, existingOrders[0].tracking_id);
                      } else {
                        // Create one first then trigger
                        db.recordLabelScan('402-2652435-6373954', 'ASA1278249245');
                        simulateTestScan('402-2652435-6373954', 'ASA1278249245');
                      }
                    }}
                    className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-left transition flex items-center justify-between group"
                    title="Test duplicate alert: Turns screen bright RED"
                  >
                    <div>
                      <div className="text-xs font-black text-rose-700">🔴 Test Duplicate (RED)</div>
                      <div className="text-[10px] text-rose-600">Triggers RED screen alert</div>
                    </div>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-600" />
                <span>Target: Order ID (XXX-XXXXXXX-XXXXXXX) & Tracking (ASA...)</span>
              </div>
              <span className="font-mono text-slate-600 font-medium">Continuous Mode</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
