import { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import { setApiToken, loadTokenFromStorage } from "../services/api";

const AuthContext = createContext(null);

const storeToken = async (token) => {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.localStorage.setItem("token", token);
    } else {
      const AS = require("@react-native-async-storage/async-storage").default;
      await AS.setItem("token", token);
    }
  } catch {}
};

const removeToken = async () => {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.localStorage.removeItem("token");
    } else {
      const AS = require("@react-native-async-storage/async-storage").default;
      await AS.removeItem("token");
    }
  } catch {}
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Load token from storage and inject into axios on app start
    const initAuth = async () => {
      try {
        const t = await loadTokenFromStorage();
        if (isMounted && t) { 
          setToken(t); 
          setApiToken(t); 
        }
      } catch (err) {
        console.error("Failed to load token:", err);
      }
    };

    initAuth();

    // Only set up Firebase listener if auth is available
    if (!auth) {
      console.warn("Firebase auth not initialized, skipping auth listener");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (isMounted) {
        setUser(firebaseUser);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const saveToken = async (t) => {
    setToken(t);
    setApiToken(t);          // inject into axios immediately
    await storeToken(t);     // persist to storage
  };

  const clearToken = async () => {
    setToken(null);
    setApiToken(null);       // remove from axios
    await removeToken();     // remove from storage
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, saveToken, clearToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
