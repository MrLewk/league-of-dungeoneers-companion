// Standalone-app storage shim.
//
// The app was originally built for Claude.ai's artifact environment, where
// `window.storage` is a persistent key/value store backed by Anthropic's
// servers. Outside that environment there's no such API, so this file
// re-implements the same shape (get/set/delete/list, all async, same
// return objects) but backed by the browser's localStorage instead.
//
// Data saved here lives only in the visiting browser/device — it won't
// sync across devices the way the Claude.ai version did.

const STORE_KEY = "lod-companion-storage-v1";

function readAll() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (e) {
    // localStorage full or unavailable (private browsing, etc.) — fail silently,
    // matching the "best-effort" storage behaviour the app already expects.
  }
}

export const storage = {
  async get(key) {
    const data = readAll();
    if (!(key in data)) return null;
    return { key, value: data[key], shared: false };
  },

  async set(key, value) {
    const data = readAll();
    data[key] = value;
    writeAll(data);
    return { key, value, shared: false };
  },

  async delete(key) {
    const data = readAll();
    const existed = key in data;
    delete data[key];
    writeAll(data);
    return { key, deleted: existed, shared: false };
  },

  async list(prefix) {
    const data = readAll();
    const keys = Object.keys(data).filter((k) => !prefix || k.startsWith(prefix));
    return { keys, prefix, shared: false };
  },
};
