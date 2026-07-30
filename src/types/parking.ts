export interface ParkingArea {
  capacity: number;
  occupied: number;
}

export interface Parking {
  closedBike?: ParkingArea;
  closedCar?: ParkingArea;
  openCar?: ParkingArea;
  general?: ParkingArea;
}