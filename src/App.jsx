import { useState, useEffect, useMemo } from "react";

const GENRES = [
  "Action", "Comedy", "Drama", "Thriller", "Horror",
  "Romance", "Sci-Fi", "Animation", "Crime", "Documentary",
];

const MOODS = [
  { id: "light", label: "Light & fun" },
  { id: "intense", label: "Intense" },
  { id: "emotional", label: "Emotional" },
  { id: "short", label: "Something short" },
  { id: "binge", label: "Binge-worthy" },
];

const MOVIE_GENRE_IDS = {
  Action: 28, Comedy: 35, Drama: 18, Thriller: 53, Horror: 27,
  Romance: 10749, "Sci-Fi": 878, Animation: 16, Crime: 80, Documentary: 99,
};
const TV_GENRE_IDS = {
  Action: 10759, Comedy: 35, Drama: 18, "Sci-Fi": 10765, Animation: 16, Crime: 80, Documentary: 99,
};
const ALL_GENRE_NAMES = {
  ...Object.fromEntries(Object.entries(MOVIE_GENRE_IDS).map(([k, v]) => [v, k])),
  ...Object.fromEntries(Object.entries(TV_GENRE_IDS).map(([k, v]) => [v, k])),
};

const MOOD_GENRE_BOOST = {
  light: ["Comedy", "Animation"],
  intense: ["Thriller", "Horror", "Crime", "Action"],
  emotional: ["Drama", "Romance"],
};
const PACE_GENRE_BOOST = {
  slow: ["Drama", "Romance", "Documentary"],
  fast: ["Action", "Thriller", "Horror"],
};

const STEPS = ["type", "genres", "moods", "pace", "era", "runtime", "ending"];
const WATCHLIST_KEY = "scenepick_watchlist_v3";
const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

const TMDB_KEY = (import.meta.env.VITE_TMDB_API_KEY || "").trim();
const OMDB_KEY = (import.meta.env.VITE_OMDB_API_KEY || "").trim();

function eraDateRange(era) {
  if (era === "classic") return { lte: "1999-12-31" };
  if (era === "2000s2010s") return { gte: "2000-01-01", lte: "2019-12-31" };
  if (era === "recent") return { gte: "2020-01-01" };
  return {};
}
function runtimeRange(rt) {
  if (rt === "short") return { lte: 100 };
  if (rt === "standard") return { gte: 90, lte: 150 };
  if (rt === "long") return { gte: 140 };
  return {};
}
function singleSelected(arr) {
  const real = arr.filter((x) => x !== "surprise");
  return real.length === 1 ? real[0] : null;
}

function mapResult(r, kind) {
  return {
    tmdbId: r.id,
    type: kind === "movie" ? "Movie" : "Series",
    title: kind === "movie" ? r.title : r.name,
    year: (kind === "movie" ? r.release_date : r.first_air_date || "").slice(0, 4) || "—",
    genres: (r.genre_ids || []).map((id) => ALL_GENRE_NAMES[id]).filter(Boolean),
    overview: r.overview || "No description available.",
    posterPath: r.poster_path,
    tmdbVote: r.vote_average || 0,
  };
}

async function fetchDiscover({ tmdbKey, kind, prefs, keywordIds }) {
  const genreMap = kind === "movie" ? MOVIE_GENRE_IDS : TV_GENRE_IDS;
  const ids = prefs.genres.map((g) => genreMap[g]).filter(Boolean);
  const buildParams = (page) => {
    const params = new URLSearchParams({
      api_key: tmdbKey,
      sort_by: "vote_average.desc",
      "vote_count.gte": "150",
      language: "en-US",
      page: String(page),
    });
    if (ids.length > 0) params.set("with_genres", ids.join("|"));
    if (keywordIds && keywordIds.length > 0) params.set("with_keywords", keywordIds.join("|"));

    const era = singleSelected(prefs.era);
    if (era) {
      const range = eraDateRange(era);
      const field = kind === "movie" ? "primary_release_date" : "first_air_date";
      if (range.gte) params.set(`${field}.gte`, range.gte);
      if (range.lte) params.set(`${field}.lte`, range.lte);
    }
    if (kind === "movie") {
      const rtPref = singleSelected(prefs.runtime);
      if (rtPref) {
        const range = runtimeRange(rtPref);
        if (range.gte) params.set("with_runtime.gte", String(range.gte));
        if (range.lte) params.set("with_runtime.lte", String(range.lte));
      }
    }
    return params;
  };

  const pages = await Promise.all([1, 2].map(async (page) => {
    const res = await fetch(`https://api.themoviedb.org/3/discover/${kind}?${buildParams(page).toString()}`);
    if (!res.ok) throw new Error(`TMDB ${kind} discover failed (${res.status}). Check your TMDB API key.`);
    const data = await res.json();
    return (data.results || []).map((r) => mapResult(r, kind));
  }));
  return pages.flat();
}

const keywordIdCache = {};
async function resolveKeywordIds(tmdbKey, terms) {
  const results = await Promise.all(terms.map(async (term) => {
    if (keywordIdCache[term] !== undefined) return keywordIdCache[term];
    try {
      const res = await fetch(`https://api.themoviedb.org/3/search/keyword?api_key=${tmdbKey}&query=${encodeURIComponent(term)}`);
      const data = await res.json();
      const id = data.results && data.results.length > 0 ? data.results[0].id : null;
      keywordIdCache[term] = id;
      return id;
    } catch (e) {
      keywordIdCache[term] = null;
      return null;
    }
  }));
  return results.filter((id) => id != null);
}

const MOOD_KEYWORD_TERMS = {
  light: ["feel good"],
  intense: ["suspense"],
  emotional: ["tearjerker"],
};
const PACE_KEYWORD_TERMS = {
  slow: ["slow burn"],
  fast: ["fast-paced"],
};
const ENDING_KEYWORD_TERMS = {
  happy: ["happy ending"],
  bittersweet: ["bittersweet"],
  open: ["open ending"],
};

async function resolveAllKeywordIds(tmdbKey, prefs) {
  const terms = [];
  prefs.moods.forEach((m) => { if (MOOD_KEYWORD_TERMS[m]) terms.push(...MOOD_KEYWORD_TERMS[m]); });
  prefs.pace.forEach((p) => { if (p !== "surprise" && PACE_KEYWORD_TERMS[p]) terms.push(...PACE_KEYWORD_TERMS[p]); });
  prefs.ending.forEach((e) => { if (e !== "surprise" && ENDING_KEYWORD_TERMS[e]) terms.push(...ENDING_KEYWORD_TERMS[e]); });
  if (terms.length === 0) return [];
  return resolveKeywordIds(tmdbKey, terms);
}

async function fetchSimilar({ tmdbKey, tmdbId, kind }) {
  const path = kind === "Movie" ? "movie" : "tv";
  const res = await fetch(`https://api.themoviedb.org/3/${path}/${tmdbId}/similar?api_key=${tmdbKey}&language=en-US&page=1`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).slice(0, 3).map((r) => mapResult(r, path));
}

async function searchTitles({ tmdbKey, query }) {
  const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&language=en-US&query=${encodeURIComponent(query)}&page=1`);
  if (!res.ok) throw new Error("Search failed. Check your TMDB API key.");
  const data = await res.json();
  return (data.results || [])
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 20)
    .map((r) => mapResult(r, r.media_type));
}

async function fetchTrending({ tmdbKey }) {
  const res = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${tmdbKey}&language=en-US`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || [])
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 20)
    .map((r) => mapResult(r, r.media_type));
}

function rerankScore(item, prefs) {
  let bonus = 0;
  prefs.moods.forEach((m) => {
    if (MOOD_GENRE_BOOST[m] && item.genres.some((g) => MOOD_GENRE_BOOST[m].includes(g))) bonus += 2;
    if (m === "binge" && item.type === "Series") bonus += 2;
  });
  prefs.pace.forEach((p) => {
    if (PACE_GENRE_BOOST[p] && item.genres.some((g) => PACE_GENRE_BOOST[p].includes(g))) bonus += 2;
  });
  return bonus + item.tmdbVote;
}

async function enrichWithRatings(item, tmdbKey, omdbKey) {
  try {
    const detailRes = await fetch(
      `https://api.themoviedb.org/3/${item.type === "Movie" ? "movie" : "tv"}/${item.tmdbId}?api_key=${tmdbKey}&append_to_response=external_ids`
    );
    const detail = await detailRes.json();
    const imdbId = detail.external_ids?.imdb_id;
    let imdb = null, rt = null;
    if (imdbId && omdbKey) {
      const omdbRes = await fetch(`https://www.omdbapi.com/?apikey=${omdbKey}&i=${imdbId}`);
      const omdb = await omdbRes.json();
      if (omdb.imdbRating && omdb.imdbRating !== "N/A") imdb = parseFloat(omdb.imdbRating);
      const rtEntry = (omdb.Ratings || []).find((r) => r.Source === "Rotten Tomatoes");
      if (rtEntry) rt = parseInt(rtEntry.Value, 10);
    }
    return { ...item, imdb, rt };
  } catch (e) {
    return { ...item, imdb: null, rt: null };
  }
}

function Poster({ posterPath, title }) {
  if (posterPath) {
    return (
      <img
        src={`${POSTER_BASE}${posterPath}`}
        alt={title}
        style={{ width: 64, height: 92, borderRadius: 10, objectFit: "cover", flexShrink: 0, background: "#EFE3D8" }}
      />
    );
  }
  return (
    <div
      style={{
        width: 64, height: 92, borderRadius: 10, flexShrink: 0,
        background: "linear-gradient(160deg, #E8D9C8, #D9C4AC)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      title={`No poster for ${title}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" opacity="0.5">
        <path d="M4 4h16v16H4V4z" stroke="#6B6472" strokeWidth="1.6" />
        <path d="M4 15l4-4 3 3 5-6 4 5" stroke="#6B6472" strokeWidth="1.6" />
      </svg>
    </div>
  );
}

function RatingBadges({ imdb, rt }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "-apple-system, sans-serif", fontSize: 11 }}>
        <span style={{ background: "#F5C518", color: "#2E2A33", fontWeight: 800, padding: "1px 5px", borderRadius: 4, fontSize: 10 }}>IMDb</span>
        <span style={{ color: "#6B6472", fontWeight: 600 }}>{imdb != null ? imdb : "—"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "-apple-system, sans-serif", fontSize: 11 }}>
        <span>{rt != null ? (rt >= 60 ? "🍅" : "🟢") : "—"}</span>
        <span style={{ color: "#6B6472", fontWeight: 600 }}>{rt != null ? `${rt}%` : "—"}</span>
      </div>
    </div>
  );
}

function LogoMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <rect width="100" height="100" rx="22" fill="#FF6B4A" />
      <path d="M28 42 L37 82 L44 82 L46 48 L54 48 L56 82 L63 82 L72 42 Z" fill="#FFFFFF" />
      <path d="M28 43 a9 9 0 0 1 11 -13 a10 10 0 0 1 22 0 a9 9 0 0 1 11 13 Z" fill="#FFFFFF" />
      <circle cx="50" cy="60" r="17" fill="#FF6B4A" stroke="#FFFFFF" strokeWidth="2.4" />
      <polygon points="45,52 45,68 59,60" fill="#FFFFFF" />
    </svg>
  );
}

function Chip({ active, onClick, children, variant }) {
  return (
    <button onClick={onClick} className={`chip ${variant === "mood" ? "mood-chip" : ""} ${active ? "active" : ""}`}>
      {children}
    </button>
  );
}

function MiniCard({ m, isAdded, onAdd }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", background: "#FFF9F3", borderRadius: 12, marginBottom: 8 }}>
      <Poster posterPath={m.posterPath} title={m.title} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{m.title}</div>
        <div style={{ fontSize: 11, color: "#B5A896", fontWeight: 600, marginTop: 2 }}>{m.type} · {m.year}</div>
      </div>
      <button className={`small-btn ${isAdded ? "added" : ""}`} onClick={onAdd}>{isAdded ? "✓" : "+ Add"}</button>
    </div>
  );
}

function OverallRating({ value, onChange }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#B5A896", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Your rating {value > 0 ? `— ${value}/10` : ""}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n === value ? 0 : n)}
            style={{
              width: 22, height: 26, borderRadius: 5, border: "none", cursor: "pointer",
              background: n <= value ? "#FF6B4A" : "#F1E6DA",
              color: n <= value ? "#FFFFFF" : "#B5A896",
              fontSize: 10, fontWeight: 700,
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("quiz");
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [watchlist, setWatchlist] = useState([]);
  const [watchlistLoaded, setWatchlistLoaded] = useState(false);
  const [watchlistSort, setWatchlistSort] = useState("added");
  const [roulette, setRoulette] = useState({ spinning: false, pick: null });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [trending, setTrending] = useState([]);
  const [trendingLoaded, setTrendingLoaded] = useState(false);

  const [similarOpenFor, setSimilarOpenFor] = useState(null);
  const [similarItems, setSimilarItems] = useState({});

  const [prefs, setPrefs] = useState({
    type: "either", genres: [], moods: [], pace: [], era: [], runtime: [], ending: [],
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WATCHLIST_KEY);
      if (raw) setWatchlist(JSON.parse(raw));
    } catch (e) {
      // no saved watchlist yet
    } finally {
      setWatchlistLoaded(true);
    }
  }, []);

  const saveWatchlist = (next) => {
    setWatchlist(next);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
  };
  const isInWatchlist = (id) => watchlist.some((w) => w.tmdbId === id);
  const addToWatchlist = (item) => {
    if (isInWatchlist(item.tmdbId)) return;
    saveWatchlist([...watchlist, { ...item, myRating: 0, watched: false, addedAt: Date.now() }]);
  };
  const removeFromWatchlist = (id) => saveWatchlist(watchlist.filter((w) => w.tmdbId !== id));
  const setMyRating = (id, rating) => saveWatchlist(watchlist.map((w) => (w.tmdbId === id ? { ...w, myRating: rating } : w)));
  const toggleWatched = (id) => saveWatchlist(watchlist.map((w) => (w.tmdbId === id ? { ...w, watched: !w.watched } : w)));

  const spinRoulette = () => {
    const eligible = watchlist.filter((w) => !w.watched);
    if (eligible.length === 0) return;
    setRoulette({ spinning: true, pick: eligible[Math.floor(Math.random() * eligible.length)] });
    let ticks = 0;
    const maxTicks = 13;
    const interval = setInterval(() => {
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(interval);
        setRoulette({ spinning: false, pick: eligible[Math.floor(Math.random() * eligible.length)] });
        return;
      }
      setRoulette({ spinning: true, pick: eligible[Math.floor(Math.random() * eligible.length)] });
    }, 90);
  };

  const sortedWatchlist = useMemo(() => {
    const list = [...watchlist];
    if (watchlistSort === "rating") return list.sort((a, b) => (b.myRating || 0) - (a.myRating || 0));
    if (watchlistSort === "year") return list.sort((a, b) => (b.year || 0) - (a.year || 0));
    if (watchlistSort === "title") return list.sort((a, b) => a.title.localeCompare(b.title));
    return list.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  }, [watchlist, watchlistSort]);

  useEffect(() => {
    if (!TMDB_KEY || trendingLoaded) return;
    (async () => {
      const t = await fetchTrending({ tmdbKey: TMDB_KEY });
      setTrending(t);
      setTrendingLoaded(true);
    })();
  }, [TMDB_KEY, trendingLoaded]);

  useEffect(() => {
    if (!searchQuery.trim() || !TMDB_KEY) { setSearchResults([]); return; }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await searchTitles({ tmdbKey: TMDB_KEY, query: searchQuery.trim() });
        setSearchResults(r);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => clearTimeout(handle);
  }, [searchQuery, TMDB_KEY]);

  const toggleGenre = (g) => setPrefs((p) => ({ ...p, genres: p.genres.includes(g) ? p.genres.filter((x) => x !== g) : [...p.genres, g] }));
  const toggleMood = (m) => setPrefs((p) => ({ ...p, moods: p.moods.includes(m) ? p.moods.filter((x) => x !== m) : [...p.moods, m] }));
  const toggleSurprisable = (field, value) => setPrefs((p) => {
    const current = p[field];
    if (value === "surprise") return { ...p, [field]: current.includes("surprise") ? [] : ["surprise"] };
    const withoutSurprise = current.filter((x) => x !== "surprise");
    const has = withoutSurprise.includes(value);
    return { ...p, [field]: has ? withoutSurprise.filter((x) => x !== value) : [...withoutSurprise, value] };
  });

  const canAdvance = () => {
    const k = STEPS[step];
    if (k === "type") return true;
    if (k === "genres") return prefs.genres.length > 0;
    if (k === "moods") return prefs.moods.length > 0;
    if (k === "pace") return prefs.pace.length > 0;
    if (k === "era") return prefs.era.length > 0;
    if (k === "runtime") return prefs.runtime.length > 0;
    if (k === "ending") return prefs.ending.length > 0;
    return true;
  };

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const kinds = prefs.type === "movie" ? ["movie"] : prefs.type === "series" ? ["tv"] : ["movie", "tv"];
      const keywordIds = await resolveAllKeywordIds(TMDB_KEY, prefs);
      const pools = await Promise.all(kinds.map((kind) => fetchDiscover({ tmdbKey: TMDB_KEY, kind, prefs, keywordIds })));
      const seen = new Set();
      const deduped = pools.flat().filter((c) => {
        const key = `${c.type}-${c.tmdbId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      let candidates = deduped.map((c) => ({ ...c, rank: rerankScore(c, prefs) }));
      candidates.sort((a, b) => b.rank - a.rank);
      const top = candidates.slice(0, 18);
      const enriched = await Promise.all(top.map((c) => enrichWithRatings(c, TMDB_KEY, OMDB_KEY)));
      enriched.sort((a, b) => b.rank - a.rank);
      setResults(enriched.slice(0, 15));
      setShowResults(true);
    } catch (e) {
      setError(e.message || "Something went wrong while fetching picks. Check your API keys and try again.");
    } finally {
      setLoading(false);
    }
  };

  const openSimilar = async (item) => {
    if (similarOpenFor === item.tmdbId) { setSimilarOpenFor(null); return; }
    setSimilarOpenFor(item.tmdbId);
    if (!similarItems[item.tmdbId]) {
      const sim = await fetchSimilar({ tmdbKey: TMDB_KEY, tmdbId: item.tmdbId, kind: item.type });
      setSimilarItems((prev) => ({ ...prev, [item.tmdbId]: sim }));
    }
  };

  const goNext = () => { if (step < STEPS.length - 1) setStep(step + 1); else runSearch(); };
  const goBack = () => { if (showResults) { setShowResults(false); return; } if (step > 0) setStep(step - 1); };
  const restart = () => {
    setPrefs({ type: "either", genres: [], moods: [], pace: [], era: [], runtime: [], ending: [] });
    setStep(0); setShowResults(false); setResults([]); setError(null);
  };

  const key = STEPS[step];

  return (
    <div style={{ minHeight: "100vh", background: "#FBF3EC", color: "#2E2A33", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        .chip {
          border: 1.5px solid #EAD9C8; background: #FFFFFF; color: #6B6472;
          padding: 11px 19px; border-radius: 14px; font-size: 14px; font-weight: 600;
          letter-spacing: 0.01em; cursor: pointer; transition: all 0.15s ease;
        }
        .chip:hover { border-color: #FF6B4A; color: #2E2A33; }
        .chip.active { background: #FF6B4A; border-color: #FF6B4A; color: #FFFFFF; }
        .mood-chip.active { background: #2F9E8F; border-color: #2F9E8F; color: #FFFFFF; }
        .nav-btn {
          border: none; padding: 14px 30px; border-radius: 14px; font-size: 15px;
          font-weight: 800; letter-spacing: 0.01em; cursor: pointer;
          transition: transform 0.12s ease, opacity 0.12s ease;
        }
        .nav-btn.primary { background: #FF6B4A; color: #FFFFFF; box-shadow: 0 6px 16px rgba(255,107,74,0.28); }
        .nav-btn.primary:disabled { opacity: 0.35; cursor: not-allowed; box-shadow: none; }
        .nav-btn.primary:not(:disabled):hover { transform: translateY(-1px); }
        .nav-btn.ghost { background: transparent; color: #8A8290; border: 1.5px solid #EAD9C8; }
        .nav-btn.ghost:hover { color: #2E2A33; border-color: #D9C4B0; }
        .small-btn {
          border: 1.5px solid #EAD9C8; background: #FFFFFF; color: #6B6472;
          padding: 7px 12px; border-radius: 10px; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.15s ease; white-space: nowrap;
        }
        .small-btn.added { background: #2F9E8F; border-color: #2F9E8F; color: #FFFFFF; }
        .small-btn.remove { color: #D9534F; border-color: #F2D6D3; }
        .ticket {
          position: relative; background: #FFFFFF; border-radius: 16px;
          padding: 16px; margin-bottom: 14px; overflow: hidden;
          display: flex; gap: 14px;
          box-shadow: 0 3px 14px rgba(46,42,51,0.06);
        }
        .tab-btn { border: none; background: transparent; padding: 8px 10px; border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer; color: #B5A896; white-space: nowrap; }
        .tab-btn.active { background: #2E2A33; color: #FFFFFF; }
        .field {
          width: 100%; padding: 12px 14px; border-radius: 10px; border: 1.5px solid #EAD9C8;
          font-size: 14px; margin-bottom: 14px; font-family: -apple-system, sans-serif;
        }
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 16, letterSpacing: "0.01em", color: "#2E2A33", fontWeight: 800 }}>
            <LogoMark size={24} />
            ScenePick
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
          <div style={{ display: "flex", gap: 2, background: "#F1E6DA", padding: 4, borderRadius: 14 }}>
            <button className={`tab-btn ${view === "quiz" ? "active" : ""}`} onClick={() => setView("quiz")}>Discover</button>
            <button className={`tab-btn ${view === "search" ? "active" : ""}`} onClick={() => setView("search")}>Search</button>
            <button className={`tab-btn ${view === "watchlist" ? "active" : ""}`} onClick={() => setView("watchlist")}>
              My List{watchlist.length > 0 ? ` (${watchlist.length})` : ""}
            </button>
          </div>
        </div>

        {view === "quiz" && !showResults && !loading && (
          <>
            <div style={{ display: "flex", gap: 5, marginBottom: 28 }}>
              {STEPS.map((s, i) => <div key={s} style={{ height: 4, flex: 1, borderRadius: 3, background: i <= step ? "#FF6B4A" : "#EFE3D8" }} />)}
            </div>
            <div style={{ fontSize: 12, color: "#B5A896", marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Step {step + 1} of {STEPS.length}
            </div>

            {key === "type" && (<>
              <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 24px", lineHeight: 1.15 }}>Movie, series, or either?</h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[{ id: "either", l: "Either" }, { id: "movie", l: "Movie" }, { id: "series", l: "Series" }].map((o) => (
                  <Chip key={o.id} active={prefs.type === o.id} onClick={() => setPrefs((p) => ({ ...p, type: o.id }))}>{o.l}</Chip>
                ))}
              </div>
            </>)}

            {key === "genres" && (<>
              <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 24px", lineHeight: 1.15 }}>Pick a few genres</h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {GENRES.map((g) => <Chip key={g} active={prefs.genres.includes(g)} onClick={() => toggleGenre(g)}>{g}</Chip>)}
              </div>
            </>)}

            {key === "moods" && (<>
              <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 24px", lineHeight: 1.15 }}>What mood are you after?</h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {MOODS.map((m) => <Chip key={m.id} variant="mood" active={prefs.moods.includes(m.id)} onClick={() => toggleMood(m.id)}>{m.label}</Chip>)}
              </div>
            </>)}

            {key === "pace" && (<>
              <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.15 }}>Slow-burn or fast-paced?</h1>
              <p style={{ fontSize: 13, color: "#B5A896", margin: "0 0 20px", fontWeight: 600 }}>Pick one, both, or let us surprise you.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[{ id: "slow", l: "Slow-burn, atmospheric" }, { id: "fast", l: "Fast-paced" }, { id: "surprise", l: "🎲 Surprise me" }].map((o) => (
                  <Chip key={o.id} active={prefs.pace.includes(o.id)} onClick={() => toggleSurprisable("pace", o.id)}>{o.l}</Chip>
                ))}
              </div>
            </>)}

            {key === "era" && (<>
              <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.15 }}>Any preferred era?</h1>
              <p style={{ fontSize: 13, color: "#B5A896", margin: "0 0 20px", fontWeight: 600 }}>Pick one, mix a couple, or let us surprise you.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[{ id: "classic", l: "Classic (pre-2000)" }, { id: "2000s2010s", l: "2000s–2010s" }, { id: "recent", l: "Recent (2020+)" }, { id: "surprise", l: "🎲 Surprise me" }].map((o) => (
                  <Chip key={o.id} active={prefs.era.includes(o.id)} onClick={() => toggleSurprisable("era", o.id)}>{o.l}</Chip>
                ))}
              </div>
            </>)}

            {key === "runtime" && (<>
              <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.15 }}>How much time do you have?</h1>
              <p style={{ fontSize: 13, color: "#B5A896", margin: "0 0 20px", fontWeight: 600 }}>Applies to movies — pick one, mix, or surprise us.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[{ id: "short", l: "Quick (~90 min)" }, { id: "standard", l: "Standard length" }, { id: "long", l: "Long, immersive" }, { id: "surprise", l: "🎲 Surprise me" }].map((o) => (
                  <Chip key={o.id} active={prefs.runtime.includes(o.id)} onClick={() => toggleSurprisable("runtime", o.id)}>{o.l}</Chip>
                ))}
              </div>
            </>)}

            {key === "ending" && (<>
              <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.15 }}>How should it end?</h1>
              <p style={{ fontSize: 13, color: "#B5A896", margin: "0 0 20px", fontWeight: 600 }}>Helps us fine-tune future recommendations.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[{ id: "happy", l: "Happy ending, please" }, { id: "bittersweet", l: "Bittersweet is fine" }, { id: "open", l: "Open-ended" }, { id: "surprise", l: "🎲 Surprise me" }].map((o) => (
                  <Chip key={o.id} active={prefs.ending.includes(o.id)} onClick={() => toggleSurprisable("ending", o.id)}>{o.l}</Chip>
                ))}
              </div>
            </>)}

            <div style={{ display: "flex", gap: 10, marginTop: 36 }}>
              {step > 0 && <button className="nav-btn ghost" onClick={goBack}>Back</button>}
              <button className="nav-btn primary" disabled={!canAdvance()} onClick={goNext}>
                {step === STEPS.length - 1 ? "Show my picks →" : "Next"}
              </button>
            </div>
          </>
        )}

        {loading && (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#B5A896", fontWeight: 700 }}>Finding your picks…</div>
        )}

        {error && (
          <div style={{ padding: "20px 0" }}>
            <p style={{ color: "#D9534F", fontWeight: 600, marginBottom: 16 }}>{error}</p>
            <button className="nav-btn ghost" onClick={goBack}>Go back</button>
          </div>
        )}

        {!loading && !error && view === "quiz" && showResults && (
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 20px" }}>Your picks 🍿</h1>
            {results.map((m) => (
              <div key={m.tmdbId} className="ticket">
                <Poster posterPath={m.posterPath} title={m.title} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>{m.title}</span>
                    <button className={`small-btn ${isInWatchlist(m.tmdbId) ? "added" : ""}`} onClick={() => isInWatchlist(m.tmdbId) ? removeFromWatchlist(m.tmdbId) : addToWatchlist(m)}>
                      {isInWatchlist(m.tmdbId) ? "✓ Added" : "+ My List"}
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: "#B5A896", marginTop: 4, fontWeight: 600 }}>
                    {m.type} · {m.year} · {m.genres.join(", ") || "—"}
                  </div>
                  <RatingBadges imdb={m.imdb} rt={m.rt} />
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "#6B6472", marginTop: 8 }}>{m.overview}</div>
                  <button onClick={() => openSimilar(m)} style={{ border: "none", background: "transparent", color: "#FF6B4A", fontWeight: 700, fontSize: 12, padding: 0, marginTop: 10, cursor: "pointer" }}>
                    {similarOpenFor === m.tmdbId ? "Hide similar ▲" : "Similar titles ▼"}
                  </button>
                  {similarOpenFor === m.tmdbId && (
                    <div style={{ marginTop: 10 }}>
                      {!similarItems[m.tmdbId] && <p style={{ fontSize: 12, color: "#B5A896" }}>Loading…</p>}
                      {(similarItems[m.tmdbId] || []).map((s) => (
                        <MiniCard key={s.tmdbId} m={s} isAdded={isInWatchlist(s.tmdbId)} onAdd={() => addToWatchlist(s)} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button className="nav-btn ghost" onClick={goBack}>Adjust answers</button>
              <button className="nav-btn primary" onClick={restart}>Start over</button>
            </div>
          </div>
        )}

        {view === "search" && (
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 16px" }}>Search titles</h1>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type a movie or series title…"
              className="field"
            />
            {searching && <p style={{ color: "#B5A896", fontWeight: 600 }}>Searching…</p>}
            {!searching && searchQuery.trim() && searchResults.length === 0 && (
              <p style={{ color: "#B5A896", fontWeight: 600 }}>No titles match "{searchQuery}".</p>
            )}
            {searchQuery.trim() && searchResults.map((m) => (
              <MiniCard key={m.tmdbId} m={m} isAdded={isInWatchlist(m.tmdbId)} onAdd={() => addToWatchlist(m)} />
            ))}
            {!searchQuery.trim() && (
              <>
                <div style={{ fontSize: 12, color: "#B5A896", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                  🔥 Trending this week
                </div>
                {!trendingLoaded && <p style={{ color: "#B5A896", fontWeight: 600 }}>Loading…</p>}
                {trending.map((m) => (
                  <MiniCard key={m.tmdbId} m={m} isAdded={isInWatchlist(m.tmdbId)} onAdd={() => addToWatchlist(m)} />
                ))}
              </>
            )}
          </div>
        )}

        {view === "watchlist" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>My List</h1>
              {watchlist.length > 1 && (
                <select value={watchlistSort} onChange={(e) => setWatchlistSort(e.target.value)} style={{ border: "1.5px solid #EAD9C8", borderRadius: 10, padding: "6px 10px", fontSize: 12, fontWeight: 700, color: "#6B6472", background: "#FFFFFF" }}>
                  <option value="added">Recently added</option>
                  <option value="rating">My rating</option>
                  <option value="year">Year</option>
                  <option value="title">Title A–Z</option>
                </select>
              )}
            </div>
            {!watchlistLoaded && <p style={{ color: "#B5A896", fontWeight: 600 }}>Loading…</p>}
            {watchlistLoaded && watchlist.length === 0 && (
              <p style={{ color: "#B5A896", fontWeight: 600, lineHeight: 1.6 }}>
                Nothing here yet. Go to "Discover" or "Search" and tap "+ My List" to save titles here.
              </p>
            )}
            {watchlistLoaded && watchlist.some((w) => !w.watched) && (
              <button
                className="nav-btn primary"
                style={{ width: "100%", marginBottom: 16 }}
                disabled={roulette.spinning}
                onClick={spinRoulette}
              >
                {roulette.spinning ? "🎲 Spinning…" : "🎲 Pick one for me"}
              </button>
            )}
            {roulette.pick && (
              <div className="ticket" style={{ border: "2px solid #FF6B4A", marginBottom: 20 }}>
                <Poster posterPath={roulette.pick.posterPath} title={roulette.pick.title} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#FF6B4A", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                    {roulette.spinning ? "Spinning…" : "🎬 Tonight's pick"}
                  </div>
                  <span style={{ fontSize: 17, fontWeight: 800 }}>{roulette.pick.title}</span>
                  <div style={{ fontSize: 12, color: "#B5A896", marginTop: 4, fontWeight: 600 }}>
                    {roulette.pick.type} · {roulette.pick.year}
                  </div>
                  {!roulette.spinning && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button className="small-btn" onClick={spinRoulette}>🎲 Spin again</button>
                      <button className="small-btn" onClick={() => setRoulette({ spinning: false, pick: null })}>Dismiss</button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {sortedWatchlist.map((m) => (
              <div key={m.tmdbId} className="ticket" style={{ opacity: m.watched ? 0.6 : 1 }}>
                <Poster posterPath={m.posterPath} title={m.title} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>{m.title}{m.watched ? " ✓" : ""}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="small-btn" onClick={() => toggleWatched(m.tmdbId)}>{m.watched ? "Unwatch" : "Watched"}</button>
                      <button className="small-btn remove" onClick={() => removeFromWatchlist(m.tmdbId)}>Remove</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#B5A896", marginTop: 4, fontWeight: 600 }}>
                    {m.type} · {m.year} · {(m.genres || []).join(", ") || "—"}
                  </div>
                  <RatingBadges imdb={m.imdb} rt={m.rt} />
                  <OverallRating value={m.myRating || 0} onChange={(v) => setMyRating(m.tmdbId, v)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
