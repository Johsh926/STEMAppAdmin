import styles from "./Shared.module.css";

export default function Table({ columns = [], loading, empty, emptyText = "No records found.", children}){
  return(
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col, i) => <th key={i}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={columns.length} className={styles.emptyRow}>Loading...</td></tr>
          ) : empty ? (
            <tr><td colSpan={columns.length} className={styles.emptyRow}>{emptyText}</td></tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}