/**
 * Excel Geometry Extractor
 *
 * Extracts PHYSICAL geometry from Excel workbook
 * WITHOUT pre-classification
 *
 * Every meaningful Excel cell/merged range becomes a physical rectangle
 * with coordinates derived from the Excel structure
 */

import type { RawExcelData } from '../excelLayoutParser';

export interface ExtractedElement {
  // Source information (CRITICAL for debugging)
  sourceType: 'cell' | 'mergedRange';
  sourceAddress: string;      // e.g., "B21" or "C21:C22"
  rawValue: string;           // Raw cell value

  // Physical geometry (from Excel structure)
  x: number;                  // Left edge
  y: number;                  // Top edge
  width: number;              // Physical width
  height: number;             // Physical height

  // Metadata
  type: string;               // What the source represents (PARKING_SPACE, PILLAR, PASSAGE, AREA, LABEL, etc.)
  label: string;              // Display text

  // Additional info
  rowSpan?: number;           // Rows in merged range
  colSpan?: number;           // Columns in merged range
}

// Last-resort fallbacks, only used if a sheet has *zero* explicit row/column
// sizing anywhere (nothing to derive a default from). Not Bangalore-specific -
// these are generic Excel defaults (default row height ~15pt, default column
// width ~8.43 characters, both converted to px).
const FALLBACK_ROW_HEIGHT_PX = 20;
const FALLBACK_COL_WIDTH_PX = 64;

/** Most frequently occurring value in a list (the sheet's own "typical" size). */
function mostCommon(values: number[], fallback: number): number {
  if (values.length === 0) return fallback;
  const counts = new Map<number, number>();
  let best = values[0];
  let bestCount = 0;
  for (const v of values) {
    const count = (counts.get(v) ?? 0) + 1;
    counts.set(v, count);
    if (count > bestCount) {
      bestCount = count;
      best = v;
    }
  }
  return best;
}

/**
 * Cumulative pixel offsets for every row/column boundary in the sheet,
 * derived entirely from the workbook's own (already pixel-normalized)
 * row heights / column widths. Rows/columns with no explicit size fall
 * back to the sheet's own most common size, not an invented constant.
 */
interface AxisOffsets {
  offsets: number[]; // offsets[i] = pixel position of the start of row/col i
}

function buildAxisOffsets(sizes: Map<number, number>, count: number, fallbackConstant: number): AxisOffsets {
  const defaultSize = mostCommon([...sizes.values()], fallbackConstant);
  const offsets: number[] = [0];
  for (let i = 0; i < count; i++) {
    const size = sizes.get(i) ?? defaultSize;
    offsets.push(offsets[offsets.length - 1] + size);
  }
  return { offsets };
}

function axisPosition(axis: AxisOffsets, index: number): number {
  return axis.offsets[index];
}

function axisSpan(axis: AxisOffsets, startIndex: number, endIndex: number): number {
  return axis.offsets[endIndex + 1] - axis.offsets[startIndex];
}

function classifyElementType(value: string): string {
  const v = String(value).toUpperCase().trim();

  // Parking spaces: P-1, P-2, ..., P-84
  if (v.match(/^P-?\d+$/)) return 'PARKING_SPACE';

  // Pillars
  if (v.includes('PILLAR')) return 'PILLAR';

  // Passages/corridors
  if (v.includes('PASSAGE')) return 'PASSAGE';

  // Large areas
  if (v.includes('PARKING FOR OTHERS') || v.includes('PARKING FOR OTHERS')) return 'AREA';

  // Generic labels (area headers, section names, etc.)
  if (v.match(/^[A-Z0-9\s\-]+$/)) return 'LABEL';

  return 'OTHER';
}

export function extractAllElements(rawData: RawExcelData): ExtractedElement[] {
  const elements: ExtractedElement[] = [];
  const processedCells = new Set<string>();

  const rowAxis = buildAxisOffsets(rawData.metadata.rowHeights, rawData.metadata.totalRows, FALLBACK_ROW_HEIGHT_PX);
  const colAxis = buildAxisOffsets(rawData.metadata.colWidths, rawData.metadata.totalCols, FALLBACK_COL_WIDTH_PX);

  // PASS 1: Extract merged ranges first (they define larger regions)
  for (const merged of rawData.mergedRanges) {
    if (!merged.value) continue;

    const value = String(merged.value).toUpperCase().trim();
    const rowSpan = merged.endRow - merged.startRow + 1;
    const colSpan = merged.endCol - merged.startCol + 1;

    const x = axisPosition(colAxis, merged.startCol);
    const y = axisPosition(rowAxis, merged.startRow);
    const width = axisSpan(colAxis, merged.startCol, merged.endCol);
    const height = axisSpan(rowAxis, merged.startRow, merged.endRow);

    const type = classifyElementType(value);

    // Only include non-empty merged ranges
    if (width > 0 && height > 0) {
      const startColLetter = String.fromCharCode(65 + merged.startCol);
      const endColLetter = String.fromCharCode(65 + merged.endCol);
      const sourceAddress = `${startColLetter}${merged.startRow + 1}:${endColLetter}${merged.endRow + 1}`;

      elements.push({
        sourceType: 'mergedRange',
        sourceAddress,
        rawValue: value,
        x,
        y,
        width,
        height,
        type,
        label: value,
        rowSpan,
        colSpan
      });

      // Mark these cells as processed
      for (let r = merged.startRow; r <= merged.endRow; r++) {
        for (let c = merged.startCol; c <= merged.endCol; c++) {
          processedCells.add(`${r},${c}`);
        }
      }
    }
  }

  // PASS 2: Extract individual cells (not already processed)
  for (const cell of rawData.cells) {
    const key = `${cell.row},${cell.col}`;
    if (processedCells.has(key)) continue;

    const value = String(cell.value).toUpperCase().trim();
    const type = classifyElementType(value);

    // Only process meaningful elements
    if (type === 'OTHER' && !value.match(/^[A-Z0-9\s\-]*$/)) continue;

    const x = axisPosition(colAxis, cell.col);
    const y = axisPosition(rowAxis, cell.row);
    const width = axisSpan(colAxis, cell.col, cell.col);
    const height = axisSpan(rowAxis, cell.row, cell.row);

    if (width > 0 && height > 0) {
      const colLetter = String.fromCharCode(65 + cell.col);
      const sourceAddress = `${colLetter}${cell.row + 1}`;

      elements.push({
        sourceType: 'cell',
        sourceAddress,
        rawValue: value,
        x,
        y,
        width,
        height,
        type,
        label: value,
        rowSpan: 1,
        colSpan: 1
      });

      processedCells.add(key);
    }
  }

  return elements;
}

export function generateDiagnostics(elements: ExtractedElement[]): {
  total: number;
  byType: Record<string, number>;
  elements: ExtractedElement[];
} {
  const byType: Record<string, number> = {};

  for (const elem of elements) {
    byType[elem.type] = (byType[elem.type] || 0) + 1;
  }

  return {
    total: elements.length,
    byType,
    elements
  };
}
