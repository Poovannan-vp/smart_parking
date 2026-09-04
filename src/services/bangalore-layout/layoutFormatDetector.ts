/**
 * Detect parking layout file format and route to appropriate importer
 * Supports: Excel, Images (PNG/JPG), PDF, SVG
 * All importers produce the same ParkingLayoutConfig output
 */

export type LayoutFileFormat = 'excel' | 'image' | 'pdf' | 'svg' | 'unknown';

export interface FileFormatInfo {
  format: LayoutFileFormat;
  mimeType: string;
  extension: string;
  displayName: string;
  implemented: boolean;
}

export function detectLayoutFileFormat(file: File): FileFormatInfo {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();

  // Excel formats
  if (fileName.endsWith('.xlsx') || mimeType.includes('spreadsheetml')) {
    return {
      format: 'excel',
      mimeType,
      extension: '.xlsx',
      displayName: 'Excel (XLSX)',
      implemented: true
    };
  }

  if (fileName.endsWith('.xls') || mimeType.includes('ms-excel')) {
    return {
      format: 'excel',
      mimeType,
      extension: '.xls',
      displayName: 'Excel (XLS)',
      implemented: true
    };
  }

  if (fileName.endsWith('.xlsm')) {
    return {
      format: 'excel',
      mimeType,
      extension: '.xlsm',
      displayName: 'Excel Macro (XLSM)',
      implemented: true
    };
  }

  // CSV (treats as Excel format)
  if (fileName.endsWith('.csv')) {
    return {
      format: 'excel',
      mimeType,
      extension: '.csv',
      displayName: 'Comma-Separated Values (CSV)',
      implemented: true
    };
  }

  // Image formats
  if (fileName.endsWith('.png') || mimeType === 'image/png') {
    return {
      format: 'image',
      mimeType,
      extension: '.png',
      displayName: 'PNG Image',
      implemented: false
    };
  }

  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || mimeType.includes('jpeg')) {
    return {
      format: 'image',
      mimeType,
      extension: '.jpg',
      displayName: 'JPG Image',
      implemented: false
    };
  }

  // PDF
  if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') {
    return {
      format: 'pdf',
      mimeType,
      extension: '.pdf',
      displayName: 'PDF Document',
      implemented: false
    };
  }

  // SVG
  if (fileName.endsWith('.svg') || mimeType === 'image/svg+xml') {
    return {
      format: 'svg',
      mimeType,
      extension: '.svg',
      displayName: 'SVG Vector',
      implemented: false
    };
  }

  // Unknown format
  return {
    format: 'unknown',
    mimeType,
    extension: fileName.substring(fileName.lastIndexOf('.')),
    displayName: 'Unknown Format',
    implemented: false
  };
}

export function getSupportedFormats(): string[] {
  return ['.xlsx', '.xls', '.xlsm', '.csv', '.png', '.jpg', '.jpeg', '.pdf', '.svg'];
}

export function getFormatDisplayInfo(format: LayoutFileFormat): { name: string; description: string } {
  switch (format) {
    case 'excel':
      return {
        name: 'Excel Spreadsheet',
        description: 'Standard Excel files (XLSX, XLS, XLSM) or CSV with parking layout data'
      };
    case 'image':
      return {
        name: 'Image Blueprint',
        description: 'PNG or JPG image containing the parking layout blueprint (not yet implemented)'
      };
    case 'pdf':
      return {
        name: 'PDF Layout',
        description: 'PDF document with parking layout (not yet implemented)'
      };
    case 'svg':
      return {
        name: 'SVG Vector',
        description: 'SVG vector graphic with parking layout (not yet implemented)'
      };
    default:
      return {
        name: 'Unknown Format',
        description: 'Unsupported file format'
      };
  }
}
