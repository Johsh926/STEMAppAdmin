import { use, useState } from "react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if(!email || !password){
      setError("Please fill all fields.");
      return;
    }
    setLoading(true);

    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);

    alert("Loading successful")
  }
};

return(
  <div style={styles.page}>
    {}
    <div style={styles.gridOverlay}/>

    <div style={style.card}>
      {}
      <div style={styles.header}>
        <div style={styles.shieldWrap}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V51-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10"/>
          </svg>
        </div>
        <h1 style={styles.title}>Admin Portal</h1>
        <p style={styles.subtitle}>Restricted Access - Authorized Personnel Only</p>
      </div>
      <div style={styles.divider}/>
      <div style={styles.form}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Administrator Email</label>
          <div style={styles.inputWrap}>
            <svg style={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12, 13 2,6"/>
            </svg>
            <input type="email" 
            placeholder="Enter your email." 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            style={styles.input} 
            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)} 
            onBlur={(e) => Object.assign(e.target.style, styles.input)} 
            autoComplete="email"/>
          </div>
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Password</label>
          <div style={styles.inputWrap}></div>
        </div>
      </div>
    </div>
  </div>
)