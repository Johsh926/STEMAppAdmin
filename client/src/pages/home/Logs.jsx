import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import Table from "../../components/Table";
import Badge from "../../components/Badge";
import styles from "./Pages.module.css";

export default function Logs() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("all");

  useEffect(() => { fetchLogs(); }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const q = query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(200));
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filterRole === "all" ? logs : logs.filter(l => l.actorRole === filterRole);

  function roleBadgeColor(role) {
    if (role === "admin")   return "blue";
    if (role === "teacher") return "purple";
    return "gray";
  }

  function actionLabel(action) {
    const map = {
      create_question: "Created question",
      edit_question:   "Edited question",
      delete_question: "Deleted question",
      create_topic:    "Created topic",
      create_guide:    "Created guide",
      edit_guide:      "Updated guide",
      delete_guide:    "Deleted guide",
      deactivate_user: "Deactivated user",
      activate_user:   "Activated user",
      remove_user:     "Removed user",
      reset_password:  "Sent password reset",
      create_teacher:  "Created teacher account",
      create_admin:    "Created admin account",
    };
    return map[action] || action;
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Activity Logs</h2>
          <p className={styles.sectionSub}>Most recent 200 actions — admins only</p>
        </div>
        <button className={styles.rowBtn} onClick={fetchLogs}>Refresh</button>
      </div>

      <div className={styles.filterRow}>
        {["all", "admin", "teacher"].map(r => (
          <button
            key={r}
            onClick={() => setFilterRole(r)}
            className={`${styles.filterBtn} ${filterRole === r ? styles.filterBtnActive : ""}`}
          >
            {r.charAt(0).toUpperCase() + r.slice(1)}
            <span className={styles.filterCount}>
              {r === "all" ? logs.length : logs.filter(l => l.actorRole === r).length}
            </span>
          </button>
        ))}
      </div>

      <Table
        columns={["Time", "Actor", "Role", "Action", "Details"]}
        loading={loading}
        empty={filtered.length === 0}
        emptyText="No activity recorded yet."
      >
        {filtered.map(log => (
          <tr key={log.id}>
            <td className={styles.muted}>
              {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "—"}
            </td>
            <td>{log.actorEmail || "—"}</td>
            <td><Badge color={roleBadgeColor(log.actorRole)}>{log.actorRole || "—"}</Badge></td>
            <td>{actionLabel(log.action)}</td>
            <td className={styles.muted}>{log.details || "—"}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}