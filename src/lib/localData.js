// Small localStorage-backed helpers that don't need Firestore: daily-open streak, and the
// genre-weight profile built from the "rate a few movies" taste bootstrap.

const STREAK_KEY = "scenepick_streak_v1";
const TASTE_KEY = "scenepick_taste_v1";
const NOTIF_KEY = "scenepick_notify_v1";

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, local-ish is fine for a streak
}
function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

// Call once per app load. Returns the up-to-date { count, lastOpen } and persists it.
// - same day as last open  -> streak unchanged
// - exactly one day later  -> streak +1
// - more than one day gap  -> streak resets to 1
export function bumpStreak() {
  let state = { count: 0, lastOpen: null };
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) state = JSON.parse(raw);
  } catch (e) {
    // corrupt or missing — start fresh
  }
  const today = todayStr();
  if (state.lastOpen === today) return state;
  const gap = state.lastOpen ? daysBetween(state.lastOpen, today) : null;
  const nextCount = gap === 1 ? (state.count || 0) + 1 : 1;
  const next = { count: nextCount, lastOpen: today };
  localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  return next;
}

export function getStreak() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return { count: 0, lastOpen: null };
}

// --- Taste bootstrap -------------------------------------------------------
// Genre weights nudge rerankScore toward genres the user has actually enjoyed before, on top
// of whatever mood/pace/era chips they picked. `ratedIds` prevents re-showing the same title.

export function getTasteProfile() {
  try {
    const raw = localStorage.getItem(TASTE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return { genreWeights: {}, ratedIds: [] };
}

// liked: true = boost these genres, false = slightly suppress them
export function recordTasteRating({ tmdbId, genreNames, liked }) {
  const profile = getTasteProfile();
  const weights = { ...profile.genreWeights };
  genreNames.forEach((g) => {
    const current = weights[g] || 0;
    weights[g] = current + (liked ? 1 : -0.5);
  });
  const ratedIds = profile.ratedIds.includes(tmdbId) ? profile.ratedIds : [...profile.ratedIds, tmdbId];
  const next = { genreWeights: weights, ratedIds };
  localStorage.setItem(TASTE_KEY, JSON.stringify(next));
  return next;
}

// --- Notification preference ------------------------------------------------
// We only store the on/off flag here; actual scheduling lives in lib/notifications.js.

export function getNotifPref() {
  return localStorage.getItem(NOTIF_KEY) === "on";
}
export function setNotifPref(on) {
  localStorage.setItem(NOTIF_KEY, on ? "on" : "off");
}
