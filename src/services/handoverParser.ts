import { HandoverRecord } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker to a reliable unpkg or cdnjs version
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface ParseHandoverResult {
  records: HandoverRecord[];
  duplicates: number;
  totalParsed: number;
  errors: string[];
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageStrings = content.items.map((item: any) => item.str || '');
    fullText += pageStrings.join(' ') + '\n';
  }

  return fullText;
}

export function parseHandoverText(rawText: string): HandoverRecord[] {
  const records: HandoverRecord[] = [];
  const trackingMatches = rawText.matchAll(/\b(ASA\s*\d{8,16})\b/gi);
  const foundTrackings = Array.from(trackingMatches).map(m => m[1].toUpperCase().replace(/\s+/g, ''));
  const uniqueTrackings = Array.from(new Set(foundTrackings));

  // Extract Manifest ID
  const manifestMatch = rawText.match(/\b(MNF[-A-Z0-9]+)\b/i) || rawText.match(/manifest\s*(?:id|#)?[:\s]*([A-Z0-9-]+)/i);
  const manifestId = manifestMatch ? manifestMatch[1].toUpperCase() : undefined;

  // Extract Shipment ID
  const shipmentMatch = rawText.match(/\b(FBA[A-Z0-9]{8,14})\b/i) || rawText.match(/shipment\s*(?:id|#)?[:\s]*([A-Z0-9-]+)/i);
  const shipmentId = shipmentMatch ? shipmentMatch[1].toUpperCase() : undefined;

  // Extract Carrier
  let carrier = 'Amazon Shipping (SPX)';
  if (/smsa/i.test(rawText)) carrier = 'SMSA Express';
  else if (/aramex/i.test(rawText)) carrier = 'Aramex';
  else if (/spx|amazon\s*shipping/i.test(rawText)) carrier = 'Amazon Shipping (SPX)';

  // Extract date
  const dateMatch = rawText.match(/\b(\d{4}-\d{2}-\d{2})\b/) || rawText.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
  const handoverDate = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

  // Extract time
  const timeMatch = rawText.match(/\b(\d{2}:\d{2}(?::\d{2})?)\b/);
  const shipoutTime = timeMatch ? timeMatch[1] : '14:00';

  const totalPackages = uniqueTrackings.length || 1;

  uniqueTrackings.forEach(trackingId => {
    records.push({
      id: `ho-${trackingId}-${Date.now()}`,
      tracking_id: trackingId,
      shipment_id: shipmentId,
      fba_shipment_id: shipmentId,
      manifest_id: manifestId,
      carrier,
      handover_date: handoverDate,
      shipout_time: shipoutTime,
      total_packages: totalPackages,
      raw_data: { sourceText: rawText.substring(0, 500) },
      created_at: new Date().toISOString(),
    });
  });

  return records;
}

export async function parseHandoverFile(file: File): Promise<ParseHandoverResult> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  try {
    let textContent = '';
    if (isPdf) {
      textContent = await extractTextFromPDF(file);
    } else {
      textContent = await file.text();
    }

    const records = parseHandoverText(textContent);

    if (records.length === 0) {
      return {
        records: [],
        duplicates: 0,
        totalParsed: 0,
        errors: ['No Amazon Tracking IDs (e.g., ASA1278249245) detected in this handover document.'],
      };
    }

    return {
      records,
      duplicates: 0,
      totalParsed: records.length,
      errors: [],
    };
  } catch (err: any) {
    return {
      records: [],
      duplicates: 0,
      totalParsed: 0,
      errors: [err.message || 'Failed to read handover file'],
    };
  }
}

// Generate an authentic Amazon Saudi Arabia Dispatch / Handover PDF for immediate download and testing
export function generateSampleHandoverPDF(): Uint8Array {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('AMAZON SAUDI ARABIA - CARRIER HANDOVER MANIFEST', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Manifest ID: MNF-RUH-2026-041', 14, 28);
  doc.text('Fulfillment Center: RUH1 (Riyadh Logistics Park)', 14, 34);
  doc.text(`Handover Date: ${new Date().toISOString().split('T')[0]}`, 14, 40);
  doc.text('Carrier: Amazon Shipping (SPX Saudi)', 14, 46);
  doc.text('Shipout Window: 14:00 - 16:30 AST', 14, 52);

  // Table with Tracking IDs including the prompt acceptance test tracking ID
  const tableData = [
    ['1', 'ASA1278249245', 'FBA15K89YTT1', 'Standard SPX', 'Riyadh Zone 4', 'Dispatched'],
    ['2', 'ASA9928172634', 'FBA15K89YTT2', 'Standard SPX', 'Jeddah Hub', 'Dispatched'],
    ['3', 'ASA5544332211', 'FBA15K89YTT3', 'Standard SPX', 'Dammam Logistics', 'Dispatched'],
    ['4', 'ASA7766554433', 'FBA15K89YTT4', 'Express SPX', 'Medina Depot', 'Dispatched'],
  ];

  autoTable(doc, {
    startY: 58,
    head: [['#', 'Tracking ID (Amazon)', 'Shipment ID', 'Service Type', 'Destination', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11] }, // Amber color
  });

  const finalY = (doc as any).lastAutoTable.finalY || 120;
  doc.setFontSize(10);
  doc.text('Carrier Driver Signature: _______________________', 14, finalY + 20);
  doc.text('Amazon Dispatch Supervisor: _______________________', 120, finalY + 20);
  doc.text('Total Packages Handed Over: 4 Units', 14, finalY + 30);

  return doc.output('arraybuffer') as unknown as Uint8Array;
}
