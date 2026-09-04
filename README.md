# ScenePick

A movie & TV show recommendation app. Built with React + Vite.

## What's here

- `src/App.jsx` — the whole app (preference wizard, discover, search, watchlist)
- `src/main.jsx` — entry point
- `index.html` — page shell

## Local development (optional)

If you ever install Node.js on your computer:

```
npm ci
npm run dev      # runs the app locally at http://localhost:5173
npm run build    # builds a production-ready version into /dist
```

## Status

- UI and preference logic: done, tested with sample data
- Live TMDB (movies/posters) + OMDb (IMDb/Rotten Tomatoes) integration: written and ready in an
  earlier version, to be wired back in once this project is deployed somewhere with normal
  internet access (not needed for local demo)
- Android builds are ready through GitHub Actions; a signed Google Play `.aab` is produced only
  from the manual release option described below.

## New features (from the market analysis)

- `src/lib/tmdbExtra.js` — watch providers ("📺 Where to watch") and the popular-movies pool used
  by the taste bootstrap.
- `src/lib/localData.js` — daily-open streak, and the genre-weight profile from "🎯 Rate a few
  movies" (feeds into `rerankScore` in `App.jsx` as a small ranking nudge).
- `src/lib/notifications.js` — daily local reminder via `@capacitor/local-notifications`. No-op
  in the browser; only actually schedules on a native Android build. Toggle lives at the top of
  the "My List" tab and only appears once the app detects it's running natively.
- `src/lib/group.js` — "👥 Pick together": create/join a short room code, each person's unwatched
  list syncs to Firestore (`groups/{code}`), and the app shows titles both people already saved
  (falling back to the combined pool if there's no overlap yet). Collapsed by default — tap
  "Open ▼" to expand.
- Spoiler-safe synopses (blurred for titles that premiered in the last 3 weeks), directly in
  `App.jsx`.
- "🚩 Report" button on every comment, required for Google Play's user-generated-content policy.
  Writes to a new `reports` Firestore collection (title/text/time only — reports themselves are
  never shown to other users). See the Firestore rules note below.

### One manual step: Firestore rules

The existing `comments` collection is presumably already allowed by your Firestore security
rules. Two newer collections need rules added in the Firebase console (Firestore → Rules):

```
match /groups/{code} {
  allow read, write: if request.auth != null;
}
match /reports/{reportId} {
  allow create: if request.auth != null;
  allow read, update, delete: if false; // only visible/manageable from the Firebase console
}
```

Without this, "Pick together" and the comment "🚩 Report" button will fail with a permissions
error even though the code itself is correct — Firestore rules live server-side, not in this repo.

### Android build

`npx cap sync android` has already been run against the new `@capacitor/local-notifications`
plugin, so the Android project is up to date. If you add/remove plugins later, re-run
`npx cap sync android` before building the APK.

### Google Play release

The **Build Android** GitHub Actions workflow creates a debug APK on each push. To create a
Google Play upload bundle, run the workflow manually, select `release`, and provide a new,
positive `version_code` (it must be higher than the version code already accepted by Google
Play) and a `version_name` such as `1.0.1`.

The repository must have these GitHub Actions secrets configured first:

- `SCENEPICK_KEYSTORE_BASE64`
- `SCENEPICK_KEYSTORE_PASSWORD`
- `SCENEPICK_KEY_ALIAS`
- `SCENEPICK_KEY_PASSWORD`

The workflow restores the keystore only in the temporary GitHub runner and uploads the signed
`.aab` as a private workflow artifact. Do not commit a keystore, Base64 value, or password to
the repository. The TMDB and OMDb keys should also remain GitHub Actions secrets; restrict those
keys to ScenePick's allowed app/API usage in their respective provider dashboards.
