import ParkingCounterCard from "./ParkingCounterCard";

import type { Parking } from "../../../types/parking";

const parkingAreaOrder: Array<keyof Parking> = [
  "closedBike",
  "closedCar",
  "openCar",
  "general",
];

const parkingAreaLabels: Record<keyof Parking, string> = {
  closedBike: "Closed Bike",
  closedCar: "Closed Car",
  openCar: "Open Car",
  general: "General",
};

interface Props {
  parking: Parking;

  onIncrease: (area: keyof Parking) => void;

  onDecrease: (area: keyof Parking) => void;
  isUpdating?: (area: keyof Parking) => boolean;
}

export default function ParkingCounterList({
  parking,
  onIncrease,
  onDecrease,
  isUpdating = () => false,
}: Props) {
  return (
    <div className="space-y-5">
      {parkingAreaOrder.map((key) => {
        const area = parking[key];

        if (!area) return null;

        return (
          <ParkingCounterCard
            key={key}
            title={parkingAreaLabels[key]}
            capacity={area.capacity}
            occupied={area.occupied}
            onIncrease={() => onIncrease(key)}
            onDecrease={() => onDecrease(key)}
            disabled={isUpdating(key)}
          />
        );
      })}
    </div>
  );
}
