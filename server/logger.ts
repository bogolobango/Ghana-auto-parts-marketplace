// Structured logger for production monitoring
// Outputs JSON lines in production, readable format in development

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  msg: string;
  ts: string;
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV === "development";

function formatEntry(entry: LogEntry): string {
  if (isDev) {
    const { level, msg, ts, ...extra } = entry;
    const extraStr = Object.keys(extra).length > 0 ? ` ${JSON.stringify(extra)}` : "";
    return `[${level.toUpperCase()}] ${msg}${extraStr}`;
  }
  return JSON.stringify(entry);
}

function log(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = { level, msg, ts: new Date().toISOString(), ...meta };
  const formatted = formatEntry(entry);

  if (level === "error") {
    console.error(formatted);
  } else if (level === "warn") {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => {
    if (isDev) log("debug", msg, meta);
  },
};
