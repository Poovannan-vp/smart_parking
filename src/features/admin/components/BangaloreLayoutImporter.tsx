import { useState, useRef } from 'react';
import { FiUploadCloud, FiCheck, FiAlertCircle, FiX, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { importBangaloreLayout } from '@/services/bangalore-layout/bangaloreLayoutImporter';
import { detectLayoutFileFormat, getSupportedFormats } from '@/services/bangalore-layout/layoutFormatDetector';
import type { ImportResult } from '@/services/bangalore-layout/bangaloreLayoutImporter';
import type { ParkingLayoutConfig } from '@/types/parkingLayout';
import Button from '../../../shared/components/Button';

interface BangaloreLayoutImporterProps {
  onImportSuccess: (layout: ParkingLayoutConfig) => void;
  loading?: boolean;
}

export function BangaloreLayoutImporter({ onImportSuccess, loading = false }: BangaloreLayoutImporterProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Detect file format
    const formatInfo = detectLayoutFileFormat(file);
    const supportedFormats = getSupportedFormats();

    if (!supportedFormats.includes(formatInfo.extension)) {
      toast.error(`Unsupported format. Please use: ${supportedFormats.join(', ')}`);
      return;
    }

    setIsImporting(true);
    try {
      const result = await importBangaloreLayout(file, 'bangalore');
      setImportResult(result);

      if (result.success && result.layout) {
        toast.success(`Successfully imported ${result.slotCount.total} elements`);
        onImportSuccess(result.layout);
      } else if (!formatInfo.implemented) {
        toast.error(`${formatInfo.displayName} import is not yet implemented. Currently supporting: Excel formats only.`);
      } else {
        toast.error('Import completed with errors. Please review below.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to import: ${message}`);
      setImportResult({
        success: false,
        validation: {
          valid: false,
          errors: [message],
          warnings: []
        },
        slotCount: {
          total: 0,
          standard: 0,
          bike: 0,
          pillars: 0,
          passages: 0,
          other: 0
        }
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="border-2 border-dashed border-temenos-teal/40 rounded-2xl p-8 bg-temenos-teal-light text-center transition-colors hover:border-temenos-teal cursor-pointer"
        onClick={() => fileInputRef.current?.click()}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.xlsm,.png,.jpg,.jpeg,.pdf,.svg"
          onChange={handleFileUpload}
          disabled={isImporting || loading}
          className="hidden"
        />
        <FiUploadCloud className="mx-auto h-12 w-12 text-temenos-teal mb-3" />
        <p className="text-lg font-semibold text-temenos-navy mb-1">
          {isImporting ? 'Processing file...' : 'Upload Bangalore Parking Layout'}
        </p>
        <p className="text-sm text-slate-500">
          Excel (XLSX, XLS, CSV) • Image (PNG, JPG) • PDF • SVG
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Currently fully supporting: Excel formats
        </p>
      </div>

      {/* Import Results */}
      {importResult && (
        <div className="space-y-4">
          {/* Status Summary */}
          <div className={`animate-fade-in rounded-2xl p-4 ${importResult.success ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <div className="flex items-center gap-3 mb-2">
              {importResult.success ? (
                <FiCheck className="h-5 w-5 text-emerald-600" />
              ) : (
                <FiAlertCircle className="h-5 w-5 text-amber-600" />
              )}
              <span className={`font-semibold ${importResult.success ? 'text-emerald-800' : 'text-amber-800'}`}>
                {importResult.success ? 'Import Successful' : 'Import Completed with Issues'}
              </span>
            </div>
          </div>

          {/* Slot Count Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="text-2xl font-bold text-temenos-teal">{importResult.slotCount.standard}</div>
              <div className="text-xs text-slate-600">Car Parking</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="text-2xl font-bold text-pink-600">{importResult.slotCount.bike}</div>
              <div className="text-xs text-slate-600">Bike Parking</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="text-2xl font-bold text-slate-600">{importResult.slotCount.total}</div>
              <div className="text-xs text-slate-600">Total Elements</div>
            </div>
          </div>

          {/* Structural Elements */}
          {(importResult.slotCount.pillars > 0 || importResult.slotCount.passages > 0) && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-sm font-semibold text-slate-700 mb-2">Structural Elements Detected</p>
              <div className="flex gap-4 text-sm">
                {importResult.slotCount.pillars > 0 && (
                  <span className="text-slate-600">{importResult.slotCount.pillars} Pillars</span>
                )}
                {importResult.slotCount.passages > 0 && (
                  <span className="text-slate-600">{importResult.slotCount.passages} Passages</span>
                )}
              </div>
            </div>
          )}

          {/* Errors */}
          {importResult.validation.errors.length > 0 && (
            <div className={`rounded-xl p-4 border ${
              importResult.validation.errors.some(e => e.includes('not yet implemented'))
                ? 'bg-temenos-teal-light border-temenos-teal/30'
                : 'bg-rose-50 border-rose-200'
            }`}>
              <p className={`font-semibold mb-2 flex items-center gap-2 ${
                importResult.validation.errors.some(e => e.includes('not yet implemented'))
                  ? 'text-temenos-navy'
                  : 'text-rose-800'
              }`}>
                {importResult.validation.errors.some(e => e.includes('not yet implemented')) ? (
                  <><FiClock className="h-4 w-4" /> Planned Feature</>
                ) : (
                  <><FiX className="h-4 w-4" /> Technical Issue</>
                )}
              </p>
              <ul className="space-y-1">
                {importResult.validation.errors.map((error, idx) => (
                  <li key={idx} className={`text-sm ${
                    importResult.validation.errors.some(e => e.includes('not yet implemented'))
                      ? 'text-temenos-navy/80'
                      : 'text-rose-700'
                  }`}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {importResult.validation.warnings.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <FiAlertCircle className="h-4 w-4" /> Warnings
              </p>
              <ul className="space-y-1">
                {importResult.validation.warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm text-amber-700">• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-600 mb-2">EXTRACTION DETAILS</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-slate-600">
                <span className="font-semibold">Standard Parking:</span> {importResult.slotCount.standard} slots
              </div>
              <div className="text-slate-600">
                <span className="font-semibold">Bike Parking:</span> {importResult.slotCount.bike} slots
              </div>
              <div className="text-slate-600">
                <span className="font-semibold">Pillars:</span> {importResult.slotCount.pillars}
              </div>
              <div className="text-slate-600">
                <span className="font-semibold">Passages:</span> {importResult.slotCount.passages}
              </div>
              <div className="text-slate-600">
                <span className="font-semibold">Other:</span> {importResult.slotCount.other}
              </div>
              <div className="text-slate-600">
                <span className="font-semibold">Total:</span> {importResult.slotCount.total}
              </div>
            </div>
          </div>

          {/* Action Button */}
          {importResult.success && importResult.layout && (
            <Button
              variant="teal"
              fullWidth
              onClick={() => {
                onImportSuccess(importResult.layout!);
                setImportResult(null);
              }}
            >
              <FiCheck className="h-4 w-4 mr-2" />
              Accept and Preview Layout
            </Button>
          )}

          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              setImportResult(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          >
            Clear Results
          </Button>
        </div>
      )}
    </div>
  );
}
