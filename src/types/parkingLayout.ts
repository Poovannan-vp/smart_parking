/**
 * Represents the physical parking layout for a location.
 * Separate from dynamic parking status.
 */

export interface ParkingSlot {
  /** Unique slot ID within location: "P1", "P7", "ACCESSIBLE-01", "PILLAR-1", "PASSAGE", etc. */
  id: string;

  /** Display number/name */
  slotNumber: string;

  /** Physical position in layout (SVG coordinates) */
  position: {
    x: number;      // X coordinate in SVG
    y: number;      // Y coordinate in SVG
    width: number;  // Width of slot
    height: number; // Height of slot
    row?: number;   // Optional: grid row (legacy)
    col?: number;   // Optional: grid col (legacy)
  };

  /** Rotation in degrees (0-360) */
  rotation?: number;

  /** Type of cell in layout */
  type: "standard" | "accessible" | "compact" | "bike" | "passage" | "pillar" | "utility" | "empty";

  /** Which parking area this slot belongs to (for grouping) */
  parkingArea?: string;

  /** Optional descriptive location */
  description?: string;
}

/**
 * Single parking level/floor within an area
 */
export interface ParkingLevel {
  /** Level/floor ID: "level-1", "level-2", "ground-floor", etc. */
  id: string;

  /** Display name: "Level 1", "Ground Floor", etc. */
  name: string;

  /** All parking slots on this level */
  slots: ParkingSlot[];

  /** Capacity information for this level */
  capacity?: {
    total: number;
    accessible: number;
    standard: number;
  };
}

/**
 * Parking area with one or more levels
 */
export interface ParkingArea {
  /** Area ID: "main-parking", "extended-parking", "basement", etc. */
  id: string;

  /** Display name: "Main Parking", "Extended Parking", etc. */
  name: string;

  /** Description of this parking area */
  description?: string;

  /** Levels/floors in this area */
  levels: ParkingLevel[];

  /** Capacity information for entire area */
  capacity?: {
    total: number;
    accessible: number;
    standard: number;
  };
}

export interface ParkingLayoutConfig {
  /** Location/building ID */
  locationId: string;

  /** Location/building description */
  description: string;

  /** Parking areas within this location (can have multiple) */
  areas: ParkingArea[];

  /** Default area to display first */
  defaultAreaId?: string;

  /** Default level to display first (within the default area) */
  defaultLevelId?: string;

  /** Total capacity across all areas/levels */
  capacity?: {
    total: number;
    accessible: number;
    standard: number;
  };

  /**
   * Legacy: Direct slots (for single-area, single-level locations)
   * Use 'areas' for new implementations
   */
  slots?: ParkingSlot[];
  grid?: {
    rows: number;
    cols: number;
  };
  parkingAreas?: string[];
}

/**
 * A named, independently-selectable physical layout belonging to a single
 * location (building). A location can have multiple Layouts - the name is
 * purely an admin-defined label and carries no special meaning to the
 * system. Exactly one Layout per location may have isDefault = true.
 *
 * The layout's identity is its `id` (a stable Firestore document id),
 * never its `name` - a layout can be renamed without changing what it is.
 */
export interface Layout {
  /** Stable document id. Never derived from the name. */
  id: string;

  /** The location (building) this layout belongs to. */
  locationId: string;

  /** Admin-defined display name, e.g. "Default Parking", "Extension Floor 2". */
  name: string;

  /** True for the one layout a location falls back to when none is chosen. */
  isDefault: boolean;

  /** The physical layout objects - geometry only, no operational state. */
  slots: ParkingSlot[];

  /** Optional reference blueprint image shown at low opacity while editing. */
  blueprintImage?: string;

  createdAt?: unknown;
  updatedAt?: unknown;
  updatedBy?: string;
}

/**
 * Operational status of a single trackable parking slot. Kept entirely
 * separate from the Layout's physical geometry - changing a slot's status
 * never touches its position/size/rotation, and vice versa.
 */
export type SlotStatusValue = "AVAILABLE" | "OCCUPIED" | "BLOCKED";

/** One slot's entry within a Layout's status document, keyed by ParkingSlot.id. */
export interface SlotStatusEntry {
  status: SlotStatusValue;
  updatedAt?: unknown;
  updatedBy?: string;
}

/**
 * Runtime parking slot with dynamic status
 * Paired with static ParkingSlot layout information
 */
export interface ParkingSlotStatus {
  /** Slot ID */
  slotId: string;

  /** Location ID */
  locationId: string;

  /** Current physical status */
  status: "AVAILABLE" | "OCCUPIED";

  /** If occupied, reference to active assignment (future use) */
  currentAssignmentId?: string | null;

  /** Timestamp of last status change */
  lastStatusChange: Date;

  /** Who made the last status change */
  lastUpdatedBy?: string;
}
