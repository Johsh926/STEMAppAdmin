import { useState, useEffect, createContext, useContext } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, firebaseConfigured } from "../../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

export const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [accountSwitching, setAccountSwitching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase is optional at startup so the UI can still render and show
    // a useful setup message when client/.env is missing.
    if (!firebaseConfigured || !auth || !db) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, initializeUser);
    return unsubscribe;
  }, []);

  async function initializeUser(user) {
    if (user) {
      setCurrentUser({ ...user });
      setUserLoggedIn(true);

      try {
        const adminSnap = await getDoc(doc(db, "adminaccounts", user.uid));
        if (adminSnap.exists() && adminSnap.data().status !== "inactive") {
          setUserRole("admin");
        } else {
          const teacherSnap = await getDoc(doc(db, "teacheraccounts", user.uid));
          if (teacherSnap.exists() && teacherSnap.data().status !== "inactive") {
            setUserRole("teacher");
          } else {
            setUserRole(null);
          }
        }
      } catch (err) {
        console.error("Failed to determine role:", err);
        setUserRole(null);
      }
    } else {
      setCurrentUser(null);
      setUserLoggedIn(false);
      setUserRole(null);
    }
    setLoading(false);
  }

  const value = {
    currentUser,
    userLoggedIn,
    userRole,
    loading,
    accountSwitching,
    setAccountSwitching,
    firebaseConfigured,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
