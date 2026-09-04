/**
 * Enhanced Parking Layout Editor
 * Comprehensive 2D editor with blueprint reference, precise positioning,
 * zoom/pan, undo/redo, and rotation support
 */

import { useState, useRef, useCallback, useEffect } from "react";
import type { ParkingSlot } from "../../../types/parkingLayout";
import { UndoRedoStack } from "../utils/undoRedoStack";
import {
  createNewSlot,
  duplicateSlot,
  moveSlot,
  resizeSlot,
  rotateSlot,
  getSlotColor,
  getSlotBorderColor,
  getCanvasDimensions,
} from "../utils/layoutEditorUtils";

interface EnhancedParkingLayoutEditorProps {
  slots: ParkingSlot[];
  locationName: string;
  blueprintImage?: string;
  onSlotsChange: (slots: ParkingSlot[]) => void;
  loading?: boolean;
}

interface DragState {
  mode: "move" | "resize" | "none";
  slotId: string;
  startX: number;
  startY: number;
  startPosX: number;
  startPosY: number;
  startWidth: number;
  startHeight: number;
}

interface EditMode {
  type: "add" | "select" | "view";
}

export function EnhancedParkingLayoutEditor({
  slots,
  blueprintImage,
  onSlotsChange,
}: EnhancedParkingLayoutEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const undoRedoStack = useRef(new UndoRedoStack(30));

  // State
  const [currentSlots, setCurrentSlots] = useState(slots);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan] = useState({ x: 0, y: 0 });
  const [editMode, setEditMode] = useState<EditMode>({ type: "select" });

  // Add slot form
  const [newSlotNumber, setNewSlotNumber] = useState("");
  const [newSlotType, setNewSlotType] = useState<ParkingSlot["type"]>("standard");
  const [newSlotArea] = useState("Main Parking");

  // Canvas dimensions
  const canvasDims = getCanvasDimensions(currentSlots);

  // Initialize undo/redo stack
  useEffect(() => {
    undoRedoStack.current.push({
      slots: currentSlots,
      timestamp: Date.now(),
    });
  }, []);

  // Sync to parent
  useEffect(() => {
    onSlotsChange(currentSlots);
  }, [currentSlots, onSlotsChange]);

  // Add slot handler
  const handleAddSlot = useCallback(
    (x: number, y: number) => {
      if (!newSlotNumber.trim()) {
        alert("Please enter a slot number");
        return;
      }

      const newSlot = createNewSlot(newSlotNumber, x, y, newSlotType, newSlotArea);
      const updatedSlots = [...currentSlots, newSlot];

      setCurrentSlots(updatedSlots);
      undoRedoStack.current.push({
        slots: updatedSlots,
        timestamp: Date.now(),
      });

      setNewSlotNumber("");
      setEditMode({ type: "select" });
      setSelectedSlotId(newSlot.id);
    },
    [currentSlots, newSlotNumber, newSlotType, newSlotArea]
  );

  // Canvas click handler
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (editMode.type !== "add") return;

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      handleAddSlot(x, y);
    },
    [editMode.type, pan, zoom, handleAddSlot]
  );

  // Slot click handler
  const handleSlotClick = useCallback(
    (slotId: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelectedSlotId(slotId);
    },
    []
  );

  // Mouse down on slot (drag/resize)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGElement>, slotId: string, mode: "move" | "resize") => {
      e.preventDefault();
      e.stopPropagation();

      const slot = currentSlots.find((s) => s.id === slotId);
      if (!slot) return;

      const svg = svgRef.current;
      if (!svg) return;

      const startX = e.clientX;
      const startY = e.clientY;

      setDragState({
        mode,
        slotId,
        startX,
        startY,
        startPosX: slot.position.x,
        startPosY: slot.position.y,
        startWidth: slot.position.width,
        startHeight: slot.position.height,
      });

      setSelectedSlotId(slotId);
    },
    [currentSlots]
  );

  // Mouse move (drag/resize)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!dragState) return;

      const svg = svgRef.current;
      if (!svg) return;

      const deltaX = (e.clientX - dragState.startX) / zoom;
      const deltaY = (e.clientY - dragState.startY) / zoom;

      const slot = currentSlots.find((s) => s.id === dragState.slotId);
      if (!slot) return;

      let updatedSlot: ParkingSlot;

      if (dragState.mode === "move") {
        updatedSlot = moveSlot(slot, dragState.startPosX + deltaX, dragState.startPosY + deltaY);
      } else {
        const newWidth = Math.max(20, dragState.startWidth + deltaX);
        const newHeight = Math.max(20, dragState.startHeight + deltaY);
        updatedSlot = resizeSlot(slot, newWidth, newHeight);
      }

      const updated = currentSlots.map((s) => (s.id === dragState.slotId ? updatedSlot : s));
      setCurrentSlots(updated);
    },
    [dragState, zoom, currentSlots]
  );

  // Mouse up (end drag/resize)
  const handleMouseUp = useCallback(() => {
    if (dragState) {
      undoRedoStack.current.push({
        slots: currentSlots,
        timestamp: Date.now(),
      });
      setDragState(null);
    }
  }, [dragState, currentSlots]);

  // Delete slot
  const handleDeleteSlot = useCallback((slotId: string) => {
    setCurrentSlots((prev) => {
      const updated = prev.filter((s) => s.id !== slotId);
      undoRedoStack.current.push({
        slots: updated,
        timestamp: Date.now(),
      });
      return updated;
    });
    setSelectedSlotId(null);
  }, []);

  // Duplicate slot
  const handleDuplicateSlot = useCallback((slotId: string) => {
    const slot = currentSlots.find((s) => s.id === slotId);
    if (!slot) return;

    const newSlot = duplicateSlot(slot, 30, 30);
    const updated = [...currentSlots, newSlot];

    setCurrentSlots(updated);
    undoRedoStack.current.push({
      slots: updated,
      timestamp: Date.now(),
    });

    setSelectedSlotId(newSlot.id);
  }, [currentSlots]);

  // Rotate slot
  const handleRotateSlot = useCallback(
    (slotId: string, degrees: number) => {
      const slot = currentSlots.find((s) => s.id === slotId);
      if (!slot) return;

      const updatedSlot = rotateSlot(slot, degrees);
      const updated = currentSlots.map((s) => (s.id === slotId ? updatedSlot : s));

      setCurrentSlots(updated);
      undoRedoStack.current.push({
        slots: updated,
        timestamp: Date.now(),
      });
    },
    [currentSlots]
  );

  // Undo/Redo
  const handleUndo = useCallback(() => {
    const prevState = undoRedoStack.current.undo();
    if (prevState) {
      setCurrentSlots(prevState.slots);
    }
  }, []);

  const handleRedo = useCallback(() => {
    const nextState = undoRedoStack.current.redo();
    if (nextState) {
      setCurrentSlots(nextState.slots);
    }
  }, []);

  // Zoom handlers
  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.1, 3)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.1, 0.5)), []);
  const handleZoomReset = useCallback(() => setZoom(1), []);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" && selectedSlotId) {
        handleDeleteSlot(selectedSlotId);
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          handleUndo();
        }
        if (e.key === "y") {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSlotId, handleDeleteSlot, handleUndo, handleRedo]);

  const selectedSlot = currentSlots.find((s) => s.id === selectedSlotId);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Zoom:</label>
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium transition-colors hover:bg-slate-200 disabled:opacity-50"
            >
              −
            </button>
            <span className="w-12 text-center text-sm font-medium text-slate-700">{Math.round(zoom * 100)}%</span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium transition-colors hover:bg-slate-200 disabled:opacity-50"
            >
              +
            </button>
            <button
              onClick={handleZoomReset}
              className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium transition-colors hover:bg-slate-200"
            >
              Reset
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-300" />

          {/* Undo/Redo */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={!undoRedoStack.current.canUndo()}
              className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium transition-colors hover:bg-slate-200 disabled:opacity-50"
            >
              ↶ Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={!undoRedoStack.current.canRedo()}
              className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium transition-colors hover:bg-slate-200 disabled:opacity-50"
            >
              ↷ Redo
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-300" />

          {/* Mode Selection */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Mode:</label>
            <button
              onClick={() => setEditMode({ type: "select" })}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                editMode.type === "select"
                  ? "bg-temenos-navy text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Select
            </button>
            <button
              onClick={() => setEditMode({ type: "add" })}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                editMode.type === "add" ? "bg-temenos-navy text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Add Slot
            </button>
          </div>

          {/* Stats */}
          <div className="ml-auto text-xs text-slate-600">
            Total Slots: <span className="font-bold">{currentSlots.length}</span> | Selected:{" "}
            <span className="font-bold">{selectedSlotId ? 1 : 0}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Main Editor Canvas */}
        <div className="lg:col-span-3 space-y-4">
          {/* Blueprint Info */}
          {blueprintImage && (
            <div className="rounded-xl bg-temenos-teal-light border border-temenos-teal/30 p-3 text-xs text-temenos-navy">
              Blueprint reference loaded (opacity: 20%)
            </div>
          )}

          {/* SVG Editor Canvas */}
          <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 overflow-hidden">
            <svg
              ref={svgRef}
              width="100%"
              height="600"
              viewBox={`${pan.x} ${pan.y} ${canvasDims.width / zoom} ${canvasDims.height / zoom}`}
              preserveAspectRatio="xMidYMid meet"
              className="bg-white cursor-crosshair"
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ userSelect: "none" }}
            >
              {/* Blueprint Background Image */}
              {blueprintImage && (
                <image
                  href={blueprintImage}
                  x="0"
                  y="0"
                  width={canvasDims.width}
                  height={canvasDims.height}
                  opacity="0.15"
                  pointerEvents="none"
                />
              )}

              {/* Grid pattern */}
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width={canvasDims.width} height={canvasDims.height} fill="url(#grid)" />

              {/* Parking Slots */}
              {currentSlots.map((slot) => (
                <g key={slot.id}>
                  {/* Slot Rectangle */}
                  <rect
                    x={slot.position.x}
                    y={slot.position.y}
                    width={slot.position.width}
                    height={slot.position.height}
                    fill={getSlotColor(slot.type)}
                    stroke={selectedSlotId === slot.id ? "#0ea5e9" : getSlotBorderColor(slot.type)}
                    strokeWidth={selectedSlotId === slot.id ? 3 : 2}
                    rx="4"
                    onMouseDown={(e) => handleMouseDown(e, slot.id, "move")}
                    style={{ cursor: "move" }}
                  />

                  {/* Slot Number */}
                  <text
                    x={slot.position.x + slot.position.width / 2}
                    y={slot.position.y + slot.position.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="#1f2937"
                    pointerEvents="none"
                    onClick={(e) => handleSlotClick(slot.id, e as any)}
                  >
                    {slot.slotNumber}
                  </text>

                  {/* Resize Handle */}
                  {selectedSlotId === slot.id && (
                    <circle
                      cx={slot.position.x + slot.position.width}
                      cy={slot.position.y + slot.position.height}
                      r="5"
                      fill="#0ea5e9"
                      stroke="#ffffff"
                      strokeWidth="1"
                      onMouseDown={(e) => handleMouseDown(e, slot.id, "resize")}
                      style={{ cursor: "se-resize" }}
                    />
                  )}
                </g>
              ))}
            </svg>
          </div>

          {/* Add Slot Form */}
          {editMode.type === "add" && (
            <div className="animate-fade-in rounded-xl bg-temenos-teal-light border border-temenos-teal/30 p-4">
              <p className="mb-3 text-sm font-medium text-temenos-navy">Click on canvas to add slot</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Slot number (e.g., P1)"
                  value={newSlotNumber}
                  onChange={(e) => setNewSlotNumber(e.target.value)}
                  className="rounded-lg border border-temenos-teal/40 bg-white px-3 py-2 text-sm outline-none transition focus:border-temenos-teal focus:ring-2 focus:ring-temenos-teal/20"
                  autoFocus
                />
                <select
                  value={newSlotType}
                  onChange={(e) => setNewSlotType(e.target.value as ParkingSlot["type"])}
                  className="rounded-lg border border-temenos-teal/40 bg-white px-3 py-2 text-sm outline-none transition focus:border-temenos-teal focus:ring-2 focus:ring-temenos-teal/20"
                >
                  <option value="standard">Standard</option>
                  <option value="accessible">Accessible</option>
                  <option value="bike">Bike</option>
                  <option value="passage">Passage</option>
                  <option value="pillar">Pillar</option>
                  <option value="utility">Utility</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Properties Panel */}
        <div className="space-y-4">
          {selectedSlot ? (
            <div className="animate-fade-in rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 text-sm mb-3">Slot Properties</h4>
              </div>

              {/* Slot Number */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Slot Number</label>
                <div className="text-sm font-bold text-slate-900">{selectedSlot.slotNumber}</div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <div className="text-sm text-slate-700">{selectedSlot.type}</div>
              </div>

              {/* Position */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Position</label>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <div>X: {selectedSlot.position.x.toFixed(0)}</div>
                  <div>Y: {selectedSlot.position.y.toFixed(0)}</div>
                  <div>W: {selectedSlot.position.width.toFixed(0)}</div>
                  <div>H: {selectedSlot.position.height.toFixed(0)}</div>
                </div>
              </div>

              {/* Rotation */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Rotation</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRotateSlot(selectedSlot.id, (selectedSlot.rotation || 0) + 90)}
                    className="flex-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium transition-colors hover:bg-slate-200"
                  >
                    +90°
                  </button>
                  <button
                    onClick={() => handleRotateSlot(selectedSlot.id, 0)}
                    className="flex-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium transition-colors hover:bg-slate-200"
                  >
                    Reset
                  </button>
                </div>
                <div className="mt-2 text-sm font-bold text-slate-900">
                  {(selectedSlot.rotation || 0).toFixed(0)}°
                </div>
              </div>

              {/* Parking Area */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Area</label>
                <div className="text-sm text-slate-700">{selectedSlot.parkingArea}</div>
              </div>

              {/* Actions */}
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <button
                  onClick={() => handleDuplicateSlot(selectedSlot.id)}
                  className="w-full rounded-lg bg-temenos-teal-light px-3 py-2 text-xs font-medium text-temenos-teal-dark transition-colors hover:bg-temenos-teal/20"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => handleDeleteSlot(selectedSlot.id)}
                  className="w-full rounded-lg bg-rose-100 px-3 py-2 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-200"
                >
                  Delete (Del)
                </button>
              </div>

              <div className="text-xs text-slate-500">
                Drag to move | Drag corner to resize | Ctrl+Z to undo
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Select a slot to view properties</p>
            </div>
          )}

          {/* Blueprint Info */}
          {blueprintImage && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-700 mb-2">Blueprint Reference</p>
              <img src={blueprintImage} alt="Blueprint" className="w-full rounded-lg opacity-50 transition-opacity hover:opacity-75" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
