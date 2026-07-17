import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, browserLocalPersistence, getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBqgmzrNelS701uQ1ngLvcoatUkcBuiRic",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0681082317.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://gen-lang-client-0681082317-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0681082317",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0681082317.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "834918791822",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:834918791822:web:ef4b1dc9724967ab64a7df",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-4JWYMJ8NCZ"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: [browserLocalPersistence]
  });
} catch (e) {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();
