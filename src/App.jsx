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

// posterHue stands in for a real poster image. When the real app is built
// (outside this chat's sandboxed preview), this is replaced by a live TMDB poster URL.
const CATALOG = [
  { title: "Talent Cage", year: 2019, type: "Movie", genres: ["Drama", "Crime"], moods: ["intense", "emotional"], imdb: 8.5, rt: 91, posterHue: 210, era: "recent", pace: "slow", runtime: "standard", ending: "bittersweet", blurb: "An ex-convict arranges a meeting with his victim's father, searching for forgiveness." },
  { title: "Night Shift", year: 2021, type: "Series", genres: ["Thriller", "Drama"], moods: ["intense", "binge"], imdb: 8.1, rt: 84, posterHue: 260, era: "recent", pace: "fast", runtime: "long", ending: "open", blurb: "A nurse uncovers a dark secret in the hospital where she works the night rounds." },
  { title: "Two Coffees", year: 2018, type: "Movie", genres: ["Romance", "Comedy"], moods: ["light", "short"], imdb: 7.2, rt: 76, posterHue: 20, era: "recent", pace: "slow", runtime: "short", ending: "happy", blurb: "Two strangers keep meeting at the same coffee shop every morning and slowly fall for each other." },
  { title: "Storm's Edge", year: 2022, type: "Movie", genres: ["Action", "Thriller"], moods: ["intense", "short"], imdb: 7.8, rt: 80, posterHue: 195, era: "recent", pace: "fast", runtime: "short", ending: "happy", blurb: "A rescue crew races against time as a superstorm closes in on the coast." },
  { title: "Synapses", year: 2020, type: "Series", genres: ["Sci-Fi", "Drama"], moods: ["emotional", "binge"], imdb: 8.9, rt: 96, posterHue: 280, era: "recent", pace: "slow", runtime: "long", ending: "bittersweet", blurb: "A scientist finds a way to transfer memories between people — with unpredictable consequences." },
  { title: "The Small Orchestra", year: 2017, type: "Movie", genres: ["Comedy", "Drama"], moods: ["light", "emotional"], imdb: 7.6, rt: 88, posterHue: 40, era: "2000s2010s", pace: "slow", runtime: "standard", ending: "happy", blurb: "A group of retired musicians decides to play together again, no matter what." },
  { title: "Dark Side of Town", year: 2023, type: "Series", genres: ["Crime", "Thriller"], moods: ["intense", "binge"], imdb: 8.3, rt: 87, posterHue: 230, era: "recent", pace: "fast", runtime: "long", ending: "open", blurb: "A detective investigates a string of disappearances tied to the city's political elite." },
  { title: "Paper Boats", year: 2016, type: "Animation", genres: ["Animation", "Drama"], moods: ["emotional", "short"], imdb: 8.0, rt: 93, posterHue: 160, era: "2000s2010s", pace: "slow", runtime: "short", ending: "bittersweet", blurb: "A girl sends paper boats down a river, each one carrying a memory from her childhood." },
  { title: "The Last Train", year: 2021, type: "Movie", genres: ["Horror", "Thriller"], moods: ["intense", "short"], imdb: 6.9, rt: 64, posterHue: 0, era: "recent", pace: "fast", runtime: "short", ending: "open", blurb: "Passengers on a night train realize they aren't alone between the cars." },
  { title: "Common Ground", year: 2019, type: "Documentary", genres: ["Documentary"], moods: ["emotional", "binge"], imdb: 8.4, rt: 97, posterHue: 100, era: "recent", pace: "slow", runtime: "standard", ending: "bittersweet", blurb: "A look at the lives of teachers in remote villages, told through their own eyes." },
  { title: "Second Try", year: 2022, type: "Movie", genres: ["Romance", "Drama"], moods: ["emotional", "short"], imdb: 7.4, rt: 79, posterHue: 330, era: "recent", pace: "slow", runtime: "standard", ending: "happy", blurb: "A couple reunites ten years after their breakup, at a mutual friend's wedding." },
  { title: "Code: Silence", year: 2020, type: "Series", genres: ["Thriller", "Sci-Fi"], moods: ["intense", "binge"], imdb: 8.6, rt: 90, posterHue: 250, era: "recent", pace: "fast", runtime: "long", ending: "open", blurb: "A hacker uncovers a government surveillance program hidden inside an everyday app." },
  { title: "Summer in Sozopol", year: 2015, type: "Movie", genres: ["Comedy", "Romance"], moods: ["light", "short"], imdb: 7.0, rt: 72, posterHue: 45, era: "2000s2010s", pace: "slow", runtime: "short", ending: "happy", blurb: "A group of friends spends their last student summer on the coast." },
  { title: "Ash and Salt", year: 2023, type: "Movie", genres: ["Drama", "Crime"], moods: ["intense", "emotional"], imdb: 8.2, rt: 86, posterHue: 15, era: "recent", pace: "slow", runtime: "standard", ending: "bittersweet", blurb: "A former firefighter returns to his hometown to investigate his brother's death." },
  { title: "Pocket Worlds", year: 2018, type: "Animation", genres: ["Animation", "Sci-Fi", "Comedy"], moods: ["light", "binge"], imdb: 8.7, rt: 95, posterHue: 175, era: "2000s2010s", pace: "fast", runtime: "standard", ending: "happy", blurb: "A kid discovers that every pocket in his grandfather's old coat leads to a different world." },
  { title: "Midnight Reel", year: 1997, type: "Movie", genres: ["Drama", "Romance"], moods: ["emotional", "short"], imdb: 8.0, rt: 89, posterHue: 260, era: "classic", pace: "slow", runtime: "standard", ending: "bittersweet", blurb: "A projectionist falls for a regular who visits the same theater every Friday night." },
  { title: "The Long Watch", year: 1985, type: "Movie", genres: ["Thriller", "Crime"], moods: ["intense", "binge"], imdb: 8.1, rt: 92, posterHue: 30, era: "classic", pace: "slow", runtime: "long", ending: "open", blurb: "A retired detective is pulled back for one last case that hits closer to home than he expects." },
];

const STEPS = ["type", "genres", "moods", "pace", "era", "runtime", "ending"];
const WATCHLIST_KEY = "scenepick_watchlist_v2";

function scoreMovie(m, prefs) {
  let score = 0;
  prefs.genres.forEach((g) => { if (m.genres.includes(g)) score += 2; });
  prefs.moods.forEach((mo) => { if (m.moods.includes(mo)) score += 3; });
  if (prefs.pace.length > 0 && !prefs.pace.includes("surprise") && prefs.pace.includes(m.pace)) score += 2;
  if (prefs.era.length > 0 && !prefs.era.includes("surprise") && prefs.era.includes(m.era)) score += 2;
  if (prefs.runtime.length > 0 && !prefs.runtime.includes("surprise") && prefs.runtime.includes(m.runtime)) score += 2;
  if (prefs.ending.length > 0 && !prefs.ending.includes("surprise") && prefs.ending.includes(m.ending)) score += 2;
  return score;
}

function passesHardFilters(m, prefs) {
  if (prefs.type === "movie" && m.type === "Series") return false;
  if (prefs.type === "series" && m.type !== "Series") return false;
  return true;
}

function getSimilar(movie) {
  return CATALOG
    .filter((m) => m.title !== movie.title && m.genres.some((g) => movie.genres.includes(g)))
    .sort((a, b) => b.imdb - a.imdb)
    .slice(0, 3);
}

function Poster({ hue, title }) {
  return (
    <div
      style={{
        width: 64, height: 92, borderRadius: 10, flexShrink: 0,
        background: `linear-gradient(160deg, hsl(${hue},70%,72%), hsl(${hue},60%,56%))`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)",
      }}
      title={`Poster placeholder for ${title}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" opacity="0.65">
        <path d="M4 4h16v16H4V4z" stroke="#FFFFFF" strokeWidth="1.6" />
        <path d="M4 15l4-4 3 3 5-6 4 5" stroke="#FFFFFF" strokeWidth="1.6" />
      </svg>
    </div>
  );
}

function RatingBadges({ imdb, rt }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "-apple-system, sans-serif", fontSize: 11 }}>
        <span style={{ background: "#F5C518", color: "#2E2A33", fontWeight: 800, padding: "1px 5px", borderRadius: 4, fontSize: 10 }}>IMDb</span>
        <span style={{ color: "#6B6472", fontWeight: 600 }}>{imdb}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "-apple-system, sans-serif", fontSize: 11 }}>
        <span>{rt >= 60 ? "🍅" : "🟢"}</span>
        <span style={{ color: "#6B6472", fontWeight: 600 }}>{rt}%</span>
      </div>
    </div>
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
      <Poster hue={m.posterHue} title={m.title} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{m.title}</div>
        <div style={{ fontSize: 11, color: "#B5A896", fontWeight: 600, marginTop: 2 }}>{m.type} · {m.year} · ★ {m.imdb}</div>
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

export default function ScenePick() {
  const [view, setView] = useState("quiz");
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [watchlistSort, setWatchlistSort] = useState("added");
  const [similarOpenFor, setSimilarOpenFor] = useState(null);

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
      setLoaded(true);
    }
  }, []);

  const saveWatchlist = (next) => {
    setWatchlist(next);
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("Could not save watchlist", e);
    }
  };

  const isInWatchlist = (title) => watchlist.some((w) => w.title === title);
  const addToWatchlist = (movie) => { if (!isInWatchlist(movie.title)) saveWatchlist([...watchlist, { ...movie, myRating: 0, watched: false, addedAt: Date.now() }]); };
  const removeFromWatchlist = (title) => saveWatchlist(watchlist.filter((w) => w.title !== title));
  const setMyRating = (title, rating) => saveWatchlist(watchlist.map((w) => (w.title === title ? { ...w, myRating: rating } : w)));
  const toggleWatched = (title) => saveWatchlist(watchlist.map((w) => (w.title === title ? { ...w, watched: !w.watched } : w)));

  const sortedWatchlist = useMemo(() => {
    const list = [...watchlist];
    if (watchlistSort === "rating") return list.sort((a, b) => (b.myRating || 0) - (a.myRating || 0));
    if (watchlistSort === "year") return list.sort((a, b) => b.year - a.year);
    if (watchlistSort === "title") return list.sort((a, b) => a.title.localeCompare(b.title));
    return list.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  }, [watchlist, watchlistSort]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return CATALOG.filter((m) => m.title.toLowerCase().includes(q)).slice(0, 8);
  }, [searchQuery]);

  const toggleGenre = (g) => setPrefs((p) => ({ ...p, genres: p.genres.includes(g) ? p.genres.filter((x) => x !== g) : [...p.genres, g] }));
  const toggleMood = (m) => setPrefs((p) => ({ ...p, moods: p.moods.includes(m) ? p.moods.filter((x) => x !== m) : [...p.moods, m] }));
  const toggleSurprisable = (field, value) => setPrefs((p) => {
    const current = p[field];
    if (value === "surprise") return { ...p, [field]: current.includes("surprise") ? [] : ["surprise"] };
    const withoutSurprise = current.filter((x) => x !== "surprise");
    const has = withoutSurprise.includes(value);
    return { ...p, [field]: has ? withoutSurprise.filter((x) => x !== value) : [...withoutSurprise, value] };
  });

  const results = useMemo(() => {
    if (!showResults) return [];
    const eligible = CATALOG.filter((m) => passesHardFilters(m, prefs));
    const scored = eligible.map((m) => ({ ...m, score: scoreMovie(m, prefs) }));
    const withMatch = scored.filter((m) => m.score > 0);
    const pool = withMatch.length > 0 ? withMatch : scored;
    return pool.sort((a, b) => b.score - a.score || b.imdb - a.imdb).slice(0, 6);
  }, [showResults, prefs]);

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

  const goNext = () => { if (step < STEPS.length - 1) setStep(step + 1); else setShowResults(true); };
  const goBack = () => { if (showResults) { setShowResults(false); return; } if (step > 0) setStep(step - 1); };
  const restart = () => {
    setPrefs({ type: "either", genres: [], moods: [], pace: [], era: [], runtime: [], ending: [] });
    setStep(0); setShowResults(false);
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
        .tab-btn { border: none; background: transparent; padding: 10px 16px; border-radius: 12px; font-size: 13px; font-weight: 800; cursor: pointer; color: #B5A896; }
        .tab-btn.active { background: #2E2A33; color: #FFFFFF; }
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div style={{ fontSize: 13, letterSpacing: "0.08em", color: "#FF6B4A", fontWeight: 800, textTransform: "uppercase" }}>🎬 ScenePick</div>
          <div style={{ display: "flex", gap: 4, background: "#F1E6DA", padding: 4, borderRadius: 14 }}>
            <button className={`tab-btn ${view === "quiz" ? "active" : ""}`} onClick={() => setView("quiz")}>Discover</button>
            <button className={`tab-btn ${view === "search" ? "active" : ""}`} onClick={() => setView("search")}>Search</button>
            <button className={`tab-btn ${view === "watchlist" ? "active" : ""}`} onClick={() => setView("watchlist")}>
              My List{watchlist.length > 0 ? ` (${watchlist.length})` : ""}
            </button>
          </div>
        </div>

        {view === "quiz" && !showResults && (
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
              <p style={{ fontSize: 13, color: "#B5A896", margin: "0 0 20px", fontWeight: 600 }}>Pick one, mix a couple, or let us surprise you.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[{ id: "short", l: "Quick (~90 min)" }, { id: "standard", l: "Standard length" }, { id: "long", l: "Long, immersive" }, { id: "surprise", l: "🎲 Surprise me" }].map((o) => (
                  <Chip key={o.id} active={prefs.runtime.includes(o.id)} onClick={() => toggleSurprisable("runtime", o.id)}>{o.l}</Chip>
                ))}
              </div>
            </>)}

            {key === "ending" && (<>
              <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.15 }}>How should it end?</h1>
              <p style={{ fontSize: 13, color: "#B5A896", margin: "0 0 20px", fontWeight: 600 }}>Pick one, mix a couple, or let us surprise you.</p>
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

        {view === "search" && (
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 16px" }}>Search titles</h1>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type a movie or series title…"
              style={{ width: "100%", padding: "13px 16px", borderRadius: 14, border: "1.5px solid #EAD9C8", fontSize: 14, marginBottom: 20, fontFamily: "-apple-system, sans-serif" }}
            />
            {searchQuery.trim() && searchResults.length === 0 && (
              <p style={{ color: "#B5A896", fontWeight: 600 }}>No titles match "{searchQuery}".</p>
            )}
            {searchResults.map((m) => (
              <MiniCard key={m.title} m={m} isAdded={isInWatchlist(m.title)} onAdd={() => addToWatchlist(m)} />
            ))}
          </div>
        )}

        {view === "quiz" && showResults && (
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 20px" }}>Your picks 🍿</h1>
            {results.map((m) => (
              <div key={m.title} className="ticket">
                <Poster hue={m.posterHue} title={m.title} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>{m.title}</span>
                    <button
                      className={`small-btn ${isInWatchlist(m.title) ? "added" : ""}`}
                      onClick={() => isInWatchlist(m.title) ? removeFromWatchlist(m.title) : addToWatchlist(m)}
                    >
                      {isInWatchlist(m.title) ? "✓ Added" : "+ My List"}
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: "#B5A896", marginTop: 4, fontWeight: 600 }}>
                    {m.type} · {m.year} · {m.genres.join(", ")}
                  </div>
                  <RatingBadges imdb={m.imdb} rt={m.rt} />
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "#6B6472", marginTop: 8 }}>{m.blurb}</div>
                  <button
                    onClick={() => setSimilarOpenFor(similarOpenFor === m.title ? null : m.title)}
                    style={{ border: "none", background: "transparent", color: "#FF6B4A", fontWeight: 700, fontSize: 12, padding: 0, marginTop: 10, cursor: "pointer" }}
                  >
                    {similarOpenFor === m.title ? "Hide similar ▲" : "Similar titles ▼"}
                  </button>
                  {similarOpenFor === m.title && (
                    <div style={{ marginTop: 10 }}>
                      {getSimilar(m).map((s) => (
                        <MiniCard key={s.title} m={s} isAdded={isInWatchlist(s.title)} onAdd={() => addToWatchlist(s)} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <p style={{ fontSize: 11, color: "#B5A896", margin: "8px 0 28px", fontWeight: 600 }}>
              Posters shown are placeholders — real official posters load once we connect the live app to TMDB.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="nav-btn ghost" onClick={goBack}>Adjust answers</button>
              <button className="nav-btn primary" onClick={restart}>Start over</button>
            </div>
          </div>
        )}

        {view === "watchlist" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>My List</h1>
              {watchlist.length > 1 && (
                <select
                  value={watchlistSort}
                  onChange={(e) => setWatchlistSort(e.target.value)}
                  style={{ border: "1.5px solid #EAD9C8", borderRadius: 10, padding: "6px 10px", fontSize: 12, fontWeight: 700, color: "#6B6472", background: "#FFFFFF" }}
                >
                  <option value="added">Recently added</option>
                  <option value="rating">My rating</option>
                  <option value="year">Year</option>
                  <option value="title">Title A–Z</option>
                </select>
              )}
            </div>
            {!loaded && <p style={{ color: "#B5A896", fontWeight: 600 }}>Loading…</p>}
            {loaded && watchlist.length === 0 && (
              <p style={{ color: "#B5A896", fontWeight: 600, lineHeight: 1.6 }}>
                Nothing here yet. Go to "Discover", get some picks, and tap "+ My List" to save them here.
              </p>
            )}
            {sortedWatchlist.map((m) => (
              <div key={m.title} className="ticket" style={{ opacity: m.watched ? 0.6 : 1 }}>
                <Poster hue={m.posterHue} title={m.title} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>{m.title}{m.watched ? " ✓" : ""}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="small-btn" onClick={() => toggleWatched(m.title)}>{m.watched ? "Unwatch" : "Watched"}</button>
                      <button className="small-btn remove" onClick={() => removeFromWatchlist(m.title)}>Remove</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#B5A896", marginTop: 4, fontWeight: 600 }}>
                    {m.type} · {m.year} · {m.genres.join(", ")}
                  </div>
                  <RatingBadges imdb={m.imdb} rt={m.rt} />
                  <OverallRating value={m.myRating || 0} onChange={(v) => setMyRating(m.title, v)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
