import styles from "./Shared.module.css";

export default function Modal({ title, onClose, children}){
  return(
    <div className={styles.modalOverlay} onClick = {onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}