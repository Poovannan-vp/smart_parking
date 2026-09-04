interface BuildingOption {
  id: string;
  name: string;
}

interface BuildingSelectorProps {
  buildings: BuildingOption[];
  selectedBuilding: string;
  onChange: (id: string) => void;
}

export default function BuildingSelector({
  buildings,
  selectedBuilding,
  onChange,
}: BuildingSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-800">
        Select building
      </label>

      <select
        value={selectedBuilding}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition duration-200 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
      >
        {!selectedBuilding && (
          <option value="" disabled>
            Select a location...
          </option>
        )}
        {buildings.map((building) => (
          <option key={building.id} value={building.id}>
            {building.name}
          </option>
        ))}
      </select>
    </div>
  );
}