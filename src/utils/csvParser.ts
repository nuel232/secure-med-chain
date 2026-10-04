/**
 * CSV parser for batch drug imports.
 *
 * Columns are matched by header name, so order doesn't matter:
 *   name, batchNumber, quantity, expiryDate        (required)
 *   registrationNumber                              (optional, e.g. NAFDAC reg. no.)
 *
 *   name,batchNumber,registrationNumber,quantity,expiryDate
 *   Paracetamol 500mg,BN-001,04-1234,1000,2027-12-31
 *
 * Limits mirror DrugInventory.sol (name 100 bytes, batch / registration 64 bytes).
 */
import { isFutureExpiry, isValidDateString } from './dates';

export interface DrugImportRow {
  name: string;
  batchNumber: string;
  registrationNumber: string;
  quantity: number;
  expiryDate: string; // YYYY-MM-DD
  rowNumber: number;
  error?: string;
}

export interface ParseResult {
  valid: DrugImportRow[];
  invalid: DrugImportRow[];
  totalRows: number;
  /** Set when the file itself is unusable (e.g. missing required columns). */
  fileError?: string;
}

const REQUIRED = ['name', 'batchnumber', 'quantity', 'expirydate'] as const;
const byteLength = (s: string) => new TextEncoder().encode(s).length;

/** Split one CSV line, honouring "quoted, fields" and "" escapes. */
function splitCSVLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

export function parseCSV(csvContent: string): ParseResult {
  const lines = csvContent.replace(/^\uFEFF/, '').split(/\r?\n/);
  const valid: DrugImportRow[] = [];
  const invalid: DrugImportRow[] = [];
  let totalRows = 0;

  const header = splitCSVLine(lines[0] ?? '').map((h) => h.toLowerCase());
  const missing = REQUIRED.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    return {
      valid,
      invalid,
      totalRows,
      fileError: `Missing required column(s): ${missing.join(', ')}. Expected header: name,batchNumber,registrationNumber,quantity,expiryDate`,
    };
  }
  const col = (cells: string[], name: string) => cells[header.indexOf(name)] ?? '';

  lines.slice(1).forEach((line, index) => {
    if (!line.trim()) return;
    totalRows++;

    const cells = splitCSVLine(line);
    const qtyStr = col(cells, 'quantity');
    const row: DrugImportRow = {
      name: col(cells, 'name'),
      batchNumber: col(cells, 'batchnumber'),
      registrationNumber: col(cells, 'registrationnumber'),
      quantity: /^\d+$/.test(qtyStr) ? parseInt(qtyStr, 10) : 0,
      expiryDate: col(cells, 'expirydate'),
      rowNumber: index + 2, // header is row 1
    };

    const errors: string[] = [];
    if (!row.name) errors.push('Drug name is required');
    else if (byteLength(row.name) > 100) errors.push('Drug name must be 100 bytes or less');

    if (!row.batchNumber) errors.push('Batch number is required');
    else if (byteLength(row.batchNumber) > 64) errors.push('Batch number must be 64 bytes or less');

    if (byteLength(row.registrationNumber) > 64) errors.push('Registration number must be 64 bytes or less');

    if (row.quantity <= 0) errors.push('Quantity must be a positive whole number');

    if (!row.expiryDate) errors.push('Expiry date is required');
    else if (!isValidDateString(row.expiryDate)) errors.push('Expiry date must be a real date in YYYY-MM-DD format');
    else if (!isFutureExpiry(row.expiryDate)) errors.push('Expiry date must be in the future');

    if (errors.length > 0) {
      row.error = errors.join('; ');
      invalid.push(row);
    } else {
      valid.push(row);
    }
  });

  return { valid, invalid, totalRows };
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') resolve(content);
      else reject(new Error('Failed to read file'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/** Sample template. Dates are generated relative to today so the sample is never already expired. */
export function generateSampleCSV(): string {
  const y = new Date().getUTCFullYear();
  return [
    'name,batchNumber,registrationNumber,quantity,expiryDate',
    `Paracetamol 500mg,BN-001,04-1234,1000,${y + 2}-12-31`,
    `Aspirin 100mg,BN-002,,500,${y + 1}-06-15`,
    `"Ibuprofen 200mg, tablets",BN-003,04-5678,750,${y + 1}-03-20`,
  ].join('\n');
}

export function downloadSampleCSV(): void {
  const blob = new Blob([generateSampleCSV()], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'drugs_sample.csv';
  link.click();
  window.URL.revokeObjectURL(url);
}
