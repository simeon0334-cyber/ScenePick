# ScenePick

A movie & TV show recommendation app. Built with React + Vite.

## What's here

- `src/App.jsx` — the whole app (preference wizard, discover, search, watchlist)
- `src/main.jsx` — entry point
- `index.html` — page shell

## Local development (optional)

If you ever install Node.js on your computer:

```
npm install
npm run dev      # runs the app locally at http://localhost:5173
npm run build    # builds a production-ready version into /dist
```

Status

* UI and preference logic: done, tested
* TMDB integration (posters, ratings, watch providers, similar titles): live and wired in
* Android build pipeline (Capacitor + GitHub Actions signed release build): set up and working
* Next planned step: add an in-app "report" option for comments (needed before Google Play submission), then submit to Google Play

## New features (from the market analysis)

- `src/lib/tmdbExtra.js` — watch providers ("📺 Where to watch"), season/episode details, and
  the popular-movies pool used by the taste bootstrap.
- `src/lib/localData.js` — daily-open streak, and the genre-weight profile from "🎯 Rate a few
  movies" (feeds into `rerankScore` in `App.jsx` as a small ranking nudge).
- `src/lib/notifications.js` — daily local reminder via `@capacitor/local-notifications`. No-op
  in the browser; only actually schedules on a native Android build. Toggle lives at the top of
  the "My List" tab and only appears once the app detects it's running natively.
- `src/lib/group.js` — "👥 Pick together": create/join a short room code, each person's unwatched
  list syncs to Firestore (`groups/{code}`), and the app shows titles both people already saved
  (falling back to the combined pool if there's no overlap yet).
- Episode-level tracking (season/episode counter per series, using TMDB's season endpoint to
  roll over automatically) and spoiler-safe synopses (blurred for titles that premiered in the
  last 3 weeks) both live directly in `App.jsx`.

### One manual step: Firestore rules

The existing `comments` collection is presumably already allowed by your Firestore security
rules. The new `groups` collection needs the same kind of open read/write rule added in the
Firebase console (Firestore → Rules) — something like:

```
match /groups/{code} {
  allow read, write: if request.auth != null;
}
```

Without this, "Pick together" will fail with a permissions error even though the code itself is
correct — Firestore rules live server-side, not in this repo.

### Android build

`npx cap sync android` has already been run against the new `@capacitor/local-notifications`
plugin, so the Android project is up to date. If you add/remove plugins later, re-run
`npx cap sync android` before building the APK.
