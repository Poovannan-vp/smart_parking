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
      <label className="text-sm font-medium text-slate-700">
        Select Building
      </label>

      <select
        value={selectedBuilding}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 shadow-sm focus:border-blue-500 focus:outline-none"
      >
        {buildings.map((building) => (
          <option key={building.id} value={building.id}>
            {building.name}
          </option>
        ))}
      </select>
    </div>
  );
}