import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase web config is safe to embed directly in client code — it's not a secret.
// Actual protection comes from Firestore Security Rules (configured in the Firebase console).
const firebaseConfig = {
  apiKey: "AIzaSyBoCeqSxGnW8rUI41cwh8Kl6uSWrVccAV4",
  authDomain: "scenepick-dab28.firebaseapp.com",
  projectId: "scenepick-dab28",
  storageBucket: "scenepick-dab28.firebasestorage.app",
  messagingSenderId: "110279808779",
  appId: "1:110279808779:web:bd74088f4de2a35c78b40e",
  measurementId: "G-4Q5D0T6CKD",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let currentUid = null;
const uidListeners = [];

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUid = user.uid;
    uidListeners.forEach((cb) => cb(user.uid));
  }
});

signInAnonymously(auth).catch((e) => console.error("Anonymous sign-in failed", e));

export function getUid() {
  return currentUid;
}

export function onUid(callback) {
  if (currentUid) callback(currentUid);
  uidListeners.push(callback);
}
