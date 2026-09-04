/**
 * Static, presentational preview of the physical parking-layout concept
 * used by the authenticated application. This is marketing artwork for the
 * public landing page only - it renders fixed example data, never reads
 * from Firestore, and does not reuse or couple to the real layout/status
 * components (which require an authenticated session to read at all).
 *
 * The irregular sizing/spacing is intentional: it should read as a real
 * floor plan (varied slot sizes, a passage, pillars) rather than a plain
 * uniform grid.
 */

type SlotStatus = "available" | "occupied" | "blocked";

interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
  status: SlotStatus;
}

const STATUS_FILL: Record<SlotStatus, string> = {
  available: "#dcfce7",
  occupied: "#fee2e2",
  blocked: "#fef3c7",
};

const STATUS_STROKE: Record<SlotStatus, string> = {
  available: "#16a34a",
  occupied: "#ef4444",
  blocked: "#d97706",
};

function buildCluster(startX: number): Slot[] {
  const cols = [startX, startX + 34];
  const rows = [40, 62, 84, 106, 128];
  const slots: Slot[] = [];

  for (const y of rows) {
    for (const x of cols) {
      slots.push({ x, y, w: 28, h: 18, status: "available" });
    }
  }

  return slots;
}

const SLOTS: Slot[] = (() => {
  const slots = [...buildCluster(10), ...buildCluster(190)];
  slots[2].status = "occupied";
  slots[7].status = "occupied";
  slots[13].status = "occupied";
  slots[16].status = "blocked";
  return slots;
})();

const LEGEND: Array<{ status: SlotStatus; label: string }> = [
  { status: "available", label: "Available" },
  { status: "occupied", label: "Occupied" },
  { status: "blocked", label: "Blocked" },
];

interface ParkingPreviewGraphicProps {
  showLegend?: boolean;
  className?: string;
}

export function ParkingPreviewGraphic({ showLegend = false, className = "" }: ParkingPreviewGraphicProps) {
  return (
    <div className={className}>
      <svg viewBox="0 0 300 170" role="img" aria-label="Illustrative preview of a Temenos office parking layout" className="w-full h-auto">
        <rect x="0" y="0" width="300" height="170" rx="10" fill="#F8FAFC" />
        <rect x="10" y="10" width="280" height="20" rx="4" fill="#EEF2F6" stroke="#E2E8F0" />
        <rect x="140" y="45" width="10" height="10" rx="2" fill="#CBD5E1" />
        <rect x="140" y="95" width="10" height="10" rx="2" fill="#CBD5E1" />

        {SLOTS.map((slot, index) => (
          <rect
            key={index}
            x={slot.x}
            y={slot.y}
            width={slot.w}
            height={slot.h}
            rx="3"
            fill={STATUS_FILL[slot.status]}
            stroke={STATUS_STROKE[slot.status]}
            strokeWidth="1.5"
          />
        ))}
      </svg>

      {showLegend ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-5 text-xs">
          {LEGEND.map(({ status, label }) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-sm border"
                style={{ background: STATUS_FILL[status], borderColor: STATUS_STROKE[status] }}
              />
              <span className="text-slate-600">{label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
