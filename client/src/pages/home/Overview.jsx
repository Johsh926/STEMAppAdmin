import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import StatCard from "../../components/StatCard";
import styles from "./Pages.module.css";

export default function Overview(){
  const [stats, setStats] = useState({ users: null, teachers: null, admins: null, questions: null});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try{
        const [usersSnap, teacherSnap, adminsSnap, questionsSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "teachersaccounts")),
          getDocs(collection(db, "adminaccounts")),
          getDocs(collection(db, "questions")),
        ]);
        setStats({
          users:  usersSnap.size,
          teachers: teachersSnap.size,
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

  if (loading) return <p className={styles.loadingText}>Loading Stats...</p>;

  return(
    <div className={styles.page}>
      <div className={styles.statsGrid}>
        <StatCard icon="👥" value={stats.users} label="Students" />
        <StatCard icon="🎓" value={stats.teachers} label="Teachers" />
        <StatCard icon="🛡️" value={stats.admins} label="Admins" />
        <StatCard icon="📋" value={stats.questions} label="Questions" />
      </div>
    </div>
  );
}