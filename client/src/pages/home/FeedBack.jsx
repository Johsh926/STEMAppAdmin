import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../contexts/authContext";
import { logAction } from "../../firebase/logs";
import styles from "./FeedBack.module.css";

const FILTERS = ["All", "Pending", "In Progress", "Resolved"];

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function statusClass(status) {
  if (status === "Resolved") return styles.statusResolved;
  if (status === "In Progress") return styles.statusProgress;
  return styles.statusPending;
}

export default function Responses() {
  const { currentUser, userRole } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const responsesQuery = query(collection(db, "responses"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      responsesQuery,
      (snapshot) => {
        setItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setLoadError("");
        setLoading(false);
      },
      (error) => {
        console.error("Could not load responses:", error);
        setLoadError("Unable to load responses. Check your Firestore security rules and connection.");
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const counts = useMemo(() => ({
    All: items.length,
    Pending: items.filter((item) => (item.status || "Pending") === "Pending").length,
    "In Progress": items.filter((item) => item.status === "In Progress").length,
    Resolved: items.filter((item) => item.status === "Resolved").length,
  }), [items]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const status = item.status || "Pending";
      const matchesStatus = activeFilter === "All" || status === activeFilter;
      const searchable = [item.studentName, item.studentEmail, item.subject, item.message, item.reply]
        .filter(Boolean).join(" ").toLowerCase();
      return matchesStatus && (!term || searchable.includes(term));
    });
  }, [items, activeFilter, search]);

  const selected = items.find((item) => item.id === selectedId) || null;

  useEffect(() => {
    setReply(selected?.reply || "");
    setActionError("");
  }, [selectedId]);

  async function updateStatus(item, status) {
    setActionError("");
    setNotice("");
    try {
      await updateDoc(doc(db, "responses", item.id), {
        status,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid || "unknown",
      });
      await logAction({ uid: currentUser?.uid, email: currentUser?.email, role: userRole }, "update response status", `${item.id}: ${status}`);
      setNotice(`Marked as ${status.toLowerCase()}.`);
    } catch (error) {
      console.error("Could not update response status:", error);
      setActionError("Could not update the status. Check your Firestore security rules.");
    }
  }

  async function saveReply(event) {
    event.preventDefault();
    if (!selected) return;
    if (!reply.trim()) {
      setActionError("Please write a reply before saving.");
      return;
    }
    setSaving(true);
    setActionError("");
    setNotice("");
    try {
      await updateDoc(doc(db, "responses", selected.id), {
        reply: reply.trim(),
        repliedAt: serverTimestamp(),
        repliedBy: currentUser?.email || currentUser?.uid || "Staff",
        status: selected.status === "Resolved" ? "Resolved" : "In Progress",
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid || "unknown",
      });
      await logAction({ uid: currentUser?.uid, email: currentUser?.email, role: userRole }, "reply to response", `${selected.id}: ${selected.subject || "Student feedback"}`);
      setNotice("Reply saved successfully.");
    } catch (error) {
      console.error("Could not save reply:", error);
      setActionError("Could not save your reply. Check your Firestore security rules.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.headingRow} style={{ justifyContent: "flex-end" }}>
        <div className={styles.liveBadge}><span /> Live updates</div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}><div><span className={styles.statLabel}>Total messages</span><strong>{counts.All}</strong></div></div>
        <div className={styles.statCard}><div><span className={styles.statLabel}>Pending</span><strong>{counts.Pending}</strong></div></div>
        <div className={styles.statCard}><div><span className={styles.statLabel}>In progress</span><strong>{counts["In Progress"]}</strong></div></div>
        <div className={styles.statCard}><div><span className={styles.statLabel}>Resolved</span><strong>{counts.Resolved}</strong></div></div>
      </div>
      {notice && <div className={styles.successMessage} role="status">{notice}</div>}
      {actionError && <div className={styles.errorMessage} role="alert">{actionError}</div>}
      {loadError && <div className={styles.errorMessage} role="alert">{loadError}</div>}

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <div className={styles.filters} aria-label="Filter responses">
            {FILTERS.map((filter) => (
              <button key={filter} type="button" onClick={() => setActiveFilter(filter)} className={`${styles.filterButton} ${activeFilter === filter ? styles.filterActive : ""}`}>
                {filter}<span>{counts[filter]}</span>
              </button>
            ))}
          </div>
          <label className={styles.searchWrap}>
            <span aria-hidden="true">⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student or message..." aria-label="Search responses" />
          </label>
        </div>

        {loading ? <div className={styles.emptyState}>Loading student responses...</div> : filteredItems.length === 0 ? (
          <div className={styles.emptyState}><strong>No responses found</strong><p>Student feedback submitted to the “responses” collection will appear here.</p></div>
        ) : (
          <div className={styles.responseList}>
            {filteredItems.map((item) => (
              <article key={item.id} className={`${styles.responseCard} ${selectedId === item.id ? styles.responseSelected : ""}`}>
                <button className={styles.responseMain} type="button" onClick={() => setSelectedId(selectedId === item.id ? null : item.id)} aria-expanded={selectedId === item.id}>
                  <div className={styles.avatar}>{(item.studentName || item.studentEmail || "S").trim().charAt(0).toUpperCase()}</div>
                  <div className={styles.responseSummary}>
                    <div className={styles.nameLine}><strong>{item.studentName || "Student"}</strong><span className={`${styles.status} ${statusClass(item.status || "Pending")}`}>{item.status || "Pending"}</span></div>
                    <span className={styles.email}>{item.studentEmail || "No email provided"}</span>
                    <strong className={styles.subject}>{item.subject || "Student feedback"}</strong>
                    <p>{item.message || "No message content."}</p>
                    <span className={styles.date}>{formatDate(item.createdAt)}</span>
                  </div>
                  <span className={styles.chevron}>{selectedId === item.id ? "−" : "+"}</span>
                </button>
                {selectedId === item.id && (
                  <div className={styles.detailPanel}>
                    {item.reply && <div className={styles.previousReply}><strong>Previous reply</strong><p>{item.reply}</p><span>Replied by {item.repliedBy || "staff"}{item.repliedAt ? ` · ${formatDate(item.repliedAt)}` : ""}</span></div>}
                    <form onSubmit={saveReply} className={styles.replyForm}>
                      <label htmlFor={`reply-${item.id}`}>Reply to student</label>
                      <textarea id={`reply-${item.id}`} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a helpful response..." rows={4} maxLength={3000} />
                      <div className={styles.replyFooter}><span>{reply.length}/3000 characters</span><button type="submit" disabled={saving}>{saving ? "Saving..." : "Save reply"}</button></div>
                    </form>
                    <div className={styles.statusActions}>
                      <span>Update status:</span>
                      {FILTERS.filter((filter) => filter !== "All").map((status) => <button type="button" key={status} disabled={(item.status || "Pending") === status} onClick={() => updateStatus(item, status)}>{status}</button>)}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <p className={styles.footnote}>Only authorized admin and teacher accounts should have permission to read or reply to student feedback.</p>
    </div>
  );
}