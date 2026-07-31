import type { Building } from "../../../types/building";

interface Props {
  building: Building;
}

export default function ParkingStatusCard({ building }: Props) {
  const parkingAreas = Object.entries(building.parking);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Parking availability</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Area occupancy</h2>
        </div>
        <p className="text-sm text-slate-500">Live counts by zone</p>
      </div>

      <div className="mt-6 space-y-4">
        {parkingAreas.map(([name, area]) => {
          if (!area) return null;

          const available = area.capacity - area.occupied;
          const utilization = area.capacity ? Math.round((area.occupied / area.capacity) * 100) : 0;
          const label = available === 0 ? "Full" : available <= Math.ceil(area.capacity * 0.1) ? "Almost Full" : "Available";
          const badgeColor = available === 0 ? "bg-rose-100 text-rose-700" : label === "Almost Full" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";

          return (
            <div key={name} className="rounded-3xl border border-slate-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-slate-900 capitalize">{name.replace(/([A-Z])/g, " $1")}</p>
                  <p className="mt-1 text-sm text-slate-500">{utilization}% occupied</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeColor}`}>{label}</span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-500"
                    style={{ width: `${Math.min(100, utilization)}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-sm text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-900">{area.capacity}</p>
                    <p>Capacity</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{area.occupied}</p>
                    <p>Occupied</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{available}</p>
                    <p>Available</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
