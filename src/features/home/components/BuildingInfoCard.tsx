import type { Building } from "../../../types/building";

interface Props {
  building: Building;
}

export default function BuildingInfoCard({ building }: Props) {
  return (
    <div className="rounded-xl bg-white p-5 shadow">

      <h2 className="text-lg font-bold">
        {building.name}
      </h2>

      <p className="text-sm text-slate-500">
        {building.city}
      </p>

      <div className="mt-4 flex items-center justify-between">

        <span className="text-sm text-slate-600">
          Status
        </span>

        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            building.status === "Open"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {building.status}
        </span>

      </div>

      <a className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${building.name}, ${building.city}`)}`} target="_blank" rel="noreferrer">Get directions</a>
    </div>
  );
}
