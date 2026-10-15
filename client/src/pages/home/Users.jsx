import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../contexts/authContext";
import { logAction } from "../../firebase/logs";
import Table from "../../components/Table";
import Badge from "../../components/Badge";
import styles from "./Pages.module.css";

export default function Users() {
  const { currentUser, userRole } = useAuth();
  const actor = {
    uid: currentUser?.uid,
    email: currentUser?.email,
    role: userRole,
  };

  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAllUsers();
    // Fetch once when the page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAllUsers() {
    setLoading(true);

    try {
      const [usersSnap, teachersSnap, adminsSnap, usernamesSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "teacheraccounts")),
        getDocs(collection(db, "adminaccounts")),
        getDocs(collection(db, "usernames")),
      ]);

      const uidToUsername = {};
      usernamesSnap.docs.forEach((snapshot) => {
        const data = snapshot.data();
        if (data.uid) uidToUsername[data.uid] = snapshot.id;
      });

      const students = usersSnap.docs.map((snapshot) => {
        const data = snapshot.data();
        return {
          ...data,
          id: snapshot.id,
          col: "users",
          role: "Student",
          username: data.username || uidToUsername[snapshot.id] || "—",
        };
      });

      const teachers = teachersSnap.docs.map((snapshot) => ({
        ...snapshot.data(),
        id: snapshot.id,
        col: "teacheraccounts",
        role: "Teacher",
      }));

      const admins = adminsSnap.docs.map((snapshot) => ({
        ...snapshot.data(),
        id: snapshot.id,
        col: "adminaccounts",
        role: "Admin",
      }));

      setAllUsers([...students, ...teachers, ...admins]);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userId, userCol) {
    const confirmed = window.confirm(
      "Remove this user from the database?\\n\\n" +
        "IMPORTANT: You must also manually delete their account from " +
        "Firebase Console → Authentication → Users to fully remove access."
    );

    if (!confirmed) return;

    const target = allUsers.find((user) => user.id === userId && user.col === userCol);

    try {
      await deleteDoc(doc(db, userCol, userId));
      setAllUsers((previous) =>
        previous.filter((user) => !(user.id === userId && user.col === userCol))
      );
      logAction(
        actor,
        "remove_user",
        `Removed ${target?.role || userCol} "${target?.username || target?.email || userId}" from ${userCol}`
      );
    } catch (error) {
      console.error("Failed to remove user:", error);
      window.alert("Could not remove this user. Please check your permissions and try again.");
    }
  }

  async function handleToggleStatus(user) {
    const newStatus = user.status === "inactive" ? "active" : "inactive";

    try {
      await updateDoc(doc(db, user.col, user.id), { status: newStatus });
      setAllUsers((previous) =>
        previous.map((item) =>
          item.id === user.id && item.col === user.col
            ? { ...item, status: newStatus }
            : item
        )
      );
      logAction(
        actor,
        newStatus === "inactive" ? "deactivate_user" : "activate_user",
        `${newStatus === "inactive" ? "Deactivated" : "Activated"} ${user.role} "${user.username || user.email || user.id}"`
      );
    } catch (error) {
      console.error("Failed to update user status:", error);
      window.alert("Could not update this user's status. Please try again.");
    }
  }

  const counts = useMemo(() => ({
    all: allUsers.length,
    student: allUsers.filter((user) => user.role.toLowerCase() === "student").length,
    teacher: allUsers.filter((user) => user.role.toLowerCase() === "teacher").length,
    admin: allUsers.filter((user) => user.role.toLowerCase() === "admin").length,
  }), [allUsers]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allUsers.filter((user) => {
      const matchesRole =
        filter === "all" || user.role.toLowerCase() === filter;
      const email = user.email || user.admin_email || "";
      const matchesSearch =
        !normalizedSearch ||
        (user.username || "").toLowerCase().includes(normalizedSearch) ||
        email.toLowerCase().includes(normalizedSearch) ||
        user.role.toLowerCase().includes(normalizedSearch);

      return matchesRole && matchesSearch;
    });
  }, [allUsers, filter, search]);

  function roleBadgeColor(role) {
    if (role === "Teacher") return "purple";
    if (role === "Admin") return "blue";
    return "gray";
  }

  function statusBadgeColor(status) {
    if (status === "inactive") return "red";
    return "green";
  }

  return (
    <div className={styles.main}>
      <header className={styles.pageTitle}>
        <h2 className={styles.pageTitleText}>USERS</h2>
        <p className={styles.pageTitleSub}>
          Manage Student, Teacher, and Admin Accounts
        </p>
      </header>

      <div className={styles.searchRow} style={{ marginBottom: 18 }}>
        <input
          className={styles.searchBox}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="⌕  Search users..."
          aria-label="Search users by username, email, or role"
        />
      </div>

      <div className={styles.filterRow} style={{ marginBottom: 24 }}>
        {["all", "student", "teacher", "admin"].map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setFilter(role)}
            className={`${styles.filterBtn} ${filter === role ? styles.filterBtnActive : ""}`}
            aria-pressed={filter === role}
          >
            {role.charAt(0).toUpperCase() + role.slice(1)}
            <span className={styles.filterCount}>{counts[role]}</span>
          </button>
        ))}
      </div>

      <Table
        columns={["Username", "Email", "Role", "Status", "Joined", "Actions"]}
        loading={loading}
        empty={filtered.length === 0}
        emptyText={search.trim() ? "No users match your search." : "No users found."}
      >
        {filtered.map((user) => (
          <tr key={`${user.col}-${user.id}`}>
            <td>{user.username || "—"}</td>
            <td className={styles.muted}>{user.email || user.admin_email || "—"}</td>
            <td>
              <Badge color={roleBadgeColor(user.role)}>{user.role}</Badge>
            </td>
            <td>
              <Badge color={statusBadgeColor(user.status)}>
                {user.status || "active"}
              </Badge>
            </td>
            <td className={styles.muted}>
              {user.createdAt?.toDate
                ? user.createdAt.toDate().toLocaleDateString()
                : "—"}
            </td>
            <td className={styles.actions}>
              <button
                type="button"
                className={styles.rowBtn}
                onClick={() => handleToggleStatus(user)}
              >
                {user.status === "inactive" ? "Activate" : "Deactivate"}
              </button>
              <button
                type="button"
                className={`${styles.rowBtn} ${styles.rowBtnDanger}`}
                onClick={() => handleDelete(user.id, user.col)}
              >
                Remove
              </button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
