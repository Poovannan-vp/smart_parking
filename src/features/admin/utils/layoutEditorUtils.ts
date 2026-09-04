/**
 * Utility functions for layout editor
 * Slot manipulation, positioning, rotation, etc.
 */

import type { ParkingSlot, SlotStatusValue } from "../../../types/parkingLayout";

/**
 * Generate unique slot ID
 */
export function generateSlotId(): string {
  return `SLOT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new parking slot with default values
 */
export function createNewSlot(
  slotNumber: string,
  x: number,
  y: number,
  type: ParkingSlot["type"] = "standard",
  parkingArea: string = "Main Parking"
): ParkingSlot {
  return {
    id: generateSlotId(),
    slotNumber,
    position: { x, y, width: 60, height: 40 },
    rotation: 0,
    type,
    parkingArea,
  };
}

/**
 * Duplicate a slot with new position
 */
export function duplicateSlot(slot: ParkingSlot, offsetX: number = 10, offsetY: number = 10): ParkingSlot {
  return {
    ...slot,
    id: generateSlotId(),
    position: {
      ...slot.position,
      x: slot.position.x + offsetX,
      y: slot.position.y + offsetY,
    },
  };
}

/**
 * Move a slot to new position
 */
export function moveSlot(slot: ParkingSlot, newX: number, newY: number): ParkingSlot {
  return {
    ...slot,
    position: { ...slot.position, x: newX, y: newY },
  };
}

/**
 * Resize a slot
 */
export function resizeSlot(
  slot: ParkingSlot,
  newWidth: number,
  newHeight: number
): ParkingSlot {
  return {
    ...slot,
    position: { ...slot.position, width: newWidth, height: newHeight },
  };
}

/**
 * Rotate a slot (in degrees)
 */
export function rotateSlot(slot: ParkingSlot, degrees: number): ParkingSlot {
  // Normalize to 0-360
  const rotation = ((degrees % 360) + 360) % 360;
  return {
    ...slot,
    rotation,
  };
}

/**
 * Update slot property
 */
export function updateSlotProperty<K extends keyof ParkingSlot>(
  slot: ParkingSlot,
  key: K,
  value: ParkingSlot[K]
): ParkingSlot {
  return { ...slot, [key]: value };
}

/**
 * Get slot color for type
 */
export function getSlotColor(type: ParkingSlot["type"]): string {
  const colors: Record<ParkingSlot["type"], string> = {
    standard: "#dcfce7", // light green
    accessible: "#dbeafe", // light blue
    compact: "#fef3c7", // light yellow
    bike: "#fbcfe8", // light pink
    passage: "#f3f4f6", // light gray
    pillar: "#d1d5db", // medium gray
    utility: "#fed7aa", // light amber
    empty: "#ffffff", // white
  };
  return colors[type] || "#ffffff";
}

/**
 * Get slot border color
 */
export function getSlotBorderColor(type: ParkingSlot["type"]): string {
  const colors: Record<ParkingSlot["type"], string> = {
    standard: "#16a34a", // green
    accessible: "#0284c7", // blue
    compact: "#ca8a04", // yellow
    bike: "#ec4899", // pink
    passage: "#9ca3af", // gray
    pillar: "#6b7280", // dark gray
    utility: "#d97706", // amber
    empty: "#e5e7eb", // light gray
  };
  return colors[type] || "#e5e7eb";
}

/**
 * Get fill color for a trackable slot's operational status
 */
export function getStatusColor(status: SlotStatusValue): string {
  const colors: Record<SlotStatusValue, string> = {
    AVAILABLE: "#dcfce7", // light green
    OCCUPIED: "#fee2e2", // light red
    BLOCKED: "#e5e7eb", // light gray
  };
  return colors[status];
}

/**
 * Get border color for a trackable slot's operational status
 */
export function getStatusBorderColor(status: SlotStatusValue): string {
  const colors: Record<SlotStatusValue, string> = {
    AVAILABLE: "#16a34a", // green
    OCCUPIED: "#ef4444", // red
    BLOCKED: "#6b7280", // dark gray
  };
  return colors[status];
}

/**
 * Check if point is inside slot
 */
export function isPointInSlot(
  px: number,
  py: number,
  slot: ParkingSlot,
  tolerance: number = 5
): boolean {
  const { x, y, width, height } = slot.position;
  return px >= x - tolerance && px <= x + width + tolerance && py >= y - tolerance && py <= y + height + tolerance;
}

/**
 * Check if point is near resize handle (bottom-right corner)
 */
export function isNearResizeHandle(
  px: number,
  py: number,
  slot: ParkingSlot,
  handleSize: number = 10
): boolean {
  const { x, y, width, height } = slot.position;
  const hx = x + width;
  const hy = y + height;
  return px >= hx - handleSize && px <= hx + handleSize && py >= hy - handleSize && py <= hy + handleSize;
}

/**
 * Calculate canvas dimensions from slots
 */
export function getCanvasDimensions(slots: ParkingSlot[]): { width: number; height: number } {
  if (slots.length === 0) {
    return { width: 800, height: 600 };
  }
  const maxX = Math.max(...slots.map((s) => s.position.x + s.position.width)) + 20;
  const maxY = Math.max(...slots.map((s) => s.position.y + s.position.height)) + 20;
  return { width: Math.max(maxX, 800), height: Math.max(maxY, 600) };
}
