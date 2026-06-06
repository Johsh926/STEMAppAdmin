import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import styles from "./Homepage.module.css";

function OvervierTab(){
  return(
    <div className={styles.tabContent}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>👥</span>
          <div>
            <p className={styles.statValue}>128</p>
            <p className={styles.statLabel}>Total Users</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>🎓</span>
          <div>
            <p className={styles.statValue}>34</p>
            <p className={styles.statLabel}>Teachers</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📋</span>
          <div>
            <p className={styles.statValue}>210</p>
            <p className={styles.statLabel}>Questions</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📊</span>
          <div>
            <p className={styles.statValue}>Activity Chart</p>
            <p className={styles.statLabel}>Chart</p>
          </div>
        </div>
      </div>
    </div>
  );
}