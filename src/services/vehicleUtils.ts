/**
 * Small, dependency-free helpers shared by vehicleLogService and
 * employeeVehicleService. Kept in their own module (rather than living in
 * either service) so those two can each import from here without a
 * circular import between them.
 */

export function getVehicleLogDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const getPart = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value;

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}

export function normalizeVehicleNumber(vehicleNumber: string) {
  return vehicleNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
