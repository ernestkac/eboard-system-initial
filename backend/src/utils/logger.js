/**
 * Application Logger
 * Provides structured timestamped logging for server operations and errors
 */

const formatTimestamp = () => new Date().toISOString();

export const logger = {
  info: (message, meta = {}) => {
    console.log(`[${formatTimestamp()}] [INFO] ${message}`, Object.keys(meta).length ? meta : '');
  },
  warn: (message, meta = {}) => {
    console.warn(`[${formatTimestamp()}] [WARN] ${message}`, Object.keys(meta).length ? meta : '');
  },
  error: (message, error = null) => {
    console.error(`[${formatTimestamp()}] [ERROR] ${message}`, error ? error.stack || error : '');
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${formatTimestamp()}] [DEBUG] ${message}`, Object.keys(meta).length ? meta : '');
    }
  }
};
