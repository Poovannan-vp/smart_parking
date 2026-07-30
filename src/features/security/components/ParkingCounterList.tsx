import ParkingCounterCard from "./ParkingCounterCard";

import type { Parking } from "../../../types/parking";

interface Props {
  parking: Parking;

  onIncrease: (area: keyof Parking) => void;

  onDecrease: (area: keyof Parking) => void;
}

export default function ParkingCounterList({
  parking,
  onIncrease,
  onDecrease,
}: Props) {
  return (
    <div className="space-y-5">
      {Object.entries(parking).map(([key, area]) => {
        if (!area) return null;

        return (
          <ParkingCounterCard
            key={key}
            title={key.replace(/([A-Z])/g, " $1")}
            capacity={area.capacity}
            occupied={area.occupied}
            onIncrease={() => onIncrease(key as keyof Parking)}
            onDecrease={() => onDecrease(key as keyof Parking)}
          />
        );
      })}
    </div>
  );
}