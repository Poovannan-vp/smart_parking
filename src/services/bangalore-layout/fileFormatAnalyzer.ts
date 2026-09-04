/**
 * File Format Analyzer
 *
 * Detects the actual file format at runtime
 * Distinguishes between:
 * - Modern XLSX (Office Open XML)
 * - Legacy XLS (OLE compound document)
 * - Encrypted/password-protected
 * - Corrupted/unreadable
 */

export interface FileAnalysisResult {
  detected: boolean;
  fileFormat: 'xlsx' | 'xls' | 'csv' | 'encrypted' | 'corrupted' | 'unknown';
  description: string;
  canParse: boolean;
  errorMessage?: string;
  suggestions?: string[];
}

export async function analyzeFileFormat(file: File): Promise<FileAnalysisResult> {
  const fileName = file.name.toLowerCase();

  // Read file as binary to detect actual format
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);
  const fileSignature = String.fromCharCode(...uint8Array.slice(0, 8));

  // Check for ZIP signature (XLSX uses ZIP)
  const isZipFormat = uint8Array[0] === 0x50 && uint8Array[1] === 0x4b; // PK

  // Check for OLE signature (legacy XLS)
  const isOleFormat =
    uint8Array[0] === 0xd0 &&
    uint8Array[1] === 0xcf &&
    uint8Array[2] === 0x11 &&
    uint8Array[3] === 0xe0;

  // Check for encryption markers
  const hasEncryptionHeader = fileSignature.includes('EncryptionInfo');

  // Analyze based on extension
  if (fileName.endsWith('.xlsx')) {
    if (isOleFormat) {
      return {
        detected: true,
        fileFormat: 'xls',
        description: 'File has .xlsx extension but contains legacy OLE format (XLS)',
        canParse: false,
        errorMessage: 'Legacy Excel format in XLSX container — not supported by browser XLSX library',
        suggestions: [
          'Open the file in Excel or LibreOffice',
          'Save as modern XLSX format',
          'Try re-exporting the file'
        ]
      };
    }

    if (hasEncryptionHeader) {
      return {
        detected: true,
        fileFormat: 'encrypted',
        description: 'Password-protected or encrypted XLSX workbook',
        canParse: false,
        errorMessage: 'File is encrypted — browser cannot decrypt without password',
        suggestions: [
          'Open file in Excel/LibreOffice and remove password protection',
          'Save without encryption',
          'Contact file owner for unencrypted version'
        ]
      };
    }

    if (isZipFormat) {
      return {
        detected: true,
        fileFormat: 'xlsx',
        description: 'Modern XLSX (Office Open XML) format',
        canParse: true
      };
    }

    return {
      detected: true,
      fileFormat: 'corrupted',
      description: 'File has .xlsx extension but invalid format',
      canParse: false,
      errorMessage: 'File header does not match XLSX structure',
      suggestions: [
        'File may be corrupted',
        'Try re-saving in Excel',
        'Verify file integrity'
      ]
    };
  }

  if (fileName.endsWith('.xls')) {
    if (isOleFormat) {
      return {
        detected: true,
        fileFormat: 'xls',
        description: 'Legacy XLS (OLE compound document)',
        canParse: false,
        errorMessage: 'Legacy XLS format — requires special parser not available in browser',
        suggestions: [
          'Convert to XLSX: Open in Excel → Save As → Excel Workbook (.xlsx)',
          'Use LibreOffice to convert',
          'Online converters: cloudconvert.com, zamzar.com'
        ]
      };
    }

    return {
      detected: true,
      fileFormat: 'xls',
      description: 'File marked as XLS',
      canParse: false,
      errorMessage: 'XLS format not supported — please convert to XLSX',
      suggestions: [
        'Convert to XLSX: Open in Excel → Save As → Excel Workbook (.xlsx)',
        'Use LibreOffice to convert'
      ]
    };
  }

  if (fileName.endsWith('.csv')) {
    return {
      detected: true,
      fileFormat: 'csv',
      description: 'CSV (Comma-Separated Values)',
      canParse: true
    };
  }

  // Default detection
  return {
    detected: false,
    fileFormat: 'unknown',
    description: `Unknown format: ${fileName}`,
    canParse: false,
    errorMessage: `File type not recognized: ${fileName}`,
    suggestions: [
      'Supported formats: .xlsx, .csv, .png, .jpg, .pdf, .svg',
      'Ensure file extension is correct'
    ]
  };
}

export function getFormatHelpText(format: string): string {
  const helpTexts: Record<string, string> = {
    xlsx: 'Modern Excel workbook format. Recommended.',
    xls: 'Legacy Excel format. Please convert to XLSX using Excel or LibreOffice.',
    csv: 'Comma-separated values. Will be parsed as flat data.',
    encrypted: 'File is password-protected. Remove encryption and try again.',
    corrupted: 'File appears to be corrupted or invalid.',
    unknown: 'File format not recognized.'
  };

  return helpTexts[format] || 'Unknown format';
}
