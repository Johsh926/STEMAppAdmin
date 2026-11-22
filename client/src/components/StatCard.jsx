import styles from "./Shared.module.css";

export default function StatCard({ icon, value, label, labelColor }){
  return(
    <div className={styles.statCard}>
      <span className={styles.statIcon}>{icon}</span>
      <div>
        <p className={styles.statValue}>{value ?? "-"}</p>
        <p className={styles.statLabel} style={labelColor ? { color: labelColor } : undefined}>{label}</p>
      </div>
    </div>
  );
}