import * as XLSX from 'xlsx';

export interface RawExcelCell {
  address: string;
  row: number;
  col: number;
  value: string | number;
  fill?: {
    rgb?: string;
    index?: number;
  };
}

export interface RawExcelMergedRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  value?: string | number;
  fill?: {
    rgb?: string;
    index?: number;
  };
}

export interface ExcelSheetMetadata {
  name: string;
  totalRows: number;
  totalCols: number;
  /** Row heights in CSS pixels, normalized from the workbook's own point sizes */
  rowHeights: Map<number, number>;
  /** Column widths in CSS pixels, normalized from the workbook's own character-width units */
  colWidths: Map<number, number>;
}

const POINTS_TO_PX = 96 / 72;
// Only used when a column has a character-width but no pixel width and no
// embedded max-digit-width (MDW) of its own to convert with.
const FALLBACK_MAX_DIGIT_WIDTH = 7;

/** Convert a worksheet row's metadata to a pixel height, or undefined if unknown. */
function rowHeightToPx(row: { hpx?: number; hpt?: number } | undefined): number | undefined {
  if (typeof row?.hpx === 'number') return row.hpx;
  if (typeof row?.hpt === 'number') return row.hpt * POINTS_TO_PX;
  return undefined;
}

/** Convert a worksheet column's metadata to a pixel width, or undefined if unknown. */
function colWidthToPx(col: { wpx?: number; wch?: number; MDW?: number } | undefined): number | undefined {
  if (typeof col?.wpx === 'number') return col.wpx;
  if (typeof col?.wch === 'number') {
    const mdw = typeof col?.MDW === 'number' ? col.MDW : FALLBACK_MAX_DIGIT_WIDTH;
    return Math.floor(((256 * col.wch + Math.floor(128 / mdw)) / 256) * mdw);
  }
  return undefined;
}

export interface RawExcelData {
  metadata: ExcelSheetMetadata;
  cells: RawExcelCell[];
  mergedRanges: RawExcelMergedRange[];
}

export async function parseExcelFile(file: File): Promise<RawExcelData> {
  const arrayBuffer = await file.arrayBuffer();

  let workbook;
  try {
    // Try standard read first
    workbook = XLSX.read(arrayBuffer, {
      cellFormula: false,
      cellStyles: true,
      raw: true,
      WTF: true
    });
  } catch (error: any) {
    // If encryption error, try with password
    if (error.message?.includes('Encrypted')) {
      try {
        workbook = XLSX.read(arrayBuffer, {
          cellFormula: false,
          cellStyles: true,
          raw: true,
          WTF: true,
          password: ""
        });
      } catch {
        // If password also fails, try one more time with minimal options
        workbook = XLSX.read(arrayBuffer, {
          cellFormula: false,
          cellStyles: false,
          raw: true,
          WTF: true,
          password: ""
        });
      }
    } else {
      throw error;
    }
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('No sheets found in Excel file');
  }

  const worksheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  const totalRows = range.e.r + 1;
  const totalCols = range.e.c + 1;

  // Extract row heights and column widths
  const rowHeights = new Map<number, number>();
  const colWidths = new Map<number, number>();

  if (worksheet['!rows']) {
    worksheet['!rows'].forEach((row: any, idx: number) => {
      const px = rowHeightToPx(row);
      if (px) rowHeights.set(idx, px);
    });
  }

  if (worksheet['!cols']) {
    worksheet['!cols'].forEach((col: any, idx: number) => {
      const px = colWidthToPx(col);
      if (px) colWidths.set(idx, px);
    });
  }

  // Extract all cells with values
  const cells: RawExcelCell[] = [];
  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < totalCols; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[cellAddr];

      if (cell && cell.v) {
        cells.push({
          address: cellAddr,
          row: r,
          col: c,
          value: cell.v,
          fill: cell.s?.fgColor ? {
            rgb: cell.s.fgColor.rgb,
            index: cell.s.fgColor.index
          } : undefined
        });
      }
    }
  }

  // Extract merged ranges
  const mergedRanges: RawExcelMergedRange[] = [];
  if (worksheet['!merges']) {
    worksheet['!merges'].forEach((range: any) => {
      const startCell = XLSX.utils.encode_cell({ r: range.s.r, c: range.s.c });
      const cell = worksheet[startCell];

      mergedRanges.push({
        startRow: range.s.r,
        startCol: range.s.c,
        endRow: range.e.r,
        endCol: range.e.c,
        value: cell?.v,
        fill: cell?.s?.fgColor ? {
          rgb: cell.s.fgColor.rgb,
          index: cell.s.fgColor.index
        } : undefined
      });
    });
  }

  const metadata: ExcelSheetMetadata = {
    name: sheetName,
    totalRows,
    totalCols,
    rowHeights,
    colWidths
  };

  return {
    metadata,
    cells,
    mergedRanges
  };
}
