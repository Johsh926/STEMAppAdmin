import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import { doSignInWithEmailAndPassword, doSignOut } from "../../firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db, firebaseConfigured } from "../../firebase/firebase";
import styles from "./LoginPage.module.css";

const AdminLogin = () => {
  const [email, setEmail]               = useState(""); 
  const [password, setPassword]         = useState(""); 
  const [showPassword, setShowPassword] = useState(false); 
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [attempts, setAttempts]         = useState(0);
  const isLocked                        = attempts >= 5;
  const { userLoggedIn, userRole }      = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
  if (userLoggedIn && userRole) {  
    navigate("/home");
    }
  }, [userLoggedIn, userRole]);

  useEffect(() => {
    if (attempts >= 5) {
      const timer = setTimeout(() => {
        setAttempts(0);
        setError("");
      }, 30000); // 30 seconds
      return () => clearTimeout(timer);
    }
  }, [attempts]);

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("Please fill all fields."); return; }

    if (!firebaseConfigured || !db) {
      setError(
        "Firebase is not configured. Create client/.env from client/.env.example, then restart Vite."
      );
      return;
    }

    setLoading(true);

    try {
      const userCredential = await doSignInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      const adminSnap = await getDoc(doc(db, "adminaccounts", user.uid));
      if (adminSnap.exists()) {
        if (adminSnap.data().status === "inactive") {
          await doSignOut();
          setError("This account has been deactivated.");
          setLoading(false);
          return;
        }
        navigate("/home");
        return;
      }

      const teacherSnap = await getDoc(doc(db, "teacheraccounts", user.uid));
      if (teacherSnap.exists()) {
        if (teacherSnap.data().status === "inactive") {
          await doSignOut();
          setError("This account has been deactivated. Contact an admin.");
          setLoading(false);
          return;
        }
        navigate("/home");
        return;
      }

      await doSignOut();
      setError("Access denied. This account does not have portal access.");
      setLoading(false);

    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setError("Too many failed attempts. Please wait 30 seconds.");
        setLoading(false);
        return;
      }
      setError(getErrorMessage(err.code));
      setLoading(false);
    }
  };

  function getErrorMessage(code) {
    switch (code) {
      case "auth/invalid-credential":
        return "Invalid email or password. Please try again.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Try again later.";
      case "auth/network-request-failed":
        return "Network error. Check your connection.";
      default:
        return "Login failed. Please try again.";
    }
  }

  return (
    <div className={styles.container}>
      {/* Top Brand Bar */}
      <div className={styles.topBar}>
        <div className={styles.brand}>
          <span className={styles.brandTitle}>STEMAPP</span>
          <span className={styles.brandSubtitle}>CALCULUS</span>
        </div>
      </div>

      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.logoWrap}>
              <img src="/favicon.ico" alt="Logo" className={styles.logoImg} />
            </div>
            <h1 className={styles.title}>ADMIN PORTAL</h1>
          </div>

          <div className={styles.form}>
            {/* EMAIL FIELD */}
            <div className={styles.fieldGroup}>
              <div className={styles.inputWrap}>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* PASSWORD FIELD */}
            <div className={styles.fieldGroup}>
              <div className={styles.inputWrap}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${styles.input} ${styles.passwordInput}`}
                  autoComplete="current-password"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.eyeBtn}
                  aria-label="Toggle password visibility"
                  type="button"
                >
                  <i className={`ti ${showPassword ? "ti-eye-off" : "ti-eye"}`} />
                </button>
              </div>
            </div>

            {/* ERROR BOX */}
            {error && (
              <div className={styles.errorBox}>
                <i className="ti ti-alert-circle" aria-hidden="true" />
                {error}
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              onClick={handleSubmit}
              disabled={loading || isLocked}
              className={`${styles.submitBtn} ${loading ? styles.submitBtnLoading : ""}`}
              type="button"
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : (
                "Login to Dashboard"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;