import { createWorker } from 'tesseract.js';
import { isValidOrderId, isValidTrackingId } from './db';

export interface OCRResult {
  orderId: string | null;
  trackingId: string | null;
  confidence: number;
  rawText: string;
  isHighConfidence: boolean;
  notes?: string;
}

// Clean and extract standard Amazon Saudi Arabia Order ID
// Format: XXX-XXXXXXX-XXXXXXX (e.g. 402-2652435-6373954)
export function extractOrderId(text: string): { orderId: string | null; confidence: number } {
  if (!text) return { orderId: null, confidence: 0 };

  // 1. Direct standard regex: 3 digits - 7 digits - 7 digits (allowing flexible dashes, slashes, spaces)
  const standardMatch = text.match(/\b(\d{3})[\s\-–—/]+(\d{7})[\s\-–—/]+(\d{7})\b/);
  if (standardMatch) {
    return {
      orderId: `${standardMatch[1]}-${standardMatch[2]}-${standardMatch[3]}`,
      confidence: 96,
    };
  }

  // 2. Look for "Order ID:" or "Order #" prefix
  const prefixMatch = text.match(/order\s*(?:id|#|no\.?|num)?\s*[:\s\-–—]*([0-9OIlSo\-–—\s]{15,28})/i);
  if (prefixMatch) {
    let candidate = prefixMatch[1]
      .replace(/[O]/gi, '0')
      .replace(/[Il|]/g, '1')
      .replace(/[S]/g, '5')
      .replace(/[^0-9-]/g, '');
    const parts = candidate.split('-').filter(Boolean);
    if (parts.length === 3 && parts[0].length === 3 && parts[1].length === 7 && parts[2].length === 7) {
      return { orderId: `${parts[0]}-${parts[1]}-${parts[2]}`, confidence: 92 };
    }
    // If dashes were missed: 17 continuous digits
    const digitsOnly = candidate.replace(/\D/g, '');
    if (digitsOnly.length === 17) {
      return {
        orderId: `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 10)}-${digitsOnly.slice(10, 17)}`,
        confidence: 88,
      };
    }
  }

  // 3. Look for 17 consecutive digits anywhere
  const digitsOnlyMatch = text.match(/\b(\d{3})(\d{7})(\d{7})\b/);
  if (digitsOnlyMatch) {
    return {
      orderId: `${digitsOnlyMatch[1]}-${digitsOnlyMatch[2]}-${digitsOnlyMatch[3]}`,
      confidence: 85,
    };
  }

  // 4. Fallback search for any 3-7-7 digit groupings separated by spaces or dots
  const spacedMatch = text.match(/\b(\d{3})[.\s]+(\d{7})[.\s]+(\d{7})\b/);
  if (spacedMatch) {
    return {
      orderId: `${spacedMatch[1]}-${spacedMatch[2]}-${spacedMatch[3]}`,
      confidence: 82,
    };
  }

  return { orderId: null, confidence: 0 };
}

// Clean and extract standard Amazon Tracking ID
// Format: ASA + numbers (e.g. ASA1278249245)
export function extractTrackingId(text: string): { trackingId: string | null; confidence: number } {
  if (!text) return { trackingId: null, confidence: 0 };

  // 1. Direct ASA + 8 to 16 digits
  const asaMatch = text.match(/\b(ASA\s*\d{8,16})\b/i);
  if (asaMatch) {
    const cleaned = asaMatch[1].toUpperCase().replace(/\s+/g, '');
    return { trackingId: cleaned, confidence: 95 };
  }

  // 2. Tracking ID: [value]
  const prefixMatch = text.match(/tracking\s*(?:id|#|no\.?|num)?\s*[:\s-]*([A-Z0-9\s]{8,20})/i);
  if (prefixMatch) {
    const candidate = prefixMatch[1].toUpperCase().replace(/\s+/g, '');
    if (candidate.startsWith('ASA') && candidate.length >= 10) {
      return { trackingId: candidate, confidence: 90 };
    }
  }

  // 3. Fallback: Carrier tracking like SPX or SMSA if ASA not found
  const spxMatch = text.match(/\b(SPX\w{8,14})\b/i);
  if (spxMatch) {
    return { trackingId: spxMatch[1].toUpperCase(), confidence: 85 };
  }

  return { trackingId: null, confidence: 0 };
}

// Try native browser BarcodeDetector API if available
export async function detectBarcodeFromImage(
  imageSource: ImageBitmapSource
): Promise<{ trackingId?: string; orderId?: string } | null> {
  try {
    // Check if BarcodeDetector is available on window
    if ('BarcodeDetector' in window) {
      // @ts-ignore
      const detector = new (window as any).BarcodeDetector({
        formats: ['code_128', 'code_39', 'qr_code', 'data_matrix', 'ean_13'],
      });
      const barcodes = await detector.detect(imageSource);
      if (barcodes && barcodes.length > 0) {
        for (const item of barcodes) {
          const rawValue = item.rawValue || '';
          if (isValidTrackingId(rawValue)) {
            return { trackingId: rawValue.toUpperCase() };
          }
          if (isValidOrderId(rawValue)) {
            return { orderId: rawValue };
          }
          if (rawValue.toUpperCase().startsWith('ASA')) {
            return { trackingId: rawValue.toUpperCase().replace(/\s+/g, '') };
          }
        }
      }
    }
  } catch (e) {
    console.warn('BarcodeDetector error/unsupported:', e);
  }
  return null;
}

let workerInstance: any = null;
let isWorkerInitializing = false;

export async function warmupOCR() {
  if (!workerInstance && !isWorkerInitializing) {
    isWorkerInitializing = true;
    try {
      workerInstance = await createWorker('eng');
    } catch (e) {
      console.warn('OCR warmup failed:', e);
    } finally {
      isWorkerInitializing = false;
    }
  }
  return workerInstance;
}

async function getOCRWorker() {
  if (!workerInstance) {
    workerInstance = await createWorker('eng');
  }
  return workerInstance;
}

// Image preprocessing on an HTML Canvas to sharpen and enhance contrast
export function preprocessCanvas(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/jpeg');

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Grayscale & contrast enhancement
  for (let i = 0; i < data.length; i += 4) {
    const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // High contrast thresholding
    const contrast = avg > 128 ? Math.min(255, avg * 1.2) : Math.max(0, avg * 0.8);
    data[i] = contrast;
    data[i + 1] = contrast;
    data[i + 2] = contrast;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.9);
}

// Process an image through BarcodeDetector and Tesseract OCR
export async function processShippingLabel(imageSource: string | HTMLCanvasElement): Promise<OCRResult> {
  let orderId: string | null = null;
  let trackingId: string | null = null;
  let rawText = '';
  let avgConfidence = 0;

  // 1. Try Barcode detection first for tracking ID or order ID
  try {
    let imgElement: HTMLImageElement | HTMLCanvasElement;
    if (typeof imageSource === 'string') {
      imgElement = new Image();
      imgElement.src = imageSource;
      await new Promise(r => { imgElement.onload = r; });
    } else {
      imgElement = imageSource;
    }
    const barcodeResult = await detectBarcodeFromImage(imgElement);
    if (barcodeResult) {
      if (barcodeResult.trackingId) trackingId = barcodeResult.trackingId;
      if (barcodeResult.orderId) orderId = barcodeResult.orderId;
    }
  } catch (err) {
    console.warn('Barcode detection skip:', err);
  }

  // 2. Perform OCR for printed text
  try {
    const worker = await getOCRWorker();
    const result = await worker.recognize(imageSource);
    rawText = result.data.text || '';
    avgConfidence = result.data.confidence || 0;

    if (!orderId) {
      const orderExtraction = extractOrderId(rawText);
      if (orderExtraction.orderId) {
        orderId = orderExtraction.orderId;
      }
    }

    if (!trackingId) {
      const trackingExtraction = extractTrackingId(rawText);
      if (trackingExtraction.trackingId) {
        trackingId = trackingExtraction.trackingId;
      }
    }
  } catch (ocrErr) {
    console.error('OCR Processing error:', ocrErr);
  }

  const isOrderValid = orderId ? isValidOrderId(orderId) : false;
  const isTrackingValid = trackingId ? isValidTrackingId(trackingId) : false;

  const isHighConfidence = isOrderValid && isTrackingValid && avgConfidence >= 65;

  return {
    orderId,
    trackingId,
    confidence: avgConfidence,
    rawText,
    isHighConfidence,
  };
}
