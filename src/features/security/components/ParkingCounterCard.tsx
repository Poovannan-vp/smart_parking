interface Props {
  title: string;
  capacity: number;
  occupied: number;
  onIncrease: () => void;
  onDecrease: () => void;
  disabled?: boolean;
}

export default function ParkingCounterCard({
  title,
  capacity,
  occupied,
  onIncrease,
  onDecrease,
  disabled = false,
}: Props) {
  const available = capacity - occupied;
  const occupancyPercent = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-sm">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h3 className="text-base font-bold text-[#0F2042]">
          {title}
        </h3>
        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${available > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
          {available} Available
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center rounded-xl bg-slate-50 p-3.5 border border-slate-100 mb-4">
        <div>
          <p className="text-xl font-bold text-[#0F2042]">
            {capacity}
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Capacity
          </p>
        </div>

        <div>
          <p className="text-xl font-bold text-emerald-600">
            {available}
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Available
          </p>
        </div>

        <div>
          <p className="text-xl font-bold text-rose-600">
            {occupied}
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Occupied
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5 mb-5">
        <div className="flex justify-between text-xs font-medium text-slate-500">
          <span>Occupancy rate</span>
          <span>{occupancyPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              occupancyPercent > 90 ? "bg-rose-500" : occupancyPercent > 70 ? "bg-amber-500" : "bg-[#00A3E0]"
            }`}
            style={{ width: `${Math.min(100, occupancyPercent)}%` }}
          />
        </div>
      </div>

      {/* Incremental Controls */}
      <div className="flex items-center justify-between rounded-xl bg-slate-100/70 p-2.5">
        <button
          type="button"
          onClick={onDecrease}
          disabled={disabled || occupied === 0}
          aria-label={`Remove vehicle from ${title}`}
          className="flex h-10 w-12 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-800 text-lg font-bold shadow-xs hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 transition"
        >
          −
        </button>

        <div className="text-center">
          <span className="text-[#0F2042] text-xl font-bold">
            {occupied}
          </span>
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Vehicles</p>
        </div>

        <button
          type="button"
          onClick={onIncrease}
          disabled={disabled || occupied >= capacity}
          aria-label={`Add vehicle to ${title}`}
          className="flex h-10 w-12 items-center justify-center rounded-lg bg-[#0F2042] text-white text-lg font-bold shadow-xs hover:bg-[#0B192C] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 transition"
        >
          +
        </button>
      </div>
    </div>
  );
}

