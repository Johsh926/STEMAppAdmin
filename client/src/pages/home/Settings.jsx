import styles from "./Pages.module.css";

export default function Settings() {
  return (
    <div className={styles.page}>
      <div className={styles.settingsGrid}>
        <div className={styles.settingCard}>
          <p className={styles.settingTitle}>Site Name</p>
          <p className={styles.settingDesc}>Update the application display name</p>
          <input className={styles.input} defaultValue="STEM App" />
        </div>
        <div className={styles.settingCard}>
          <p className={styles.settingTitle}>Maintenance Mode</p>
          <p className={styles.settingDesc}>Temporarily disable access for non-admins</p>
          <label className={styles.toggle}>
            <input type="checkbox" />
            <span className={styles.toggleSlider} />
          </label>
        </div>
        <div className={styles.settingCard}>
          <p className={styles.settingTitle}>Max Questions Per Quiz</p>
          <p className={styles.settingDesc}>Set the maximum number of questions per quiz</p>
          <input className={styles.input} type="number" defaultValue="10" />
        </div>
        <div className={styles.settingCard}>
          <p className={styles.settingTitle}>Allow Registration</p>
          <p className={styles.settingDesc}>Allow users to create their own accounts</p>
          <label className={styles.toggle}>
            <input type="checkbox" defaultChecked />
            <span className={styles.toggleSlider} />
          </label>
        </div>
      </div>
    </div>
  );
}