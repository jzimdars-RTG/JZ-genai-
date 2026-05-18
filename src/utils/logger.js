/**
 * @param {"info"|"warn"|"error"} level
 * @param {string} message
 * @param {Record<string, unknown>} [meta]
 */
function log(level, message, meta = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
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

/**
 * @param {string} message
 * @param {Record<string, unknown>} [meta]
 */
export function info(message, meta) {
  log("info", message, meta);
}

/**
 * @param {string} message
 * @param {Record<string, unknown>} [meta]
 */
export function warn(message, meta) {
  log("warn", message, meta);
}

/**
 * @param {string} message
 * @param {Record<string, unknown>} [meta]
 */
export function error(message, meta) {
  log("error", message, meta);
}
