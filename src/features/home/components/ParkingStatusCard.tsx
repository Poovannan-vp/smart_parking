import type { Building } from "../../../types/building";

interface Props {
  building: Building;
}

export default function ParkingStatusCard({
  building,
}: Props) {

  const parkingAreas = Object.entries(building.parking);

  return (
    <div className="rounded-xl bg-white p-5 shadow">

      <h2 className="mb-4 text-lg font-semibold">
        Parking Availability
      </h2>

      <div className="space-y-4">

        {parkingAreas.map(([name, area]) => {

          if (!area) return null;

          const available =
            area.capacity - area.occupied;
          const availabilityLabel = available === 0 ? "Full" : available <= Math.ceil(area.capacity * 0.1) ? "Almost Full" : "Available";

          return (
            <div
              key={name}
              className="rounded-lg border p-4"
            >
              <h3 className="mb-3 font-semibold capitalize">
                {name.replace(/([A-Z])/g, " $1")}
              </h3>

              <p className={`mb-3 text-sm font-medium ${available === 0 ? "text-red-600" : availabilityLabel === "Almost Full" ? "text-amber-600" : "text-green-600"}`}>{availabilityLabel}</p>

              <div className="grid grid-cols-3 gap-3 text-center">

                <div>
                  <p className="text-xl font-bold text-blue-600">
                    {area.capacity}
                  </p>

                  <p className="text-xs text-slate-500">
                    Capacity
                  </p>
                </div>

                <div>
                  <p className="text-xl font-bold text-red-600">
                    {area.occupied}
                  </p>

                  <p className="text-xs text-slate-500">
                    Occupied
                  </p>
                </div>

                <div>
                  <p className="text-xl font-bold text-green-600">
                    {available}
                  </p>

                  <p className="text-xs text-slate-500">
                    Available
                  </p>
                </div>

              </div>
            </div>
          );
        })}

      </div>

    </div>
  );
}
