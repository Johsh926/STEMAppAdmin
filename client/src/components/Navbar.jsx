import styles from "./Navbar.module.css";

function GearIcon() {
  return (
    <svg className={styles.settingsIcon} viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M19.14 12.94a7.07 7.07 0 0 0 .05-.94 7.07 7.07 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.55-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.71 8.78a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0-.05.94c0 .32.02.63.05.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.61.22l2.39-.96c.5.39 1.03.7 1.62.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.59-.24 1.13-.55 1.62-.94l2.39.96c.22.09.48 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
    </svg>
  );
}

export default function Navbar({ tabs, activeTab, onTabChange, userEmail, onSignOut, signingOut }) {
  return (
    <header className={styles.nav}>
      <div className={styles.navLeft}>
        <div className={styles.navLogo}>
          <span className={styles.navLogoText}>Admin Portal</span>
        </div>

        <nav className={styles.navTabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`${styles.navTab} ${activeTab === tab.id ? styles.navTabActive : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className={styles.navRight}>
        {userEmail && <span className={styles.navUser}>{userEmail}</span>}

        <button
          type="button"
          onClick={() => onTabChange("settings")}
          className={`${styles.settingsBtn} ${activeTab === "settings" ? styles.settingsBtnActive : ""}`}
          aria-current={activeTab === "settings" ? "page" : undefined}
        >
          <GearIcon />
          Settings
        </button>

        <button type="button" onClick={onSignOut} disabled={signingOut} className={styles.signOutBtn}>
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </header>
  );
}