type Level = "info" | "warn" | "error";

function fmt(
  service: string,
  level: Level,
  msg: string,
  data?: unknown,
): string {
  return `[${service}] ${level.toUpperCase()} — ${msg}${data !== undefined ? " " + JSON.stringify(data) : ""}`;
}

export const log = {
  info: (service: string, msg: string, data?: unknown) =>
    console.log(fmt(service, "info", msg, data)),
  warn: (service: string, msg: string, data?: unknown) =>
    console.warn(fmt(service, "warn", msg, data)),
  error: (service: string, msg: string, data?: unknown) =>
    console.error(fmt(service, "error", msg, data)),
};
