// Extra TMDB API helpers: watch providers, season/episode details, popular titles for
// the "rate a few movies" taste bootstrap. Kept separate from App.jsx so the main file
// doesn't grow unmanageably.

// Best-effort region guess for the watch-providers endpoint (TMDB needs an ISO country code).
// Falls back to "US" if we can't tell — the endpoint just returns an empty list for regions
// with no data, so a wrong guess never breaks anything, it just shows nothing.
export function guessRegion() {
  try {
    const locale = (navigator.language || "en-US").split("-");
    const region = locale[1];
    if (region && region.length === 2) return region.toUpperCase();
  } catch (e) {
    // ignore
  }
  return "US";
}

const watchProvidersCache = {};

// Returns { link, flatrate: [...], rent: [...], buy: [...] } for the guessed region, or null
// if there's no listing at all (common for obscure titles / regions).
export async function fetchWatchProviders({ tmdbKey, tmdbId, kind }) {
  const path = kind === "Movie" ? "movie" : "tv";
  const cacheKey = `${path}-${tmdbId}`;
  if (watchProvidersCache[cacheKey] !== undefined) return watchProvidersCache[cacheKey];
  try {
    const res = await fetch(`https://api.themoviedb.org/3/${path}/${tmdbId}/watch/providers?api_key=${tmdbKey}`);
    if (!res.ok) { watchProvidersCache[cacheKey] = null; return null; }
    const data = await res.json();
    const region = guessRegion();
    const entry = (data.results && (data.results[region] || data.results.US)) || null;
    watchProvidersCache[cacheKey] = entry;
    return entry;
  } catch (e) {
    watchProvidersCache[cacheKey] = null;
    return null;
  }
}

export const PROVIDER_LOGO_BASE = "https://image.tmdb.org/t/p/w92";

// A handful of well-known, popular movies used to bootstrap a taste profile. Pulled live from
// TMDB's "popular" endpoint (movies only — easiest for people to have an opinion on) rather than
// niche titles, since the whole point is "have you seen this?".
export async function fetchTasteCandidates({ tmdbKey, count = 10 }) {
  try {
    const pages = await Promise.all([1, 2].map((p) =>
      fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${tmdbKey}&language=en-US&page=${p}`).then((r) => r.json())
    ));
    const results = pages.flatMap((d) => d.results || []);
    // Shuffle lightly so the bootstrap set isn't identical every time.
    const shuffled = [...results].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map((r) => ({
      tmdbId: r.id,
      type: "Movie",
      title: r.title,
      year: (r.release_date || "").slice(0, 4) || "—",
      genreIds: r.genre_ids || [],
      posterPath: r.poster_path,
    }));
  } catch (e) {
    return [];
  }
}
