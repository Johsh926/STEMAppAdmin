import { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import Table from "../../components/Table";
import Badge from "../../components/Badge";
import Modal from "../../components/Modal";
import styles from "./pages.module.css";

export default function Questions() {
  const [questions, setQuestions]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory]     = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");

  useEffect(() => { fetchQuestions(); }, []);

  async function fetchQuestions() {
    setLoading(true);
    try {
      const q = query(collection(db, "questions"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      const snap = await getDocs(collection(db, "questions"));
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this question?")) return;
    try {
      await deleteDoc(doc(db, "questions", id));
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err) { console.error(err); }
  }

  const categories = ["all", ...new Set(questions.map(q => q.category).filter(Boolean))];
  const filtered = questions.filter(q => {
    const catOk  = filterCategory   === "all" || q.category   === filterCategory;
    const diffOk = filterDifficulty === "all" || q.difficulty === filterDifficulty;
    return catOk && diffOk;
  });

  function diffColor(d) {
    if (d === "easy")   return "green";
    if (d === "medium") return "blue";
    if (d === "hard")   return "red";
    return "gray";
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Question Bank</h2>
          <p className={styles.sectionSub}>{questions.length} questions total</p>
        </div>
        <button className={styles.actionBtn} onClick={() => setShowAddModal(true)}>+ Add Question</button>
      </div>

      <div className={styles.filterRow}>
        <select className={styles.filterSelect} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          {categories.map(c => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
        </select>
        <select className={styles.filterSelect} value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}>
          <option value="all">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <Table
        columns={["#", "Question", "Category", "Difficulty", "Answer", "Actions"]}
        loading={loading}
        empty={filtered.length === 0}
        emptyText="No questions found."
      >
        {filtered.map((q, i) => (
          <tr key={q.id}>
            <td className={styles.muted}>{i + 1}</td>
            <td className={styles.questionCell}>{q.question || "—"}</td>
            <td>{q.category ? <Badge color="purple">{q.category}</Badge> : "—"}</td>
            <td>{q.difficulty ? <Badge color={diffColor(q.difficulty)}>{q.difficulty}</Badge> : "—"}</td>
            <td className={styles.muted}>{q.answer || "—"}</td>
            <td>
              <button className={`${styles.rowBtn} ${styles.rowBtnDanger}`} onClick={() => handleDelete(q.id)}>Delete</button>
            </td>
          </tr>
        ))}
      </Table>

      {showAddModal && <AddQuestionModal onClose={() => setShowAddModal(false)} onAdded={fetchQuestions} />}
    </div>
  );
}

function AddQuestionModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ question: "", category: "", difficulty: "easy", answer: "", choices: ["", "", "", ""] });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  function handleChange(e) { setForm(prev => ({ ...prev, [e.target.name]: e.target.value })); }
  function handleChoiceChange(i, val) {
    setForm(prev => { const choices = [...prev.choices]; choices[i] = val; return { ...prev, choices }; });
  }

  async function handleSave() {
    if (!form.question || !form.answer) { setError("Question and answer are required."); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, "questions"), {
        ...form,
        choices: form.choices.filter(c => c.trim() !== ""),
        createdAt: serverTimestamp(),
      });
      onAdded(); onClose();
    } catch { setError("Failed to save."); setSaving(false); }
  }

  return (
    <Modal title="Add New Question" onClose={onClose}>
      <div className={styles.modalFields}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Question</label>
          <textarea name="question" className={styles.input} value={form.question} onChange={handleChange} placeholder="Enter the question..." rows={3} style={{ resize: "vertical" }} />
        </div>
        <div className={styles.twoCol}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Category</label>
            <input name="category" className={styles.input} value={form.category} onChange={handleChange} placeholder="e.g. Biology" />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Difficulty</label>
            <select name="difficulty" className={styles.input} value={form.difficulty} onChange={handleChange}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Choices (A, B, C, D)</label>
          {form.choices.map((c, i) => (
            <input key={i} className={styles.input} style={{ marginBottom: 6 }} value={c} onChange={e => handleChoiceChange(i, e.target.value)} placeholder={`Choice ${String.fromCharCode(65 + i)}`} />
          ))}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Correct Answer</label>
          <input name="answer" className={styles.input} value={form.answer} onChange={handleChange} placeholder="e.g. The mitochondria" />
        </div>
      </div>
      {error && <p className={styles.modalError}>{error}</p>}
      <div className={styles.modalActions}>
        <button className={styles.rowBtn} onClick={onClose}>Cancel</button>
        <button className={styles.actionBtn} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Question"}</button>
      </div>
    </Modal>
  );
}