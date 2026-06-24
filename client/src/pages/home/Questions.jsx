import { useState, useEffect } from "react";
import {
  collection, getDocs, deleteDoc, doc,
  addDoc, setDoc, serverTimestamp, orderBy, query,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import Table from "../../components/Table";
import Badge from "../../components/Badge";
import Modal from "../../components/Modal";
import styles from "./pages.module.css";

const DIFFICULTIES = ["easy", "medium", "hard"];

export default function Questions() {
  const [questions, setQuestions]               = useState([]);
  const [topics, setTopics]                     = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [showAddModal, setShowAddModal]         = useState(false);
  const [showAddTopic, setShowAddTopic]         = useState(false);
  const [newTopic, setNewTopic]                 = useState("");
  const [savingTopic, setSavingTopic]           = useState(false);
  const [filterTopic, setFilterTopic]           = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");

  useEffect(() => { fetchAll(); }, []);

  async function fetchTopics() {
    const snap = await getDocs(collection(db, "questions"));
    return snap.docs.map(d => d.id);
  }

  async function fetchAll() {
    setLoading(true);
    try {
      const topicList = await fetchTopics();
      setTopics(topicList);

      const allQuestions = [];
      await Promise.all(
        topicList.map(async (topic) => {
          await Promise.all(
            DIFFICULTIES.map(async (difficulty) => {
              try {
                const q = query(
                  collection(db, "questions", topic, difficulty),
                  orderBy("createdAt", "desc")
                );
                const snap = await getDocs(q);
                snap.docs.forEach(d => {
                  allQuestions.push({ id: d.id, topic, difficulty, ...d.data() });
                });
              } catch {
                const snap = await getDocs(
                  collection(db, "questions", topic, difficulty)
                );
                snap.docs.forEach(d => {
                  allQuestions.push({ id: d.id, topic, difficulty, ...d.data() });
                });
              }
            })
          );
        })
      );
      setQuestions(allQuestions);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTopic() {
    const cleaned = newTopic.trim().toLowerCase().replace(/\s+/g, "_");
    if (!cleaned) return;
    if (topics.includes(cleaned)) {
      alert("Topic already exists.");
      return;
    }
    setSavingTopic(true);
    try {
      await setDoc(doc(db, "questions", cleaned), {
        title: newTopic.trim(),
        createdAt: serverTimestamp(),
      });
      setTopics(prev => [...prev, cleaned]);
      setNewTopic("");
      setShowAddTopic(false);
    } catch (err) {
      console.error("Failed to add topic:", err);
      alert("Failed to add topic.");
    } finally {
      setSavingTopic(false);
    }
  }

  async function handleDelete(questionId, topic, difficulty) {
    if (!window.confirm("Delete this question?")) return;
    try {
      await deleteDoc(doc(db, "questions", topic, difficulty, questionId));
      setQuestions(prev => prev.filter(q => q.id !== questionId));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  const filtered = questions.filter(q => {
    const topicOk = filterTopic      === "all" || q.topic      === filterTopic;
    const diffOk  = filterDifficulty === "all" || q.difficulty === filterDifficulty;
    return topicOk && diffOk;
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
        <div style={{ display: "flex", gap: 8 }}>
          <button className={styles.rowBtn} onClick={() => setShowAddTopic(true)}>
            + Add Topic
          </button>
          <button className={styles.actionBtn} onClick={() => setShowAddModal(true)}>
            + Add Question
          </button>
        </div>
      </div>

      {showAddTopic && (
        <div className={styles.inlineForm}>
          <input
            className={styles.input}
            value={newTopic}
            onChange={e => setNewTopic(e.target.value)}
            placeholder="e.g. Algebra"
            style={{ maxWidth: 240 }}
          />
          <button
            className={styles.actionBtn}
            onClick={handleAddTopic}
            disabled={savingTopic}
          >
            {savingTopic ? "Saving..." : "Save Topic"}
          </button>
          <button
            className={styles.rowBtn}
            onClick={() => { setShowAddTopic(false); setNewTopic(""); }}
          >
            Cancel
          </button>
        </div>
      )}

      <div className={styles.filterRow}>
        {topics.map(t => (
          <span key={t} className={`${styles.filterBtn} ${styles.topicChip}`}>
            <Badge color="purple">{t}</Badge>
          </span>
        ))}
      </div>

      <div className={styles.filterRow}>
        <select
          className={styles.filterSelect}
          value={filterTopic}
          onChange={e => setFilterTopic(e.target.value)}
        >
          <option value="all">All Topics</option>
          {topics.map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={filterDifficulty}
          onChange={e => setFilterDifficulty(e.target.value)}
        >
          <option value="all">All Difficulties</option>
          {DIFFICULTIES.map(d => (
            <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
          ))}
        </select>
      </div>

      <Table
        columns={["#", "Question", "Topic", "Difficulty", "Answer", "Actions"]}
        loading={loading}
        empty={filtered.length === 0}
        emptyText="No questions found."
      >
        {filtered.map((q, i) => (
          <tr key={`${q.topic}-${q.difficulty}-${q.id}`}>
            <td className={styles.muted}>{i + 1}</td>
            <td className={styles.questionCell}>{q.question || "—"}</td>
            <td><Badge color="purple">{q.topic}</Badge></td>
            <td><Badge color={diffColor(q.difficulty)}>{q.difficulty}</Badge></td>
            <td className={styles.muted}>{q.answer || "—"}</td>
            <td>
              <button
                className={`${styles.rowBtn} ${styles.rowBtnDanger}`}
                onClick={() => handleDelete(q.id, q.topic, q.difficulty)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {showAddModal && (
        <AddQuestionModal
          topics={topics}
          onClose={() => setShowAddModal(false)}
          onAdded={fetchAll}
        />
      )}
    </div>
  );
}

function AddQuestionModal({ topics, onClose, onAdded }) {
  const [form, setForm] = useState({
    question:  "",
    difficulty: "easy",
    topic:     topics[0] || "",
    choices:   ["", "", "", ""],
    answer:    "",
    createdBy: "",
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
      // If the current answer was this choice, update it too
      const newAnswer = prev.answer === prev.choices[i] ? val : prev.answer;
      return { ...prev, choices, answer: newAnswer };
    });
  }

  async function handleSave() {
    if (!form.question) {
      setError("Question is required.");
      return;
    }
    const filledChoices = form.choices.filter(c => c.trim() !== "");
    if (filledChoices.length < 2) {
      setError("At least 2 choices are required.");
      return;
    }
    if (!form.answer) {
      setError("Please select the correct answer.");
      return;
    }
    if (!filledChoices.includes(form.answer)) {
      setError("Correct answer must match one of the choices exactly.");
      return;
    }
    if (!form.topic) {
      setError("Please select a topic.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "questions", form.topic, form.difficulty), {
        question:  form.question,
        answer:    form.answer,
        choices:   filledChoices,
        createdBy: form.createdBy,
        createdAt: serverTimestamp(),
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

        <div className={styles.twoCol}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Topic</label>
            <select name="topic" className={styles.input} value={form.topic} onChange={handleChange}>
              {topics.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Difficulty</label>
            <select name="difficulty" className={styles.input} value={form.difficulty} onChange={handleChange}>
              {DIFFICULTIES.map(d => (
                <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
          </div>
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
          <select
            name="answer"
            className={styles.input}
            value={form.answer}
            onChange={handleChange}
          >
            <option value="">— Select correct answer —</option>
            {form.choices.filter(c => c.trim() !== "").map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
          <p className={styles.fieldHint}>
            Select which of your choices above is correct.
          </p>
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