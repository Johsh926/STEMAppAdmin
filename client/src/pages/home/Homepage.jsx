import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import { doSignOut } from "../../firebase/auth";
import Navbar from "../../components/Navbar";
import Overview  from "./Overview";
import Users     from "./Users";
import Questions from "./Questions";
import Accounts from "./Accounts";
import Settings  from "./Settings";
import Guides from "./Guides";
import styles from "./Homepage.module.css";

const TABS = [
  { id: "overview",  label: "Overview",  icon: "🏠" },
  { id: "users",     label: "Users",     icon: "👥" },
  { id: "questions", label: "Questions", icon: "📋" },
  { id: "guides",    label: "Guides",    icon: "📖" },
  { id: "accounts",  label: "Accounts",  icon: "🔑" },
  { id: "settings",  label: "Settings",  icon: "⚙️" },
];

export default function Homepage() {
  const [activeTab, setActiveTab]   = useState("overview");
  const [signingOut, setSigningOut] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await doSignOut();
      navigate("/login");
    } catch (err) {
      console.error(err);
      setSigningOut(false);
    }
  }

  function renderPage() {
    switch (activeTab) {
      case "overview":  return <Overview />;
      case "users":     return <Users />;
      case "questions": return <Questions />;
      case "guides":    return <Guides />;
      case "accounts":  return <Accounts />;
      case "settings":  return <Settings />;
      default:          return <Overview />;
    }
  }

  return (
    <div className={styles.layout}>
      <Navbar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userEmail={currentUser?.email}
        onSignOut={handleSignOut}
        signingOut={signingOut}
      />
      <main className={styles.main}>
        <div className={styles.pageTitle}>
          <h1 className={styles.pageTitleText}>{TABS.find(t => t.id === activeTab)?.label}</h1>
          <p className={styles.pageTitleSub}>Manage your {TABS.find(t => t.id === activeTab)?.label.toLowerCase()} here</p>
        </div>
        {renderPage()}
      </main>
    </div>
  );
}