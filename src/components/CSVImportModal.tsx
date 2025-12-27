import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Download, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  parseCSV,
  readFileAsText,
  downloadSampleCSV,
  DrugImportRow,
  ParseResult,
} from '@/utils/csvParser';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (drugs: DrugImportRow[]) => Promise<void>;
  isLoading?: boolean;
}

export const CSVImportModal = ({
  isOpen,
  onClose,
  onImport,
  isLoading = false,
}: CSVImportModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);

    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'text/plain') {
      setImportError('Please select a CSV file');
      return;
    }

    try {
      const content = await readFileAsText(file);
      const result = parseCSV(content);

      if (result.totalRows === 0) {
        setImportError('CSV file is empty (no data rows found)');
        return;
      }

      if (result.valid.length === 0 && result.invalid.length > 0) {
        setImportError(`All ${result.invalid.length} rows have validation errors`);
      }

      setParseResult(result);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : 'Failed to parse CSV file'
      );
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;

    setImporting(true);
    try {
      await onImport(parseResult.valid);
      // Reset on success
      setParseResult(null);
      setImportError(null);
      onClose();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setParseResult(null);
    setImportError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">
                Batch Import Drugs from CSV
              </h2>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* File Input Section */}
            {!parseResult && (
              <div className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Upload a CSV file with columns: <strong>name, quantity, expiryDate</strong>
                    <br />
                    Date format must be YYYY-MM-DD (e.g., 2025-12-31)
                  </AlertDescription>
                </Alert>

                {/* File Upload Area */}
                <div
                  className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/60 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 text-primary/50 mx-auto mb-3" />
                  <p className="text-foreground font-medium mb-1">
                    Click to select or drag and drop
                  </p>
                  <p className="text-sm text-muted-foreground">CSV file only</p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label="Select CSV file for drug import"
                    title="Select CSV file for drug import"
                  />
                </div>

                {/* Error Message */}
                {importError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{importError}</AlertDescription>
                  </Alert>
                )}

                {/* Sample CSV Section */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">
                      Need help? Download a sample CSV template
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadSampleCSV()}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Sample
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The sample includes example drugs to show the correct format
                  </p>
                </div>
              </div>
            )}

            {/* Parse Results Section */}
            {parseResult && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {parseResult.totalRows}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Rows</p>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-4 text-center border border-green-500/30">
                    <p className="text-2xl font-bold text-green-600">
                      {parseResult.valid.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Valid</p>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-4 text-center border border-red-500/30">
                    <p className="text-2xl font-bold text-red-600">
                      {parseResult.invalid.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Invalid</p>
                  </div>
                </div>

                {/* Valid Rows */}
                {parseResult.valid.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Valid Drugs ({parseResult.valid.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {parseResult.valid.map((drug) => (
                        <div
                          key={`${drug.rowNumber}`}
                          className="bg-green-500/5 border border-green-500/30 rounded-lg p-3 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-foreground">{drug.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {drug.quantity} | Expires: {drug.expiryDate}
                              </p>
                            </div>
                            <span className="text-xs bg-green-500/20 text-green-700 px-2 py-1 rounded">
                              Row {drug.rowNumber}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invalid Rows */}
                {parseResult.invalid.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      Invalid Drugs ({parseResult.invalid.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {parseResult.invalid.map((drug) => (
                        <div
                          key={`${drug.rowNumber}`}
                          className="bg-red-500/5 border border-red-500/30 rounded-lg p-3 text-sm"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs bg-red-500/20 text-red-700 px-2 py-1 rounded">
                              Row {drug.rowNumber}
                            </span>
                          </div>
                          <p className="text-xs text-red-600">{drug.error}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setParseResult(null);
                      setImportError(null);
                    }}
                    disabled={importing}
                  >
                    Choose Different File
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={
                      parseResult.valid.length === 0 || importing || isLoading
                    }
                    variant="success"
                    className="flex-1"
                  >
                    {importing || isLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                          className="w-4 h-4 border-2 border-success-foreground/30 border-t-success-foreground rounded-full mr-2"
                        />
                        Importing {parseResult.valid.length} Drugs...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import {parseResult.valid.length} Valid Drugs
                      </>
                    )}
                  </Button>
                </div>

                {importError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{importError}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
