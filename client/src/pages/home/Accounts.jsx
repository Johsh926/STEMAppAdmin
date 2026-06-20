import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase/firebase";
import { useAuth } from "../../contexts/authContext";
import Modal from "../../components/Modal";
import styles from "./pages.module.css";

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
  const { currentUser } = useAuth();
  const isTeacher = type === "teacher";

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

    const adminEmail    = currentUser.email;
    const adminPassword = form.adminPassword;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const newUser = userCredential.user;
      if (isTeacher) {
        await setDoc(doc(db, "teacheraccounts", newUser.uid), {
          uid:       newUser.uid,
          email:     form.email,
          username:  form.username,
          status:    "active",
          createdAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, "adminaccounts", newUser.uid), {
          uid:        newUser.uid,
          admin_email: form.email,
          role:       "admin",
          createdAt:  serverTimestamp(),
        });
      }
      await signInWithEmailAndPassword(auth, adminEmail, form.adminPassword);

      setSuccess(`${isTeacher ? "Teacher" : "Admin"} account created successfully!`);
      setForm({ email: "", password: "", username: "", adminPassword: "" });

    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Wrong admin password. Could not restore admin session.");
      } else {
        setError("Failed to create account. Try again.");
      }
    } finally {
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

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Your Admin Password</label>
          <p className={styles.fieldHint}>
            Required to restore your admin session after creating the account.
          </p>
          <input
            name="adminPassword"
            type="password"
            className={styles.input}
            value={form.adminPassword || ""}
            onChange={handleChange}
            placeholder="Your current admin password"
          />
        </div>

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