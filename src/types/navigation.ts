export type AppRoute =
  | "/(app)/dashboard"
  | "/(app)/control"
  | "/(app)/sessions"
  | "/(app)/analytics"
  | "/(app)/alerts"
  | "/(app)/settings"
  | "/(app)/profile"
  | "/(app)/add-device"
  | "/(app)/ai-prediction";

export type DeviceDetailRoute = {
  pathname: "/(app)/device/[id]";
  params: { id: string };
};
