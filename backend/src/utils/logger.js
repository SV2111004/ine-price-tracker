export const logger = {
  info(msg, meta = {}) {
    console.log(`[INFO] [${new Date().toISOString()}] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },

  warn(msg, meta = {}) {
    console.warn(`[WARN] [${new Date().toISOString()}] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },

  error(msg, meta = {}) {
    console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },

  scraper(msg, meta = {}) {
    const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
    console.log(`[SCRAPER] ${msg}${metaStr}`);
  }
};
