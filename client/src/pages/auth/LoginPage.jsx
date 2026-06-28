import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import { doSignInWithEmailAndPassword, doSignOut } from "../../firebase/auth";

import { doc, getDoc } from "firebase/firestore";

import { db } from "../../firebase/firebase";
import styles from "./LoginPage.module.css";

const AdminLogin = () => {
  const [email, setEmail]               = useState(""); //for email
  const [password, setPassword]         = useState(""); //for password
  const [showPassword, setShowPassword] = useState(false); //show password
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [attempts, setAttempts]         = useState(0);
  const isLocked                        = attempts >= 5;

  const { userLoggedIn } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    if (userLoggedIn) {
      navigate("/home");
    }
  }, [userLoggedIn]);

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

    if (!email || !password) {
      setError("Please fill all fields.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await doSignInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      const adminRef = doc(db, "adminaccounts", user.uid);
      const adminSnap = await getDoc(adminRef);

      if (!adminSnap.exists()) {
        await doSignOut(); // imported below
        setError("Access denied. This account is not an admin.");
        setLoading(false);
        return;
      }
      navigate("/admin/dashboard");

    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setError("Too many failed attempts. Please wait before trying again.");
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
    <div className={styles.page}>
      <div className={styles.gridOverlay} />

      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.shieldWrap}>
            <i className="ti ti-shield-check" aria-hidden="true" />
          </div>
          <h1 className={styles.title}>Admin Portal</h1>
          <p className={styles.subtitle}>
            Restricted Access — Authorized Personnel Only
          </p>
        </div>

        <div className={styles.divider} />

        <div className={styles.form}>
          {/* EMAIL FIELD */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Administrator Email</label>
            <div className={styles.inputWrap}>
              <i className={`ti ti-mail ${styles.inputIcon}`} aria-hidden="true" />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                autoComplete="email"
              />
            </div>
          </div>

          {/* PASSWORD FIELD */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrap}>
              <i className={`ti ti-lock ${styles.inputIcon}`} aria-hidden="true" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="***********"
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
              <>
                <i className="ti ti-login-2" aria-hidden="true" />
                Sign In to Dashboard
              </>
            )}
          </button>
        </div>

        <p className={styles.footer}>
          All access attempts are logged and monitored.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;