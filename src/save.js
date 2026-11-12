// Progress survives closing the browser: everything lives in localStorage.
// Keep this a plain JSON blob so later versions can migrate it.
const DEFAULT_KEY = 'lief-save';
export const SAVE_VERSION = 3;
const READABLE_VERSIONS = new Set([2, 3]); // scenes migrate older shapes themselves

export function loadSave(key = DEFAULT_KEY) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!READABLE_VERSIONS.has(data.version)) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(data, key = DEFAULT_KEY) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...data, version: SAVE_VERSION }));
  } catch {
    // Private mode or full storage: the game still plays, it just won't remember.
  }
}

export function clearSave(key = DEFAULT_KEY) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
