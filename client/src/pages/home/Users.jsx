import { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../firebase/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from "../../contexts/authContext";
import { logAction } from "../../firebase/logs";
import Table from "../../components/Table";
import Badge from "../../components/Badge";
import styles from "./Pages.module.css";



function getJoinedDate(user) {
  const candidates = [user.createdAt, user.created_at, user.joinedAt, user.dateJoined, user.registeredAt, user.timestamp];
  for (const value of candidates) {
    let date = null;
    if (value?.toDate) date = value.toDate(); // Firestore Timestamp
    else if (value instanceof Date) date = value;
    else if (typeof value === "number") date = new Date(value);
    else if (typeof value === "string" && value.trim()) date = new Date(value);
    if (date && !Number.isNaN(date.getTime())) return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return "—"; // Don't invent a date when the database has no join/creation timestamp.
}

export default function Users() {
  const { currentUser, userRole } = useAuth();
  const actor = { uid: currentUser?.uid, email: currentUser?.email, role: userRole };

  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [busyUserKey, setBusyUserKey] = useState(null);

  useEffect(() => { fetchAllUsers(); }, []);

  async function fetchAllUsers() {
    setLoading(true);
    try {
      const [usersSnap, teachersSnap, adminsSnap, usernamesSnap, leaderboardSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "teacheraccounts")),
        getDocs(collection(db, "adminaccounts")),
        getDocs(collection(db, "usernames")),
        getDocs(collection(db, "leaderboard")),
      ]);

      const uidToUsername = {};
      usernamesSnap.docs.forEach(d => {
        const data = d.data();
        if (data.uid) uidToUsername[data.uid] = d.id;
      });

      const uidToHighestLevel = {};
      leaderboardSnap.docs.forEach(d => {
        const data = d.data();
        if (data.uid) uidToHighestLevel[data.uid] = data.HighestLevel ?? 0;
      });

      const combinedUsers = [
        ...usersSnap.docs.map(d => ({
          id: d.id, col: "users", role: "Student",
          ...d.data(),
          username: uidToUsername[d.id] || "—",
          highestLevel: uidToHighestLevel[d.id] ?? 0,
        })),
        ...teachersSnap.docs.map(d => ({ id: d.id, col: "teacheraccounts", role: "Teacher", ...d.data() })),
        ...adminsSnap.docs.map(d => ({ id: d.id, col: "adminaccounts", role: "Admin", ...d.data() })),
      ];

      const uniqueUsers = Array.from(new Map(combinedUsers.filter(u => u.email || u.admin_email).map(item => [item.email || item.admin_email, item])).values());
      setAllUsers(uniqueUsers);

    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userId, userCol) {
    if (!window.confirm(
      "Remove this user from the database?\n\n" +
      "IMPORTANT: You must also manually delete their account from " +
      "Firebase Console → Authentication → Users to fully remove access."
    )) return;
    const target = allUsers.find(u => u.id === userId);
    try {
      await deleteDoc(doc(db, userCol, userId));
      setAllUsers(prev => prev.filter(u => u.id !== userId));
      logAction(actor, "remove_user",
        `Removed ${target?.role || userCol} "${target?.username || target?.email || userId}" from ${userCol}`);
    } catch (err) {
      console.error(err);
      alert("Could not remove this user. Check your Firestore permissions and try again.");
    }
  }

  async function handleToggleStatus(user) {
    const currentStatus = (user.status || "active").toLowerCase();
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const key = `${user.col}/${user.id}`;
    setBusyUserKey(key);
    try {
      await updateDoc(doc(db, user.col, user.id), { status: newStatus });
      setAllUsers(prev => prev.map(u => u.col === user.col && u.id === user.id ? { ...u, status: newStatus } : u));
      logAction(actor, newStatus === "inactive" ? "deactivate_user" : "activate_user",
        `${newStatus === "inactive" ? "Deactivated" : "Activated"} ${user.role} "${user.username || user.email}"`);
    } catch (err) {
      console.error("Status update failed:", err);
      alert("Could not update user status. Check your Firestore permissions and try again.");
    } finally {
      setBusyUserKey(null);
    }
  }

  const filtered = allUsers.filter(u => {
    const matchesFilter = filter === "all" || u.role.toLowerCase() === filter;
    const matchesSearch = (u.username || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || u.admin_email || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  function roleBadgeColor(role) {
    if (role === "Teacher") return "purple";
    if (role === "Admin") return "blue";
    return "yellow"; // Student: warm gold/yellow badge
  }

  return (
    <div className={styles.page}>
      <div className={styles.filterRow} style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
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
        <div className={styles.searchRow} style={{ width: "auto" }}>
          <input
            type="text"
            className={styles.searchBox}
            placeholder="Search Users"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Table
        columns={["Username", "Email", "Role", "Highest Level", "Status", "Joined", "Actions"]}
        loading={loading}
        empty={filtered.length === 0}
        emptyText="No users found."
      >
        {filtered.map(u => (
          <tr key={u.id}>
            <td>{u.username || "—"}</td>
            <td className={styles.muted}>{u.email || u.admin_email || "—"}</td>
            <td>
              <Badge color={roleBadgeColor(u.role)}>{u.role.charAt(0).toUpperCase() + u.role.slice(1)}</Badge>
            </td>
            <td>{u.highestLevel || "—"}</td>
            <td>
              <Badge color={u.status === "inactive" ? "red" : "green"}>
                {u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : "Active"}
              </Badge>
            </td>
            <td className={styles.muted} style={{ textAlign: "center", whiteSpace: "nowrap" }}>
              {getJoinedDate(u)}
            </td>
            <td className={styles.actionsCell}>
              <div className={styles.actions}>
                {(u.status || "active").toLowerCase() === "inactive" ? (
                  <button type="button" className={`${styles.rowBtn} ${styles.rowBtnActivate}`} disabled={busyUserKey === `${u.col}/${u.id}`} onClick={() => handleToggleStatus(u)}>
                    {busyUserKey === `${u.col}/${u.id}` ? "Saving..." : "Activate"}
                  </button>
                ) : (
                  <button type="button" className={`${styles.rowBtn} ${styles.rowBtnDeactivate}`} disabled={busyUserKey === `${u.col}/${u.id}`} onClick={() => handleToggleStatus(u)}>
                    {busyUserKey === `${u.col}/${u.id}` ? "Saving..." : "Deactivate"}
                  </button>
                )}
                <button type="button" className={`${styles.rowBtn} ${styles.rowBtnDanger}`} onClick={() => handleDelete(u.id, u.col)}>
                  Remove
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}