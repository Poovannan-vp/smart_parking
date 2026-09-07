/**
 * Read-only-by-default physical layout renderer.
 *
 * Renders the saved geometry of a Layout exactly as stored. Shared by
 * Employee, Security, and Admin, so there is one renderer rather than a
 * role-specific copy. Callers that don't pass `getSlotStatus` see exactly
 * the previous behavior (every slot colored by its physical `type`, no
 * interaction). When `getSlotStatus` is provided, only slots that
 * `isTrackableSlot` recognizes as actual parking slots switch to
 * status-based coloring and (if `onSlotClick` is also given) become
 * clickable - every other layout object (pillars, passages, lift lobby,
 * etc.) keeps rendering exactly as before, static and unclickable.
 *
 * When a caller additionally supplies `selectedSlot` + `onClosePopover`
 * (Security's status-editing flow), clicking a trackable slot opens a small
 * popover anchored to that exact slot on the map. Its content depends on
 * the slot's current status: AVAILABLE offers "Log Vehicle" (which opens a
 * bottom-sheet vehicle-entry form via `onOccupy`) and "Block" (`onStatusChange`
 * direct, no vehicle involved); BLOCKED offers "Mark Available"
 * (`onStatusChange`); OCCUPIED shows the logged vehicle's details and a
 * "Free Slot" action (`onFree`). The popover/modal are pure
 * presentation/positioning - they never talk to Firestore themselves, only
 * report the chosen action back to the caller.
 *
 * The map itself supports pinch/scroll zoom and drag-to-pan (only once
 * zoomed in - at the default fit-to-width zoom there is nothing to pan)
 * so dense layouts stay usable with touch on a phone, plus an oversized
 * invisible hit-area per trackable slot for more forgiving tapping.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { HiMagnifyingGlassPlus, HiMagnifyingGlassMinus, HiArrowPath } from "react-icons/hi2";

import type { ParkingSlot, SlotStatusEntry, SlotStatusValue } from "../../../types/parkingLayout";
import type { VehicleDirectoryEntry } from "../../../services/employeeVehicleService";
import {
  getSlotColor,
  getSlotBorderColor,
  getCanvasDimensions,
  getStatusColor,
  getStatusBorderColor,
} from "../../admin/utils/layoutEditorUtils";
import { isTrackableSlot } from "../utils/isTrackableSlot";
import { normalizeVehicleNumber } from "../../../services/vehicleUtils";
import Modal from "../../../shared/components/Modal";
import Button from "../../../shared/components/Button";

interface OccupyDetails {
  vehicleNumber: string;
  vehicleType: "CAR" | "BIKE";
}

interface PhysicalLayoutViewProps {
  slots: ParkingSlot[];
  title?: string;
  /** When provided, trackable slots are colored by status instead of type. */
  getSlotStatus?: (slotId: string) => SlotStatusValue;
  /** Full status entry (vehicle info included) for the vehicle-aware popover. */
  getSlotEntry?: (slotId: string) => SlotStatusEntry | undefined;
  /** When provided (with `getSlotStatus`), trackable slots become clickable. */
  onSlotClick?: (slot: ParkingSlot) => void;
  /** The slot whose status popover should be open (controlled by the caller). */
  selectedSlot?: ParkingSlot | null;
  /** Direct, vehicle-free status changes: AVAILABLE <-> BLOCKED. */
  onStatusChange?: (status: SlotStatusValue) => void;
  /** Confirmed from the vehicle-entry sheet - marks OCCUPIED with a logged vehicle. */
  onOccupy?: (details: OccupyDetails) => Promise<void> | void;
  /** Frees an OCCUPIED slot (the vehicle exited). */
  onFree?: () => Promise<void> | void;
  /** Registered-vehicle typeahead source for the vehicle-entry sheet. */
  vehicleDirectory?: VehicleDirectoryEntry[];
  /** Disables popover/sheet actions while a change is in flight. */
  savingStatus?: boolean;
  /** Shown in the popover/sheet when the last change failed. */
  statusError?: string | null;
  /** Called to close the popover (close button, outside click, Escape). */
  onClosePopover?: () => void;
}

const STATUS_LEGEND: Array<{ status: SlotStatusValue; label: string }> = [
  { status: "AVAILABLE", label: "Available" },
  { status: "OCCUPIED", label: "Occupied" },
  { status: "BLOCKED", label: "Blocked" },
];

const POPOVER_WIDTH = 208;
const POPOVER_GAP = 10;
const POPOVER_MARGIN = 8;
const HIT_PADDING = 6;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;

interface PopoverPosition {
  left: number;
  top: number;
  arrowLeft: number;
  placement: "above" | "below";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function PhysicalLayoutView({
  slots,
  title,
  getSlotStatus,
  getSlotEntry,
  onSlotClick,
  selectedSlot,
  onStatusChange,
  onOccupy,
  onFree,
  vehicleDirectory,
  savingStatus,
  statusError,
  onClosePopover,
}: PhysicalLayoutViewProps) {
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const mapSurfaceRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef(new Map<string, SVGGElement>());
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null);

  const popoverEnabled = Boolean(onClosePopover && getSlotStatus && (onStatusChange || onOccupy || onFree));
  const openSlot = popoverEnabled ? selectedSlot ?? null : null;

  // --- Zoom / pan --------------------------------------------------------
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const dragStateRef = useRef<{ pointerId: number; startX: number; startY: number; panX: number; panY: number } | null>(null);
  const draggedRef = useRef(false);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const activePointers = useRef(new Map<number, { x: number; y: number }>());

  // A layout switch (different slot set) resets the view; a status update
  // on the same layout (new array reference, same slot ids) must not.
  const layoutKey = useMemo(() => slots.map((slot) => slot.id).join("|"), [slots]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [layoutKey]);

  function clampPan(nextPan: { x: number; y: number }, atZoom: number) {
    const wrapperRect = mapSurfaceRef.current?.getBoundingClientRect();
    if (!wrapperRect || atZoom <= 1) return { x: 0, y: 0 };

    const maxX = (wrapperRect.width * (atZoom - 1)) / 2;
    const maxY = (wrapperRect.height * (atZoom - 1)) / 2;
    return { x: clamp(nextPan.x, -maxX, maxX), y: clamp(nextPan.y, -maxY, maxY) };
  }

  function applyZoom(nextZoom: number) {
    const clamped = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    setZoom(clamped);
    setPan((current) => clampPan(current, clamped));
  }

  // React attaches its delegated wheel listener as passive by default, so
  // event.preventDefault() inside a normal onWheel prop is silently a
  // no-op (and logs a warning) - it can never stop the page from also
  // scrolling underneath the zoom. A native, explicitly non-passive
  // listener is the only way to actually prevent that.
  useEffect(() => {
    const surface = mapSurfaceRef.current;
    if (!surface) return;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      applyZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    }

    surface.addEventListener("wheel", handleWheel, { passive: false });
    return () => surface.removeEventListener("wheel", handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  function pointerDistance() {
    const points = Array.from(activePointers.current.values());
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    draggedRef.current = false;

    if (activePointers.current.size === 2) {
      dragStateRef.current = null;
      pinchRef.current = { distance: pointerDistance(), zoom };
      setIsGesturing(true);
      return;
    }

    if (zoom > 1) {
      (event.currentTarget as HTMLDivElement).setPointerCapture?.(event.pointerId);
      dragStateRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, panX: pan.x, panY: pan.y };
      setIsGesturing(true);
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (activePointers.current.has(event.pointerId)) {
      activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (pinchRef.current && activePointers.current.size === 2) {
      const distance = pointerDistance();
      if (pinchRef.current.distance > 0) {
        applyZoom(pinchRef.current.zoom * (distance / pinchRef.current.distance));
      }
      draggedRef.current = true;
      return;
    }

    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.hypot(dx, dy) > 6) draggedRef.current = true;

    setPan(clampPan({ x: drag.panX + dx, y: drag.panY + dy }, zoom));
  }

  function endPointer(event: ReactPointerEvent<HTMLDivElement>) {
    activePointers.current.delete(event.pointerId);
    if (activePointers.current.size < 2) pinchRef.current = null;
    if (dragStateRef.current?.pointerId === event.pointerId) dragStateRef.current = null;
    if (!pinchRef.current && !dragStateRef.current) setIsGesturing(false);
  }

  // --- Popover / vehicle-entry sheet -------------------------------------
  const [vehicleSheetOpen, setVehicleSheetOpen] = useState(false);
  const [vehicleNumberInput, setVehicleNumberInput] = useState("");
  const [vehicleTypeInput, setVehicleTypeInput] = useState<"CAR" | "BIKE">("CAR");

  useLayoutEffect(() => {
    if (!openSlot) {
      setPopoverPosition(null);
      return;
    }

    function recompute() {
      const wrapperEl = mapWrapperRef.current;
      const slotEl = openSlot ? slotRefs.current.get(openSlot.id) : undefined;
      if (!wrapperEl || !slotEl) return;

      const wrapperRect = wrapperEl.getBoundingClientRect();
      const slotRect = slotEl.getBoundingClientRect();
      const popoverWidth = popoverRef.current?.offsetWidth ?? POPOVER_WIDTH;
      const popoverHeight = popoverRef.current?.offsetHeight ?? 160;

      const slotLeft = slotRect.left - wrapperRect.left;
      const slotTop = slotRect.top - wrapperRect.top;
      const slotCenterX = slotLeft + slotRect.width / 2;
      const slotBottom = slotTop + slotRect.height;

      const spaceBelow = wrapperRect.height - slotBottom - POPOVER_GAP;
      const spaceAbove = slotTop - POPOVER_GAP;

      let top =
        popoverHeight <= spaceBelow || spaceBelow >= spaceAbove
          ? slotBottom + POPOVER_GAP
          : slotTop - POPOVER_GAP - popoverHeight;

      top = Math.max(POPOVER_MARGIN, Math.min(top, wrapperRect.height - popoverHeight - POPOVER_MARGIN));

      const slotCenterY = slotTop + slotRect.height / 2;
      const placement: PopoverPosition["placement"] = top + popoverHeight / 2 >= slotCenterY ? "below" : "above";

      const left = Math.max(
        POPOVER_MARGIN,
        Math.min(slotCenterX - popoverWidth / 2, wrapperRect.width - popoverWidth - POPOVER_MARGIN),
      );
      const arrowLeft = Math.max(14, Math.min(slotCenterX - left, popoverWidth - 14));

      setPopoverPosition({ left, top, arrowLeft, placement });
    }

    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSlot?.id, statusError, savingStatus, zoom, pan.x, pan.y]);

  useEffect(() => {
    if (!openSlot) return;

    function handlePointerDownOutside(event: PointerEvent) {
      // The vehicle-entry sheet renders in its own DOM subtree (a Modal),
      // not inside popoverRef - every pointerdown inside it (the input,
      // a suggestion, Confirm) would otherwise read as "outside the
      // popover" and close everything before the click's own handler
      // ever runs. The sheet owns its own dismissal (backdrop/Escape/
      // Cancel) while it's open, so this listener stands down until then.
      if (vehicleSheetOpen) return;
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClosePopover?.();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (vehicleSheetOpen) return;
      if (event.key === "Escape") onClosePopover?.();
    }

    document.addEventListener("pointerdown", handlePointerDownOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openSlot, onClosePopover, vehicleSheetOpen]);

  // Reset the vehicle-entry sheet whenever a different slot is opened/closed.
  useEffect(() => {
    setVehicleSheetOpen(false);
    setVehicleNumberInput("");
    setVehicleTypeInput(openSlot?.type === "bike" ? "BIKE" : "CAR");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSlot?.id]);

  if (!slots || slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        This layout has no physical objects yet.
      </div>
    );
  }

  const canvasDims = getCanvasDimensions(slots);
  const currentStatus = openSlot && getSlotStatus ? getSlotStatus(openSlot.id) : undefined;
  const currentEntry = openSlot && getSlotEntry ? getSlotEntry(openSlot.id) : undefined;

  const normalizedInput = normalizeVehicleNumber(vehicleNumberInput);
  const suggestions = (vehicleDirectory ?? [])
    .filter((entry) => normalizedInput.length > 0 && entry.registrationNumber.includes(normalizedInput))
    .slice(0, 5);
  const exactMatch = (vehicleDirectory ?? []).find((entry) => entry.registrationNumber === normalizedInput);

  async function confirmOccupy() {
    if (!onOccupy || normalizedInput.length < 4) return;
    try {
      await onOccupy({ vehicleNumber: normalizedInput, vehicleType: vehicleTypeInput });
      setVehicleSheetOpen(false);
    } catch {
      // Left open - the caller surfaces the failure via `statusError`.
    }
  }

  async function confirmFree() {
    if (!onFree) return;
    try {
      await onFree();
    } catch {
      // The caller surfaces the failure via `statusError`.
    }
  }

  return (
    <div className="space-y-3">
      {title ? <h3 className="text-sm font-semibold text-slate-900">{title}</h3> : null}

      {getSlotStatus ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap gap-3">
            {STATUS_LEGEND.map(({ status, label }) => (
              <div key={status} className="flex items-center gap-1.5">
                <span
                  className="h-3 w-3 rounded-sm border"
                  style={{ background: getStatusColor(status), borderColor: getStatusBorderColor(status) }}
                />
                <span className="text-slate-600">{label}</span>
              </div>
            ))}
          </div>
          {zoom > 1 ? <span className="text-slate-400">Drag to pan · {Math.round(zoom * 100)}%</span> : null}
        </div>
      ) : null}

      <div ref={mapWrapperRef} className="relative">
        <div
          ref={mapSurfaceRef}
          className="touch-none select-none overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onPointerLeave={endPointer}
          style={{ cursor: zoom > 1 ? "grab" : "default" }}
        >
          <svg
            viewBox={`0 0 ${canvasDims.width} ${canvasDims.height}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full"
            style={{
              maxHeight: 480,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              transition: isGesturing ? "none" : "transform 150ms ease-out",
            }}
          >
            <rect width={canvasDims.width} height={canvasDims.height} fill="#f9fafb" />

            {slots.map((slot) => {
              const trackable = isTrackableSlot(slot);
              const status = trackable && getSlotStatus ? getSlotStatus(slot.id) : undefined;
              const fill = status ? getStatusColor(status) : getSlotColor(slot.type);
              const stroke = status ? getStatusBorderColor(status) : getSlotBorderColor(slot.type);
              const clickable = trackable && Boolean(onSlotClick) && Boolean(getSlotStatus);
              const isSelected = openSlot?.id === slot.id;

              return (
                <g
                  key={slot.id}
                  ref={(el) => {
                    if (el) slotRefs.current.set(slot.id, el);
                    else slotRefs.current.delete(slot.id);
                  }}
                  onClick={
                    clickable
                      ? () => {
                          if (!draggedRef.current) onSlotClick!(slot);
                        }
                      : undefined
                  }
                  className={clickable ? "transition-opacity hover:opacity-80" : undefined}
                  style={clickable ? { cursor: "pointer" } : undefined}
                >
                  {clickable ? (
                    <rect
                      x={slot.position.x - HIT_PADDING}
                      y={slot.position.y - HIT_PADDING}
                      width={slot.position.width + HIT_PADDING * 2}
                      height={slot.position.height + HIT_PADDING * 2}
                      fill="transparent"
                    />
                  ) : null}
                  <rect
                    x={slot.position.x}
                    y={slot.position.y}
                    width={slot.position.width}
                    height={slot.position.height}
                    fill={fill}
                    stroke={isSelected ? "#0F2042" : stroke}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    rx="3"
                    style={{ transition: "fill 300ms ease, stroke 300ms ease" }}
                  />
                  <text
                    x={slot.position.x + slot.position.width / 2}
                    y={slot.position.y + slot.position.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="#1f2937"
                    pointerEvents="none"
                  >
                    {slot.position.width > 20 && slot.position.height > 12 ? slot.slotNumber : ""}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {getSlotStatus ? (
          <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => applyZoom(zoom + ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <HiMagnifyingGlassPlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => applyZoom(zoom - ZOOM_STEP)}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <HiMagnifyingGlassMinus className="h-4 w-4" />
            </button>
            {zoom !== 1 ? (
              <button
                type="button"
                onClick={() => applyZoom(1)}
                aria-label="Reset zoom"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <HiArrowPath className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : null}

        {openSlot ? (
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={`Update status for ${openSlot.slotNumber}`}
            className="absolute z-20 w-52 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg"
            style={{
              left: popoverPosition?.left ?? -9999,
              top: popoverPosition?.top ?? -9999,
              visibility: popoverPosition ? "visible" : "hidden",
            }}
          >
            <div
              className="absolute h-2.5 w-2.5 rotate-45 border border-slate-200 bg-white"
              style={{
                left: (popoverPosition?.arrowLeft ?? 0) - 5,
                ...(popoverPosition?.placement === "above"
                  ? { bottom: -6, borderTop: "none", borderLeft: "none" }
                  : { top: -6, borderBottom: "none", borderRight: "none" }),
              }}
            />

            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-temenos-navy">{openSlot.slotNumber}</p>
              <button
                type="button"
                onClick={onClosePopover}
                aria-label="Close status popover"
                className="rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="mt-2 space-y-2">
              {currentStatus === "OCCUPIED" ? (
                <>
                  <div className="rounded-xl bg-rose-50 p-2.5">
                    <p className="text-sm font-bold text-rose-900">{currentEntry?.vehicleNumber ?? "Unknown plate"}</p>
                    <p className="mt-0.5 text-[11px] text-rose-700">
                      {currentEntry?.vehicleType === "BIKE" ? "Bike" : "Car"} ·{" "}
                      {currentEntry?.employeeName ?? "Unregistered vehicle"}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    fullWidth
                    className="text-xs"
                    disabled={savingStatus}
                    onClick={() => void confirmFree()}
                  >
                    {savingStatus ? "Saving..." : "Free Slot"}
                  </Button>
                </>
              ) : currentStatus === "BLOCKED" ? (
                <Button
                  variant="secondary"
                  fullWidth
                  className="text-xs"
                  disabled={savingStatus}
                  onClick={() => onStatusChange?.("AVAILABLE")}
                >
                  {savingStatus ? "Saving..." : "Mark Available"}
                </Button>
              ) : (
                <>
                  <Button
                    variant="primary"
                    fullWidth
                    className="text-xs"
                    disabled={savingStatus}
                    onClick={() => setVehicleSheetOpen(true)}
                  >
                    Log Vehicle
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    className="text-xs"
                    disabled={savingStatus}
                    onClick={() => onStatusChange?.("BLOCKED")}
                  >
                    {savingStatus ? "Saving..." : "Block Slot"}
                  </Button>
                </>
              )}
            </div>

            {statusError ? <p className="mt-2 text-[11px] font-medium text-rose-700">{statusError}</p> : null}
          </div>
        ) : null}
      </div>

      <Modal open={vehicleSheetOpen} onClose={() => setVehicleSheetOpen(false)} title="Log Vehicle">
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parking Slot</p>
            <p className="text-base font-bold text-temenos-navy">{openSlot?.slotNumber}</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="slotVehicleNumber" className="block text-sm font-semibold text-slate-800">
              Vehicle Number
            </label>
            <input
              id="slotVehicleNumber"
              autoFocus
              value={vehicleNumberInput}
              onChange={(event) => setVehicleNumberInput(event.target.value)}
              placeholder="TN01AB1234"
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-temenos-teal focus:ring-2 focus:ring-temenos-teal/20"
            />

            {normalizedInput.length >= 2 && suggestions.length > 0 ? (
              <div className="mt-1 space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
                {suggestions.map((entry) => (
                  <button
                    key={entry.registrationNumber}
                    type="button"
                    onClick={() => {
                      setVehicleNumberInput(entry.registrationNumber);
                      setVehicleTypeInput(entry.vehicleType);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-white"
                  >
                    <span className="font-semibold text-slate-800">{entry.registrationNumber}</span>
                    <span className="text-xs text-slate-500">{entry.employeeName}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {normalizedInput.length >= 4 ? (
              <p className={`text-xs font-medium ${exactMatch ? "text-emerald-700" : "text-slate-500"}`}>
                {exactMatch ? "Registered vehicle" : "Vehicle not registered — parking will still be logged."}
              </p>
            ) : null}
          </div>

          {statusError ? <p className="text-xs font-medium text-rose-700">{statusError}</p> : null}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setVehicleSheetOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              fullWidth
              disabled={savingStatus || normalizedInput.length < 4}
              onClick={() => void confirmOccupy()}
            >
              {savingStatus ? "Saving..." : "Log Vehicle & Occupy"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
