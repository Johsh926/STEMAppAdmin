import { useState } from "react";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, firebaseConfig } from "../../firebase/firebase";
import Modal from "../../components/Modal";
import styles from "./Pages.module.css";

export default function Accounts() {
  const [activeSection, setActiveSection] = useState("teacher");
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showAdminModal, setShowAdminModal]     = useState(false);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Account Management</h2>
          <p className={styles.sectionSub}>Create teacher and admin accounts</p>
        </div>
      </div>

      <div className={styles.filterRow}>
        <button
          className={`${styles.filterBtn} ${activeSection === "teacher" ? styles.filterBtnActive : ""}`}
          onClick={() => setActiveSection("teacher")}
        >
          🎓 Teacher Accounts
        </button>
        <button
          className={`${styles.filterBtn} ${activeSection === "admin" ? styles.filterBtnActive : ""}`}
          onClick={() => setActiveSection("admin")}
        >
          🛡️ Admin Accounts
        </button>
      </div>

      {activeSection === "teacher" && (
        <div className={styles.accountSection}>
          <div className={styles.accountCard}>
            <div className={styles.accountCardIcon}>🎓</div>
            <h3 className={styles.accountCardTitle}>Create Teacher Account</h3>
            <p className={styles.accountCardDesc}>
              Creates a Firebase Auth account and saves it to the teacheraccounts collection.
              Teachers can log in to the teacher portal with these credentials.
            </p>
            <button
              className={styles.actionBtn}
              onClick={() => setShowTeacherModal(true)}
            >
              + Create Teacher
            </button>
          </div>
        </div>
      )}

      {activeSection === "admin" && (
        <div className={styles.accountSection}>
          <div className={styles.accountCard}>
            <div className={styles.accountCardIcon}>🛡️</div>
            <h3 className={styles.accountCardTitle}>Create Admin Account</h3>
            <p className={styles.accountCardDesc}>
              Creates a Firebase Auth account and saves it to the adminaccounts collection.
              Admins can log in to this portal with these credentials.
            </p>
            <button
              className={styles.actionBtn}
              onClick={() => setShowAdminModal(true)}
            >
              + Create Admin
            </button>
          </div>
        </div>
      )}

      {showTeacherModal && (
        <CreateAccountModal
          type="teacher"
          onClose={() => setShowTeacherModal(false)}
        />
      )}

      {showAdminModal && (
        <CreateAccountModal
          type="admin"
          onClose={() => setShowAdminModal(false)}
        />
      )}
    </div>
  );
}

function CreateAccountModal({ type, onClose }) {
  const isTeacher = type === "teacher";

  // adminPassword field is gone — nothing to sign back into anymore
  const [form, setForm] = useState({
    email:    "",
    password: "",
    username: "",
  });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSave() {
    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }
    if (isTeacher && !form.username) {
      setError("Username is required for teacher accounts.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const snapshot = {
      email:    form.email,
      username: form.username,
      password: form.password,
    };
    console.log("Creating account with:", snapshot);

    // Spin up a throwaway Firebase app so the new user's sign-in never
    // touches the primary `auth` instance — the admin's real session
    // on `auth` (from firebase.js) stays completely untouched.
    const tempApp  = initializeApp(firebaseConfig, `temp-${Date.now()}`);
    const tempAuth = getAuth(tempApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        tempAuth, snapshot.email, snapshot.password
      );
      const newUser = userCredential.user;

      if (isTeacher && (!snapshot.email || !snapshot.username || !newUser.uid)) {
        throw new Error(
          `Refusing empty teacher write — email="${snapshot.email}" username="${snapshot.username}" uid="${newUser.uid}"`
        );
      }
      if (!isTeacher && (!snapshot.email || !newUser.uid)) {
        throw new Error(
          `Refusing empty admin write — email="${snapshot.email}" uid="${newUser.uid}"`
        );
      }

      // This write runs under YOUR admin session on the primary `auth`
      // instance, since it was never switched — isAdmin() sees you.
      if (isTeacher) {
        await setDoc(doc(db, "teacheraccounts", newUser.uid), {
          uid: newUser.uid, email: snapshot.email, username: snapshot.username,
          status: "active", createdAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, "adminaccounts", newUser.uid), {
          uid: newUser.uid, admin_email: snapshot.email,
          role: "admin", createdAt: serverTimestamp(),
        });
      }

      setSuccess(`${isTeacher ? "Teacher" : "Admin"} account created successfully!`);
      setForm({ email: "", password: "", username: "" });

    } catch (err) {
      console.error("Account creation failed:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else if (err.message?.startsWith("Refusing empty")) {
        setError("Internal error — form was empty. Check the console for details.");
      } else {
        setError("Failed to create account. Try again.");
      }
    } finally {
      await deleteApp(tempApp); // clean up the temporary instance either way
      setSaving(false);
    }
  }

  return (
    <Modal title={isTeacher ? "Create Teacher Account" : "Create Admin Account"} onClose={onClose}>
      <div className={styles.modalFields}>

        {isTeacher && (
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Username</label>
            <input
              name="username"
              className={styles.input}
              value={form.username}
              onChange={handleChange}
              placeholder="e.g. teacher_juan"
            />
          </div>
        )}

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Email</label>
          <input
            name="email"
            type="email"
            className={styles.input}
            value={form.email}
            onChange={handleChange}
            placeholder="e.g. teacher@school.com"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Password</label>
          <input
            name="password"
            type="password"
            className={styles.input}
            value={form.password}
            onChange={handleChange}
            placeholder="Min. 6 characters"
          />
        </div>

        {/* adminPassword field removed — nothing to restore anymore */}

      </div>

      {error   && <p className={styles.modalError}>{error}</p>}
      {success && <p className={styles.modalSuccess}>{success}</p>}

      <div className={styles.modalActions}>
        <button className={styles.rowBtn} onClick={onClose}>Close</button>
        <button className={styles.actionBtn} onClick={handleSave} disabled={saving}>
          {saving ? "Creating..." : `Create ${isTeacher ? "Teacher" : "Admin"}`}
        </button>
      </div>
    </Modal>
  );
}