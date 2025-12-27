/**
 * CSV Parser utility for batch drug imports
 * Expected CSV format:
 * name,quantity,expiryDate
 * Paracetamol 500mg,1000,2025-12-31
 * Aspirin 100mg,500,2026-06-15
 */

export interface DrugImportRow {
  name: string;
  quantity: number;
  expiryDate: string; // YYYY-MM-DD format
  rowNumber: number;
  error?: string;
}

export interface ParseResult {
  valid: DrugImportRow[];
  invalid: DrugImportRow[];
  totalRows: number;
}

/**
 * Parse CSV file content
 */
export function parseCSV(csvContent: string): ParseResult {
  const lines = csvContent.trim().split('\n');
  const valid: DrugImportRow[] = [];
  const invalid: DrugImportRow[] = [];
  let totalRows = 0;

  // Skip header row (if present)
  const dataLines = lines.slice(1);

  dataLines.forEach((line, index) => {
    const rowNumber = index + 2; // +2 because of 0-index and header row
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      return;
    }

    const [name, quantityStr, expiryDate] = trimmedLine.split(',').map(col => col.trim());
    totalRows++;

    const row: DrugImportRow = {
      name: name || '',
      quantity: parseInt(quantityStr, 10) || 0,
      expiryDate: expiryDate || '',
      rowNumber,
    };

    // Validate row
    const errors: string[] = [];

    if (!row.name) {
      errors.push('Drug name is required');
    } else if (row.name.length > 255) {
      errors.push('Drug name must be 255 characters or less');
    }

    if (!row.quantity || row.quantity <= 0) {
      errors.push('Quantity must be a positive number');
    }

    if (!row.expiryDate) {
      errors.push('Expiry date is required');
    } else if (!isValidDate(row.expiryDate)) {
      errors.push('Expiry date must be in YYYY-MM-DD format');
    } else if (new Date(row.expiryDate) <= new Date()) {
      errors.push('Expiry date must be in the future');
    }

    if (errors.length > 0) {
      row.error = errors.join('; ');
      invalid.push(row);
    } else {
      valid.push(row);
    }
  });

  return {
    valid,
    invalid,
    totalRows,
  };
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Generate sample CSV template
 */
export function generateSampleCSV(): string {
  const sample = [
    'name,quantity,expiryDate',
    'Paracetamol 500mg,1000,2025-12-31',
    'Aspirin 100mg,500,2026-06-15',
    'Ibuprofen 200mg,750,2026-03-20',
  ].join('\n');

  return sample;
}

/**
 * Download sample CSV file
 */
export function downloadSampleCSV(): void {
  const csvContent = generateSampleCSV();
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'drugs_sample.csv';
  link.click();
  window.URL.revokeObjectURL(url);
}
