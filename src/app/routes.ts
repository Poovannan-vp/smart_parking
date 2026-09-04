export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",

  EMPLOYEE: "/employee",
  SECURITY: "/security",
  VEHICLE_LOGS: "/security/vehicle-logs",
  ADMIN: "/admin",
  BUILDINGS: "/admin/buildings",
  USERS: "/admin/users",
  CREATE_USER: "/admin/users/create",
  SETTINGS: "/admin/settings",
  PARKING_LAYOUTS: "/admin/parking-layouts",
  PARKING_LAYOUT_EDITOR: "/admin/parking-layouts/:locationId",
  DEVELOPER: "/developer",
} as const;
