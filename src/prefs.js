const THEME_KEY = 'psdkit_theme';
const FAV_KEY = 'psdkit_favourites';
const RECENT_KEY = 'psdkit_recent_tools';
const SEARCH_KEY = 'psdkit_recent_searches';
const AI_FEEDBACK_KEY = 'psdkit_ai_feedback';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

export function getTheme() {
  const saved = (() => {
    try { return localStorage.getItem(THEME_KEY); } catch { return null; }
  })();
  if (saved) return saved;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dim' : 'warm';
}

export function setTheme(theme) {
  const next = theme === 'dim' ? 'dim' : 'warm';
  try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
  document.documentElement.dataset.theme = next;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', next === 'dim' ? '#0D1420' : '#F7F7F3');
  document.dispatchEvent(new CustomEvent('psdkit:theme', { detail: next }));
  return next;
}

export function initTheme() {
  setTheme(getTheme());
}

export function getFavourites() {
  return load(FAV_KEY, []);
}

export function isFavourite(id) {
  return getFavourites().includes(id);
}

export function toggleFavourite(id) {
  const set = new Set(getFavourites());
  if (set.has(id)) set.delete(id); else set.add(id);
  const list = [...set];
  save(FAV_KEY, list);
  document.dispatchEvent(new CustomEvent('psdkit:favourites', { detail: list }));
  return set.has(id);
}

export function getFavouriteTools(toolMap) {
  return getFavourites().map((id) => toolMap[id]).filter(Boolean);
}

export function pushRecentTool(id) {
  const next = [id, ...getRecentTools().filter((x) => x !== id)].slice(0, 8);
  save(RECENT_KEY, next);
  document.dispatchEvent(new CustomEvent('psdkit:recent-tools', { detail: next }));
  return next;
}

export function getRecentTools() {
  return load(RECENT_KEY, []);
}

export function pushRecentSearch(query) {
  const cleaned = String(query || '').trim();
  if (!cleaned) return getRecentSearches();
  const next = [cleaned, ...getRecentSearches().filter((x) => x.toLowerCase() !== cleaned.toLowerCase())].slice(0, 6);
  save(SEARCH_KEY, next);
  document.dispatchEvent(new CustomEvent('psdkit:recent-searches', { detail: next }));
  return next;
}

export function getRecentSearches() {
  return load(SEARCH_KEY, []);
}

export function saveAiFeedback(id, value) {
  const all = load(AI_FEEDBACK_KEY, {});
  all[id] = value;
  save(AI_FEEDBACK_KEY, all);
  return all;
}

export function getAiFeedback() {
  return load(AI_FEEDBACK_KEY, {});
}
