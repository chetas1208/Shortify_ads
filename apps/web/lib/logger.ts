type LogFields = Record<string, unknown>;

function write(level: "info" | "warn" | "error", message: string, fields: LogFields = {}) {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...fields
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields)
};
