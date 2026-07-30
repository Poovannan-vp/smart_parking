export interface ParkingArea {
  capacity: number;
  occupied: number;
}

export interface Building {
  name: string;
  city: string;
  status: string;

  parking: {
    closedBike?: ParkingArea;
    closedCar?: ParkingArea;
    openCar?: ParkingArea;
    general?: ParkingArea;
  };

  updatedAt?: unknown;
}