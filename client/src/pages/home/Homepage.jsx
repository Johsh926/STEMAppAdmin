import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import { doSignOut } from "../../firebase/auth";
import Navbar from "../../components/Navbar";
import Overview  from "./Overview";
import Users     from "./Users";
import Questions from "./Questions";
import Guides    from "./Guides";
import Accounts  from "./Accounts";
import Settings  from "./Settings";
import styles from "./Homepage.module.css";

const ALL_TABS = [
  { id: "overview",  label: "Overview",  icon: "🏠", component: Overview,  roles: ["admin"] },
  { id: "users",     label: "Users",     icon: "👥", component: Users,     roles: ["admin"] },
  { id: "questions", label: "Questions", icon: "📋", component: Questions, roles: ["admin", "teacher"] },
  { id: "guides",    label: "Guides",    icon: "📖", component: Guides,    roles: ["admin", "teacher"] },
  { id: "accounts",  label: "Accounts",  icon: "🔑", component: Accounts,  roles: ["admin"] },
  { id: "settings",  label: "Settings",  icon: "⚙️", component: Settings,  roles: ["admin"] },
];

export default function Homepage() {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();

  const visibleTabs = ALL_TABS.filter(tab => tab.roles.includes(userRole));

  const [activeTab, setActiveTab]   = useState(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [userRole]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await doSignOut();
      navigate("/login");
    } catch (err) {
      console.error("Sign out error:", err);
      setSigningOut(false);
    }
  }

  const currentTab = visibleTabs.find(t => t.id === activeTab);
  const ActiveComponent = currentTab?.component;

  return (
    <div className={styles.layout}>
      <Navbar
        tabs={visibleTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userEmail={currentUser?.email}
        onSignOut={handleSignOut}
        signingOut={signingOut}
      />
      <main className={styles.main}>
        <div className={styles.pageTitle}>
          <h1 className={styles.pageTitleText}>{currentTab?.label}</h1>
          <p className={styles.pageTitleSub}>
            Manage your {currentTab?.label?.toLowerCase()} here
          </p>
        </div>
        {ActiveComponent && <ActiveComponent />}
      </main>
    </div>
  );
}