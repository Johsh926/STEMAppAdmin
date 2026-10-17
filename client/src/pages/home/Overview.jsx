import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import StatCard from "../../components/StatCard";
import styles from "./Pages.module.css";

export default function Overview(){
  const [stats, setStats] = useState({ users: null, teachers: null, admins: null, questions: null});
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    async function fetchStats() {
      try{
        const [usersSnap, teacherSnap, adminsSnap, questionsSnap, logsSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "teacheraccounts")),
          getDocs(collection(db, "adminaccounts")),
          getDocs(collection(db, "questions")),
          getDocs(query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(8))),
        ]);
        setRecentActivity(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setStats({
          users:  usersSnap.size,
          teachers: teacherSnap.size,
          admins: adminsSnap.size,
          questions: questionsSnap.size,
        });
      } catch (err) {
        console.error("Failed to fetch stats:" , err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <div className={styles.page}><p className={styles.loadingText}>Loading overview...</p></div>;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h2 className={styles.sectionTitle}>OVERVIEW</h2>
          <p className={styles.sectionSub}>Monitor your StemApp platform</p>
        </div>
      </header>
      <div className={styles.statsGrid}>
        <StatCard icon="👥" value={stats.users} label="Students" />
        <StatCard icon="🎓" value={stats.teachers} label="Teachers" />
        <StatCard icon="🛡️" value={stats.admins} label="Admins" />
        <StatCard icon="📋" value={stats.questions} label="Questions" />
      </div>
      <section className={styles.recentActivity}>
        <h3 className={styles.recentActivityTitle}>RECENT ACTIVITY</h3>
        <div className={styles.recentActivityPanel}>
          {recentActivity.length === 0 ? (
            <p className={styles.recentActivityEmpty}>No recent activity to display.</p>
          ) : recentActivity.map(item => (
            <div className={styles.activityItem} key={item.id}>
              <span className={styles.activityAction}>{String(item.action || "Activity").replaceAll("_", " ")}</span>
              <span className={styles.activityDetails}>{item.details || item.actorEmail || "—"}</span>
              <span className={styles.activityTime}>{item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : ""}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}