import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updateProfile, type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { createUserProfile, getUserProfile } from "../lib/firestore";
import type { User } from "../types";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isReseller: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (firebaseUser) {
      const profile = await getUserProfile(firebaseUser.uid);
      setUserProfile(profile);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (!profile) {
          await createUserProfile(user.uid, {
            displayName: user.displayName || user.email?.split("@")[0] || "User",
            email: user.email || "",
            role: "user",
            totalTransactions: 0,
          });
          const newProfile = await getUserProfile(user.uid);
          setUserProfile(newProfile);
        } else {
          setUserProfile(profile);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await createUserProfile(cred.user.uid, {
      displayName: name,
      email,
      role: "user",
      totalTransactions: 0,
    });
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isAdmin = userProfile?.role === "admin";
  const isReseller = userProfile?.role === "reseller" || userProfile?.role === "admin";

  return (
    <AuthContext.Provider value={{
      firebaseUser, userProfile, loading,
      login, register, logout, refreshProfile,
      isAdmin, isReseller,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
