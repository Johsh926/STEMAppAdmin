import styles from "./Navbar.module.css";

export default function Navbar({ tabs, activeTab, onTabChange, userEmail, onSignOut, signingOut }){
  return(
    <header className={styles.nav}>
      <div className={styles.navLeft}>
        <div className={styles.navLogo}>
          <span className={styles.navLogoutIcon}>🛡️</span>
          <span className={styles.navLogoText}>Admin Portal</span>
        </div>
        <nav className={styles.navTabs}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => onTabChange(tab.id)} className={`${styles.navTab} ${activeTab === tab.id ? styles.navTabActive : ""}`}>
              <span className={styles.navTabIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className={styles.navTabRight}>
        <span className={styles.navUser}>{userEmail}</span>
        <button onClick={onSignOut} disabled={signingOut} className={styles.signOutBtn}>
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </header>
  );
}