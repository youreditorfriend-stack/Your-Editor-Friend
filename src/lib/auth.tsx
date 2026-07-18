import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  User,
} from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";

export interface SiteUser {
  uid: string;
  name: string;
  email: string;
  photo: string;
  createdAt?: any;
  lastLogin?: any;
  // ids of products/courses this user owns (granted after purchase)
  purchases: string[];
  // ISO timestamp of the first verified paid purchase — written only by
  // api/verify-payment (Admin SDK); starts the 5-minute 25%-off window.
  firstPurchaseAt?: string;
}

interface AuthContextValue {
  user: User | null;
  profile: SiteUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SiteUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // Upsert profile so every logged-in user shows up in the admin list
        try {
          await setDoc(
            doc(db, "users", u.uid),
            {
              uid: u.uid,
              name: u.displayName || "",
              email: u.email || "",
              photo: u.photoURL || "",
              lastLogin: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (e) {
          console.error("Failed to upsert user profile:", e);
        }
      } else {
        setProfile(null);
      }
    });
    return unsub;
  }, []);

  // Live subscription to own profile (purchases update instantly when admin grants access)
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setProfile({
          uid: user.uid,
          name: d.name || "",
          email: d.email || "",
          photo: d.photo || "",
          createdAt: d.createdAt,
          lastLogin: d.lastLogin,
          purchases: d.purchases || [],
          firstPurchaseAt: d.firstPurchaseAt || undefined,
        });
      }
    });
    return unsub;
  }, [user]);

  // Finish a redirect-based sign-in when the browser lands back on the site.
  useEffect(() => {
    getRedirectResult(auth).catch((e) => {
      console.error("Redirect sign-in failed:", e);
    });
  }, []);

  const signIn = async () => {
    // Popup is nicer on desktop, but many mobile browsers block it. Try the
    // popup first and fall back to a full-page redirect when it can't open.
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      const code = e?.code || "";
      const popupFailed =
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/argument-error";
      if (popupFailed) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw e;
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
