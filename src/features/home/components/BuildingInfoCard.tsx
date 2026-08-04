import type { Building } from "../../../types/building";

interface Props {
  building: Building;
}

const temenosDestinations: Record<string, string> = {
  "Chennai KG": "Temenos Chennai KG office, Chennai",
  "Chennai SR": "Temenos Nungambakkam office, Chennai",
  Bangalore: "Temenos Bangalore office, Bangalore",
  Hyderabad: "Temenos Hyderabad office, Hyderabad",
};

export default function BuildingInfoCard({ building }: Props) {
  const totalCapacity = Object.values(building.parking).reduce(
    (sum, area) => sum + (area ? area.capacity : 0),
    0,
  );
  const totalOccupied = Object.values(building.parking).reduce(
    (sum, area) => sum + (area ? area.occupied : 0),
    0,
  );
  const totalAvailable = totalCapacity - totalOccupied;
  const utilization = totalCapacity ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Building Overview</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">{building.name}</h2>
          <p className="mt-2 text-sm text-slate-500">{building.city}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${building.status === "Open" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
          {building.status}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Capacity</p>
          <p className="mt-2 text-2xl font-semibold">{totalCapacity}</p>
        </div>
        <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Occupied</p>
          <p className="mt-2 text-2xl font-semibold">{totalOccupied}</p>
        </div>
        <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Available</p>
          <p className="mt-2 text-2xl font-semibold">{totalAvailable}</p>
        </div>
      </div>

      <div className="mt-6 space-y-2 text-sm text-slate-500">
        <div className="flex items-center justify-between">
          <span>Utilization</span>
          <span className="font-semibold text-slate-900">{utilization}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${utilization}%` }} />
        </div>
      </div>

      <a
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700"
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(temenosDestinations[building.name] ?? `${building.name}, ${building.city}`)}`}
        target="_blank"
        rel="noreferrer"
      >
        Get directions
      </a>
    </div>
  );
}
