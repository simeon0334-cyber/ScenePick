// "Pick together" — two people each share their unwatched list under a short room code, and
// the app shows the titles both of them already have saved (falling back to a shared pool if
// there's no exact overlap yet). Built on the same Firestore project already used for comments,
// so no new backend is needed — just a new "groups" collection.
//
// Firestore shape:
//   groups/{code} = {
//     createdAt: serverTimestamp(),
//     members: {
//       [uid]: { nickname, list: [{tmdbId, type, title, year, posterPath}], joinedAt }
//     }
//   }
// A map keyed by uid (rather than an array) makes "update my entry" a single dot-path write
// that can't create duplicate/stale entries for the same person.

import { db, getUid } from "../firebase";
import { doc, setDoc, updateDoc, onSnapshot, getDoc, serverTimestamp } from "firebase/firestore";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easy to read aloud

function randomCode(len = 5) {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

function trimForShare(list) {
  return list.map((m) => ({
    tmdbId: m.tmdbId, type: m.type, title: m.title, year: m.year, posterPath: m.posterPath || null,
  }));
}

// Creates a fresh room, retrying on the rare code collision, and adds the caller as its first
// member. Returns the room code.
export async function createGroup({ nickname, list }) {
  const uid = getUid();
  if (!uid) throw new Error("Not signed in yet — try again in a moment.");
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const ref = doc(db, "groups", code);
    const existing = await getDoc(ref);
    if (existing.exists()) continue; // extremely unlikely, but don't clobber someone's room
    await setDoc(ref, {
      createdAt: serverTimestamp(),
      members: {
        [uid]: { nickname: nickname || "You", list: trimForShare(list), joinedAt: Date.now() },
      },
    });
    return code;
  }
  throw new Error("Couldn't create a room right now — please try again.");
}

export async function joinGroup({ code, nickname, list }) {
  const uid = getUid();
  if (!uid) throw new Error("Not signed in yet — try again in a moment.");
  const normalized = code.trim().toUpperCase();
  const ref = doc(db, "groups", normalized);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("No room with that code. Double-check it with your friend.");
  await updateDoc(ref, {
    [`members.${uid}`]: { nickname: nickname || "You", list: trimForShare(list), joinedAt: Date.now() },
  });
  return normalized;
}

// Keeps this member's shared list current as their real watchlist changes (e.g. they mark
// something watched, so it should drop out of contention for the group).
export async function updateMyGroupList({ code, list }) {
  const uid = getUid();
  if (!uid || !code) return;
  const ref = doc(db, "groups", code);
  try {
    await updateDoc(ref, { [`members.${uid}.list`]: trimForShare(list) });
  } catch (e) {
    // room may have been abandoned/deleted — non-fatal, group view will just show stale data
  }
}

export function subscribeGroup(code, callback) {
  const ref = doc(db, "groups", code);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback(snap.data());
  });
}

// Titles present on every member's list, ranked to the front; if nobody overlaps yet, falls
// back to everything anyone has saved so the room still has something to spin from.
export function computeGroupMatches(members) {
  const uids = Object.keys(members || {});
  if (uids.length === 0) return { matches: [], isOverlap: false };
  const lists = uids.map((uid) => members[uid].list || []);
  const counts = new Map();
  lists.forEach((list) => {
    const seenInThisList = new Set();
    list.forEach((item) => {
      const key = `${item.type}-${item.tmdbId}`;
      if (seenInThisList.has(key)) return;
      seenInThisList.add(key);
      const prev = counts.get(key);
      counts.set(key, prev ? { ...prev, count: prev.count + 1 } : { item, count: 1 });
    });
  });
  const all = Array.from(counts.values());
  const overlap = all.filter((c) => c.count === uids.length && uids.length > 1);
  if (overlap.length > 0) return { matches: overlap.map((c) => c.item), isOverlap: true };
  return { matches: all.map((c) => c.item), isOverlap: false };
}
