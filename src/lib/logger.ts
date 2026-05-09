type Level = "info" | "warn" | "error";

const IS_PROD = process.env.NODE_ENV === "production";

function emit(level: Level, service: string, msg: string, data?: unknown) {
  if (IS_PROD) {
    const entry: Record<string, unknown> = {
      level,
      service,
      msg,
      ts: new Date().toISOString(),
    };
    if (data !== undefined) {
      if (data instanceof Error) {
        entry.error = data.message;
        entry.stack = data.stack;
      } else if (data !== null && typeof data === "object") {
        Object.assign(entry, data);
      } else {
        entry.data = data;
      }
    }
    // TODO: when Sentry is integrated, route log.error to Sentry.captureException
    const consoleFn =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : console.log;
    consoleFn(JSON.stringify(entry));
  } else {
    const formatted = `[${service}] ${level.toUpperCase()} — ${msg}${data !== undefined ? " " + JSON.stringify(data) : ""}`;
    const consoleFn =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : console.log;
    consoleFn(formatted);
  }
}

export const log = {
  info: (service: string, msg: string, data?: unknown) =>
    emit("info", service, msg, data),
  warn: (service: string, msg: string, data?: unknown) =>
    emit("warn", service, msg, data),
  error: (service: string, msg: string, data?: unknown) =>
    emit("error", service, msg, data),
};
