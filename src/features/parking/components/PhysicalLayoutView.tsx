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
 * When a caller additionally supplies `selectedSlot` + `onStatusChange` +
 * `onClosePopover` (Security's status-editing flow), clicking a trackable
 * slot opens a small popover anchored to that exact slot on the map instead
 * of the caller having to render its own status panel. The popover is a
 * pure presentation/positioning concern - it never talks to Firestore
 * itself, it only reports the chosen status back via `onStatusChange`.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ParkingSlot, SlotStatusValue } from "../../../types/parkingLayout";
import {
  getSlotColor,
  getSlotBorderColor,
  getCanvasDimensions,
  getStatusColor,
  getStatusBorderColor,
} from "../../admin/utils/layoutEditorUtils";
import { isTrackableSlot } from "../utils/isTrackableSlot";

interface PhysicalLayoutViewProps {
  slots: ParkingSlot[];
  title?: string;
  /** When provided, trackable slots are colored by status instead of type. */
  getSlotStatus?: (slotId: string) => SlotStatusValue;
  /** When provided (with `getSlotStatus`), trackable slots become clickable. */
  onSlotClick?: (slot: ParkingSlot) => void;
  /** The slot whose status popover should be open (controlled by the caller). */
  selectedSlot?: ParkingSlot | null;
  /** Called with the chosen status when a popover action is pressed. */
  onStatusChange?: (status: SlotStatusValue) => void;
  /** Disables the popover's status actions while a change is in flight. */
  savingStatus?: boolean;
  /** Shown inside the popover when the last status change failed. */
  statusError?: string | null;
  /** Called to close the popover (close button, outside click, Escape). */
  onClosePopover?: () => void;
}

const STATUS_LEGEND: Array<{ status: SlotStatusValue; label: string }> = [
  { status: "AVAILABLE", label: "Available" },
  { status: "OCCUPIED", label: "Occupied" },
  { status: "BLOCKED", label: "Blocked" },
];

const STATUS_ACTIVE_CLASSES: Record<SlotStatusValue, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700",
  OCCUPIED: "bg-rose-50 text-rose-700",
  BLOCKED: "bg-slate-200 text-slate-700",
};

const POPOVER_WIDTH = 192;
const POPOVER_GAP = 10;
const POPOVER_MARGIN = 8;

interface PopoverPosition {
  left: number;
  top: number;
  arrowLeft: number;
  placement: "above" | "below";
}

export function PhysicalLayoutView({
  slots,
  title,
  getSlotStatus,
  onSlotClick,
  selectedSlot,
  onStatusChange,
  savingStatus,
  statusError,
  onClosePopover,
}: PhysicalLayoutViewProps) {
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef(new Map<string, SVGGElement>());
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null);

  const popoverEnabled = Boolean(onStatusChange && onClosePopover && getSlotStatus);
  const openSlot = popoverEnabled ? selectedSlot ?? null : null;

  // Position the popover against the actual rendered slot element, which
  // already accounts for the SVG's viewBox scaling/letterboxing - no manual
  // coordinate math needed. Runs before paint so there is no visible flash.
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

      // Prefer below; fall back to above whichever side has more room when
      // neither fits cleanly.
      const spaceBelow = wrapperRect.height - slotBottom - POPOVER_GAP;
      const spaceAbove = slotTop - POPOVER_GAP;

      let top =
        popoverHeight <= spaceBelow || spaceBelow >= spaceAbove
          ? slotBottom + POPOVER_GAP
          : slotTop - POPOVER_GAP - popoverHeight;

      top = Math.max(POPOVER_MARGIN, Math.min(top, wrapperRect.height - popoverHeight - POPOVER_MARGIN));

      // Derive `placement` (which end the arrow renders on) from where the
      // popover actually ended up post-clamp, not from the pre-clamp
      // choice above - so the arrow is always geometrically consistent
      // with the popover's final position, even in a container too short
      // to fit it cleanly on either side.
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
  }, [openSlot?.id, statusError, savingStatus]);

  // Close on outside click / Escape. Listening on "mousedown" (rather than
  // "click") means this always resolves before the "click" that opens a
  // different slot's popover, so switching slots never gets clobbered by
  // this handler closing what the slot's own click just opened.
  useEffect(() => {
    if (!openSlot) return;

    function handlePointerDown(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClosePopover?.();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClosePopover?.();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openSlot, onClosePopover]);

  if (!slots || slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        This layout has no physical objects yet.
      </div>
    );
  }

  const canvasDims = getCanvasDimensions(slots);
  const currentStatus = openSlot && getSlotStatus ? getSlotStatus(openSlot.id) : undefined;

  return (
    <div className="space-y-3">
      {title ? <h3 className="text-sm font-semibold text-slate-900">{title}</h3> : null}

      {getSlotStatus ? (
        <div className="flex flex-wrap gap-3 text-xs">
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
      ) : null}

      <div ref={mapWrapperRef} className="relative">
        <div className="rounded-2xl border border-slate-300 bg-white shadow-sm overflow-hidden">
          <svg
            viewBox={`0 0 ${canvasDims.width} ${canvasDims.height}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full"
            style={{ maxHeight: 480 }}
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
                  onClick={clickable ? () => onSlotClick!(slot) : undefined}
                  className={clickable ? "transition-opacity hover:opacity-80" : undefined}
                  style={clickable ? { cursor: "pointer" } : undefined}
                >
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

        {openSlot ? (
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={`Update status for ${openSlot.slotNumber}`}
            className="absolute z-20 w-48 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg"
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

            <div className="mt-2 space-y-1">
              {STATUS_LEGEND.map(({ status, label }) => {
                const isCurrent = currentStatus === status;

                return (
                  <button
                    key={status}
                    type="button"
                    disabled={savingStatus || isCurrent}
                    onClick={() => onStatusChange?.(status)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                      isCurrent ? STATUS_ACTIVE_CLASSES[status] : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full border"
                      style={{ background: getStatusColor(status), borderColor: getStatusBorderColor(status) }}
                    />
                    <span className="truncate">{label}</span>
                    {isCurrent ? (
                      <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wide opacity-70">
                        Current
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {savingStatus ? <p className="mt-2 text-[11px] text-slate-500">Saving…</p> : null}
            {statusError ? <p className="mt-2 text-[11px] font-medium text-rose-700">{statusError}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
