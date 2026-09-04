import type { ParkingLevel, ParkingArea, ParkingLayoutConfig, ParkingSlot } from '@/types/parkingLayout';
import { parseExcelFile } from '../excelLayoutParser';
import { extractAllElements, generateDiagnostics } from './excelGeometryExtractor';
import { analyzeFileFormat } from './fileFormatAnalyzer';
import { detectLayoutFileFormat } from './layoutFormatDetector';

export interface ImportResult {
  success: boolean;
  layout?: ParkingLayoutConfig;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  slotCount: {
    total: number;
    standard: number;
    bike: number;
    pillars: number;
    passages: number;
    other: number;
  };
}

export async function importBangaloreLayout(
  file: File,
  locationId: string = 'bangalore'
): Promise<ImportResult> {
  try {
    // Detect file format
    const formatInfo = detectLayoutFileFormat(file);

    // Route to appropriate importer based on format
    switch (formatInfo.format) {
      case 'excel':
        return await importBangaloreLayoutFromExcelFile(file, locationId);

      case 'image':
        return await handleUnimplementedFormat(formatInfo, 'Image analysis');

      case 'pdf':
        return await handleUnimplementedFormat(formatInfo, 'PDF extraction');

      case 'svg':
        return await handleUnimplementedFormat(formatInfo, 'SVG parsing');

      default:
        return {
          success: false,
          validation: {
            valid: false,
            errors: [
              `Unsupported file format: ${file.name}`,
              `Supported formats: .xlsx, .xls, .xlsm, .csv, .png, .jpg, .jpeg, .pdf, .svg`
            ],
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
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      validation: {
        valid: false,
        errors: [`Failed to import file: ${message}`],
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
    };
  }
}

// For backwards compatibility
export async function importBangaloreLayoutFromExcel(
  excelFile: File,
  locationId: string = 'bangalore'
): Promise<ImportResult> {
  return importBangaloreLayout(excelFile, locationId);
}

async function importBangaloreLayoutFromExcelFile(
  excelFile: File,
  locationId: string
): Promise<ImportResult> {
  try {
    // STEP 1: Analyze actual file format
    const formatAnalysis = await analyzeFileFormat(excelFile);

    // If file cannot be parsed, report technical limitation
    if (!formatAnalysis.canParse) {
      return {
        success: false,
        validation: {
          valid: false,
          errors: [formatAnalysis.errorMessage || 'File format not supported'],
          warnings: formatAnalysis.suggestions || []
        },
        slotCount: {
          total: 0,
          standard: 0,
          bike: 0,
          pillars: 0,
          passages: 0,
          other: 0
        }
      };
    }

    // STEP 2: Parse Excel file
    let rawData;
    try {
      rawData = await parseExcelFile(excelFile);
    } catch (parseError) {
      const errorMsg = parseError instanceof Error ? parseError.message : 'Parse error';
      return {
        success: false,
        validation: {
          valid: false,
          errors: [
            `Failed to parse ${formatAnalysis.fileFormat.toUpperCase()} file`,
            errorMsg
          ],
          warnings: [
            'File may be corrupted or in an unexpected format',
            'Try opening in Excel/LibreOffice and saving again'
          ]
        },
        slotCount: {
          total: 0,
          standard: 0,
          bike: 0,
          pillars: 0,
          passages: 0,
          other: 0
        }
      };
    }

    // STEP 3: Extract physical geometry from Excel structure
    const extractedElements = extractAllElements(rawData);

    // Get diagnostics
    const diagnostics = generateDiagnostics(extractedElements);

    // STEP 4: Convert extracted elements to ParkingSlot objects
    const slots: ParkingSlot[] = extractedElements.map((elem, idx) => ({
      id: `${elem.sourceAddress}-${idx}`,
      slotNumber: elem.label,
      position: {
        x: elem.x,
        y: elem.y,
        width: elem.width,
        height: elem.height
      },
      type: mapElementTypeToParkingSlotType(elem.type),
      parkingArea: elem.type,
      description: `Source: ${elem.sourceAddress} (${elem.sourceType})`
    }));

    // Basic validation (non-blocking - report what was found)
    const validation = {
      valid: slots.length > 0,
      errors: slots.length === 0 ? ['No elements extracted from file'] : [],
      warnings: [
        `Detected format: ${formatAnalysis.fileFormat.toUpperCase()}`,
        `Elements extracted: ${slots.length}`,
        'This is a preview of extracted geometry. No data has been saved.'
      ]
    };

    // Count element types (NOT vehicle classification)
    const slotCount = {
      total: diagnostics.total,
      standard: diagnostics.byType['PARKING_SPACE'] || 0,
      bike: 0,  // Not classified during extraction
      pillars: diagnostics.byType['PILLAR'] || 0,
      passages: diagnostics.byType['PASSAGE'] || 0,
      other: (diagnostics.byType['AREA'] || 0) + (diagnostics.byType['LABEL'] || 0) + (diagnostics.byType['OTHER'] || 0)
    };

    // Organize into layout structure
    // All Bangalore parking goes into a single level for now
    const level: ParkingLevel = {
      id: 'level-1',
      name: 'Ground Floor',
      slots: slots,
      capacity: {
        total: slotCount.standard + slotCount.bike,
        standard: slotCount.standard,
        accessible: 0
      }
    };

    const area: ParkingArea = {
      id: 'b4-section',
      name: 'B4 Section',
      description: 'Bangalore Parking - Car and Bike',
      levels: [level],
      capacity: {
        total: slotCount.standard + slotCount.bike,
        standard: slotCount.standard,
        accessible: 0
      }
    };

    const layout: ParkingLayoutConfig = {
      locationId,
      description: 'Bangalore Office - B4 Parking Section (from Excel import)',
      areas: [area],
      defaultAreaId: 'b4-section',
      defaultLevelId: 'level-1',
      capacity: {
        total: slotCount.standard + slotCount.bike,
        standard: slotCount.standard,
        accessible: 0
      }
    };

    return {
      success: validation.valid,
      layout,
      validation,
      slotCount
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      validation: {
        valid: false,
        errors: [`Failed to import Excel file: ${message}`],
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
    };
  }
}

function mapElementTypeToParkingSlotType(elementType: string): ParkingSlot['type'] {
  switch (elementType) {
    case 'PARKING_SPACE':
      return 'utility'; // Neutral type - actual vehicle type determined later
    case 'PILLAR':
      return 'pillar';
    case 'PASSAGE':
      return 'passage';
    case 'AREA':
      return 'utility';
    case 'LABEL':
    case 'OTHER':
    default:
      return 'empty';
  }
}

async function handleUnimplementedFormat(
  formatInfo: any,
  stage: string
): Promise<ImportResult> {
  return {
    success: false,
    validation: {
      valid: false,
      errors: [
        `${formatInfo.displayName} import is not yet implemented`,
        `Currently only Excel formats (.xlsx, .xls, .csv) are fully supported`
      ],
      warnings: [
        `This format is planned for future releases`,
        `Architecture is in place for ${stage}`
      ]
    },
    slotCount: {
      total: 0,
      standard: 0,
      bike: 0,
      pillars: 0,
      passages: 0,
      other: 0
    }
  };
}

export async function saveBangaloreLayoutToDraft(
  layout: ParkingLayoutConfig,
  version: number = 1
) {
  // This will be called from the UI to save to Firestore
  // The actual Firestore save is handled by parkingLayoutService
  return {
    locationId: layout.locationId,
    version,
    status: 'draft' as const,
    layout,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}
