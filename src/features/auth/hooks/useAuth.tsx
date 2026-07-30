import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../../../config/firebase";
import {
  getAuthUser,
  login as signIn,
  logout as signOut,
  type AuthUser,
} from "../services/authServices";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      void (async () => {
        if (!firebaseUser) {
          if (active) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        try {
          const profile = await getAuthUser(firebaseUser.uid);

          if (!profile || !profile.active) {
            await signOut();
            if (active) setUser(null);
            return;
          }

          if (active) setUser(profile);
        } catch {
          if (active) setUser(null);
        } finally {
          if (active) setLoading(false);
        }
      })();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ user, loading, login: signIn, logout: signOut }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
