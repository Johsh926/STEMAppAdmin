import styles from "./shared.module.css";

export default function Badge({ color = "gray", children }){
  const colorMap = {
    green: styles.badgeGreen,
    red: styles.badgeRed,
    purple: styles.badgePurple,
    blue: styles.badgeBlue,
    gray: styles.badgeGray,
  };
  return(
  <span className={`${styles.badge} ${colorMap[color] || colorMap.gray}`}>
    {children}
  </span>
);
}
