import { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import Table from "../../components/Table";
import Badge from "../../components/Badge";
import Modal from "../../components/Modal";
import styles from "./pages.module.css";

export default function Users() {
  const [allUsers, setAllUsers]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => { fetchAllUsers(); }, []);

  async function fetchAllUsers() {
    setLoading(true);
    try {
      const [usersSnap, teachersSnap, adminsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "teacheraccounts")),
        getDocs(collection(db, "adminaccounts")),
      ]);
      setAllUsers([
        ...usersSnap.docs.map(d    => ({ id: d.id, col: "users",           role: "Student", ...d.data() })),
        ...teachersSnap.docs.map(d => ({ id: d.id, col: "teacheraccounts", role: "Teacher", ...d.data() })),
        ...adminsSnap.docs.map(d   => ({ id: d.id, col: "adminaccounts",   role: "Admin",   ...d.data() })),
      ]);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userId, userCol) {
    if (!window.confirm("Remove this user?")) return;
    try {
      await deleteDoc(doc(db, userCol, userId));
      setAllUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) { console.error(err); }
  }

  async function handleToggleStatus(user) {
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      await updateDoc(doc(db, user.col, user.id), { status: newStatus });
      setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    } catch (err) { console.error(err); }
  }

  async function handlePasswordReset(email) {
    if (!email) { alert("No email found for this user."); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      alert(`Password reset email sent to ${email}`);
    } catch (err) {
      console.error(err);
      alert("Failed to send reset email.");
    }
  }

  const filtered = filter === "all" ? allUsers : allUsers.filter(u => u.role.toLowerCase() === filter);

  function roleBadgeColor(role) {
    if (role === "Teacher") return "purple";
    if (role === "Admin")   return "blue";
    return "gray";
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.sectionTitle}>All Users</h2>
          <p className={styles.sectionSub}>{allUsers.length} total records</p>
        </div>
        <button className={styles.actionBtn} onClick={() => setShowAddModal(true)}>+ Add User</button>
      </div>

      <div className={styles.filterRow}>
        {["all", "student", "teacher", "admin"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ""}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={styles.filterCount}>
              {f === "all" ? allUsers.length : allUsers.filter(u => u.role.toLowerCase() === f).length}
            </span>
          </button>
        ))}
      </div>

      <Table
        columns={["Username", "Email", "Role", "Status", "Joined", "Actions"]}
        loading={loading}
        empty={filtered.length === 0}
        emptyText="No users found."
      >
        {filtered.map(u => (
          <tr key={u.id}>
            <td>{u.username || "—"}</td>
            <td className={styles.muted}>{u.email || u.admin_email || "—"}</td>
            <td><Badge color={roleBadgeColor(u.role)}>{u.role}</Badge></td>
            <td><Badge color={u.status === "inactive" ? "red" : "green"}>{u.status || "active"}</Badge></td>
            <td className={styles.muted}>{u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : "—"}</td>
            <td className={styles.actions}>
              <button className={styles.rowBtn} onClick={() => handleToggleStatus(u)}>
                {u.status === "inactive" ? "Activate" : "Deactivate"}
              </button>
              <button className={`${styles.rowBtn} ${styles.rowBtnDanger}`} onClick={() => handleDelete(u.id, u.col)}>
                Remove
              </button>
              <button className={styles.rowBtn} onClick={() => doPasswordReset(u.email || u.admin_email)}>
                Reset Password
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} onAdded={fetchAllUsers} />}
    </div>
  );
}

function AddUserModal({ onClose, onAdded }) {
  const [form, setForm]     = useState({ username: "", email: "", role: "Student", status: "active" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  function handleChange(e) { setForm(prev => ({ ...prev, [e.target.name]: e.target.value })); }

  async function handleSave() {
    if (!form.email || !form.username) { setError("Email and username are required."); return; }
    setSaving(true);
    try {
      const col = form.role === "Teacher" ? "teacheraccounts" : form.role === "Admin" ? "adminaccounts" : "users";
      await addDoc(collection(db, col), { ...form, createdAt: serverTimestamp() });
      onAdded(); onClose();
    } catch { setError("Failed to save."); setSaving(false); }
  }

  return (
    <Modal title="Add New User" onClose={onClose}>
      <div className={styles.modalFields}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Username</label>
          <input name="username" className={styles.input} value={form.username} onChange={handleChange} placeholder="e.g. juan_delacruz" />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Email</label>
          <input name="email" type="email" className={styles.input} value={form.email} onChange={handleChange} placeholder="e.g. juan@example.com" />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Role</label>
          <select name="role" className={styles.input} value={form.role} onChange={handleChange}>
            <option>Student</option>
            <option>Teacher</option>
            <option>Admin</option>
          </select>
        </div>
      </div>
      {error && <p className={styles.modalError}>{error}</p>}
      <div className={styles.modalActions}>
        <button className={styles.rowBtn} onClick={onClose}>Cancel</button>
        <button className={styles.actionBtn} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save User"}</button>
      </div>
    </Modal>
  );
}