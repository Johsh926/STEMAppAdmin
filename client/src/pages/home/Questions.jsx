import { useState, useEffect } from "react";
import {
  collection, getDocs, deleteDoc,
  doc, addDoc, serverTimestamp, orderBy, query,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import Table from "../../components/Table";
import Badge from "../../components/Badge";
import Modal from "../../components/Modal";
import styles from "./pages.module.css";

export default function Questions() {
  const [questions, setQuestions]               = useState([]);
  const [levels, setLevels]                     = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [showAddModal, setShowAddModal]         = useState(false);
  const [filterLevel, setFilterLevel]           = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");

  useEffect(() => { fetchQuestions(); }, []);

  async function fetchQuestions() {
    setLoading(true);
    try {
      const levelsSnap = await getDocs(collection(db, "questions"));
      const levelDocs = levelsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      levelDocs.sort((a, b) => (a.order || 0) - (b.order || 0));
      setLevels(levelDocs);

      const allQuestions = [];
      await Promise.all(
        levelDocs.map(async (level) => {
          try {
            const q = query(
              collection(db, "questions", level.id, "items"),
              orderBy("createdAt", "desc")
            );
            const itemsSnap = await getDocs(q);
            itemsSnap.docs.forEach(d => {
              allQuestions.push({
                id: d.id,
                levelId: level.id,
                levelTitle: level.title,
                ...d.data(),
              });
            });
          } catch {
            const itemsSnap = await getDocs(
              collection(db, "questions", level.id, "items")
            );
            itemsSnap.docs.forEach(d => {
              allQuestions.push({
                id: d.id,
                levelId: level.id,
                levelTitle: level.title,
                ...d.data(),
              });
            });
          }
        })
      );

      setQuestions(allQuestions);
    } catch (err) {
      console.error("Failed to fetch questions:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(questionId, levelId) {
    if (!window.confirm("Delete this question?")) return;
    try {
      await deleteDoc(doc(db, "questions", levelId, "items", questionId));
      setQuestions(prev => prev.filter(q => q.id !== questionId));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  const filtered = questions.filter(q => {
    const levelOk = filterLevel      === "all" || q.levelId    === filterLevel;
    const diffOk  = filterDifficulty === "all" || q.difficulty === filterDifficulty;
    return levelOk && diffOk;
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
        <button className={styles.actionBtn} onClick={() => setShowAddModal(true)}>
          + Add Question
        </button>
      </div>

      <div className={styles.filterRow}>
        <select
          className={styles.filterSelect}
          value={filterLevel}
          onChange={e => setFilterLevel(e.target.value)}
        >
          <option value="all">All Levels</option>
          {levels.map(l => (
            <option key={l.id} value={l.id}>{l.title || l.id}</option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={filterDifficulty}
          onChange={e => setFilterDifficulty(e.target.value)}
        >
          <option value="all">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <Table
        columns={["#", "Question", "Level", "Difficulty", "Answer", "Actions"]}
        loading={loading}
        empty={filtered.length === 0}
        emptyText="No questions found."
      >
        {filtered.map((q, i) => (
          <tr key={`${q.levelId}-${q.id}`}>
            <td className={styles.muted}>{i + 1}</td>
            <td className={styles.questionCell}>{q.question || "—"}</td>
            <td>{q.levelTitle ? <Badge color="purple">{q.levelTitle}</Badge> : "—"}</td>
            <td>{q.difficulty ? <Badge color={diffColor(q.difficulty)}>{q.difficulty}</Badge> : "—"}</td>
            <td className={styles.muted}>{q.answer || "—"}</td>
            <td>
              <button
                className={`${styles.rowBtn} ${styles.rowBtnDanger}`}
                onClick={() => handleDelete(q.id, q.levelId)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {showAddModal && (
        <AddQuestionModal
          levels={levels}
          onClose={() => setShowAddModal(false)}
          onAdded={fetchQuestions}
        />
      )}
    </div>
  );
}

function AddQuestionModal({ levels, onClose, onAdded }) {
  const [form, setForm] = useState({
    question:   "",
    difficulty: "easy",
    answer:     "",
    choices:    ["", "", "", ""],
    levelId:    levels[0]?.id || "",
    createdBy:  "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleChoiceChange(i, val) {
    setForm(prev => {
      const choices = [...prev.choices];
      choices[i] = val;
      return { ...prev, choices };
    });
  }

  async function handleSave() {
    if (!form.question || !form.answer) {
      setError("Question and answer are required.");
      return;
    }
    if (!form.levelId) {
      setError("Please select a level.");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "questions", form.levelId, "items"), {
        question:   form.question,
        answer:     form.answer,
        choices:    form.choices.filter(c => c.trim() !== ""),
        difficulty: form.difficulty,
        createdBy:  form.createdBy,
        createdAt:  serverTimestamp(),
      });
      onAdded();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save. Try again.");
      setSaving(false);
    }
  }

  return (
    <Modal title="Add New Question" onClose={onClose}>
      <div className={styles.modalFields}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Level</label>
          <select name="levelId" className={styles.input} value={form.levelId} onChange={handleChange}>
            {levels.map(l => (
              <option key={l.id} value={l.id}>{l.title || l.id}</option>
            ))}
          </select>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Question</label>
          <textarea
            name="question"
            className={styles.input}
            value={form.question}
            onChange={handleChange}
            placeholder="Enter the question..."
            rows={3}
            style={{ resize: "vertical" }}
          />
        </div>

        <div className={styles.twoCol}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Difficulty</label>
            <select name="difficulty" className={styles.input} value={form.difficulty} onChange={handleChange}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Created By</label>
            <input
              name="createdBy"
              className={styles.input}
              value={form.createdBy}
              onChange={handleChange}
              placeholder="e.g. admintest@gmail.com"
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Choices (A, B, C, D)</label>
          {form.choices.map((c, i) => (
            <input
              key={i}
              className={styles.input}
              style={{ marginBottom: 6 }}
              value={c}
              onChange={e => handleChoiceChange(i, e.target.value)}
              placeholder={`Choice ${String.fromCharCode(65 + i)}`}
            />
          ))}
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Correct Answer</label>
          <input
            name="answer"
            className={styles.input}
            value={form.answer}
            onChange={handleChange}
            placeholder="e.g. The mitochondria"
          />
        </div>
      </div>

      {error && <p className={styles.modalError}>{error}</p>}

      <div className={styles.modalActions}>
        <button className={styles.rowBtn} onClick={onClose}>Cancel</button>
        <button className={styles.actionBtn} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Question"}
        </button>
      </div>
    </Modal>
  );
}