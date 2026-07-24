import { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc, addDoc, setDoc, serverTimestamp, orderBy, query, } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../contexts/authContext";
import Table from "../../components/Table";
import Badge from "../../components/Badge";
import Modal from "../../components/Modal";
import styles from "./pages.module.css";

const DIFFICULTIES = ["easy", "medium", "hard"];

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

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
  const [editingQuestion, setEditingQuestion]   = useState(null);

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

  async function handleEdit(updated) {
    try {
      await setDoc(
        doc(db, "questions", updated.topic, updated.difficulty, updated.id),
        {
          question:  updated.question,
          answer:    updated.answer,
          choices:   updated.choices,
          imageUrl:  updated.imageUrl || "",
          createdBy: updated.createdBy,
          createdAt: updated.createdAt,
        }
      );
      setQuestions(prev =>
        prev.map(q =>
          q.id === updated.id && q.topic === updated.topic && q.difficulty === updated.difficulty
            ? { ...q, ...updated }
            : q
        )
      );
    } catch (err) {
      console.error("Edit failed:", err);
      throw err;
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
        columns={["#", "Image", "Question", "Topic", "Difficulty", "Answer", "Actions"]}
        loading={loading}
        empty={filtered.length === 0}
        emptyText="No questions found."
      >
        {filtered.map((q, i) => (
          <tr key={`${q.topic}-${q.difficulty}-${q.id}`}>
            <td className={styles.muted}>{i + 1}</td>
            <td>
              {q.imageUrl ? (
                <img
                  src={q.imageUrl}
                  alt="question"
                  style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0" }}
                />
              ) : (
                <span className={styles.muted}>—</span>
              )}
            </td>
            <td className={styles.questionCell}>{q.question || "—"}</td>
            <td><Badge color="purple">{q.topic}</Badge></td>
            <td><Badge color={diffColor(q.difficulty)}>{q.difficulty}</Badge></td>
            <td className={styles.muted}>{q.answer || "—"}</td>
            <td className={styles.actions}>
              <button
                className={styles.rowBtn}
                onClick={() => setEditingQuestion(q)}
              >
                Edit
              </button>
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

      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          topics={topics}
          onClose={() => setEditingQuestion(null)}
          onSaved={handleEdit}
        />
      )}

    </div>
  );
}
function uploadQuestionImage(file, setForm) {
  if (!file) return;

  setForm(prev => ({ ...prev, uploadProgress: 0, imageUrl: "" }));

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("cloud_name", CLOUD_NAME);

  const xhr = new XMLHttpRequest();

  xhr.upload.addEventListener("progress", (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      setForm(prev => ({ ...prev, uploadProgress: percent }));
    }
  });

  xhr.addEventListener("load", () => {
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText);
      setForm(prev => ({ ...prev, imageUrl: data.secure_url, uploadProgress: null }));
    } else {
      setForm(prev => ({ ...prev, uploadProgress: null }));
      alert("Image upload failed. Try again.");
    }
  });

  xhr.addEventListener("error", () => {
    setForm(prev => ({ ...prev, uploadProgress: null }));
    alert("Image upload failed. Try again.");
  });

  xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
  xhr.send(formData);
}

function QuestionImageField({ form, setForm }) {
  return (
    <div className={styles.fieldGroup}>
      <label className={styles.label}>
        Image <span className={styles.optional}>(optional)</span>
      </label>

      <input
        type="file"
        accept="image/*"
        className={styles.fileInput}
        onChange={e => uploadQuestionImage(e.target.files[0], setForm)}
      />

      {form.uploadProgress != null && (
        <div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${form.uploadProgress}%` }}
            />
          </div>
          <span className={styles.progressText}>
            {form.uploadProgress < 100
              ? `Uploading... ${form.uploadProgress}%`
              : "Processing..."}
          </span>
        </div>
      )}

      {form.imageUrl && form.uploadProgress == null && (
        <div className={styles.imagePreviewWrap}>
          <img src={form.imageUrl} alt="preview" className={styles.imagePreview} />
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            onClick={() => setForm(prev => ({ ...prev, imageUrl: "" }))}
            title="Remove image"
          >✕</button>
        </div>
      )}
    </div>
  );
}

function AddQuestionModal({ topics, onClose, onAdded }) {
  const { currentUser } = useAuth();

  const [form, setForm] = useState({
    question:   "",
    difficulty: "easy",
    topic:      topics[0] || "",
    choices:    ["", "", "", ""],
    answer:     "",
    imageUrl:       "",
    uploadProgress: null,
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
        imageUrl:  form.imageUrl || "",
        createdBy: currentUser?.email || "unknown",
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

        <QuestionImageField form={form} setForm={setForm} />

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

function EditQuestionModal({ question, topics, onClose, onSaved }) {
  const [form, setForm] = useState({
    question:   question.question   || "",
    difficulty: question.difficulty || "easy",
    topic:      question.topic      || topics[0] || "",
    choices:    question.choices?.length === 4
                  ? question.choices
                  : [...(question.choices || []), "", "", "", ""].slice(0, 4),
    answer:     question.answer     || "",
    imageUrl:       question.imageUrl || "",
    uploadProgress: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleChoiceChange(i, val) {
    setForm(prev => {
      const choices = [...prev.choices];
      const newAnswer = prev.answer === prev.choices[i] ? val : prev.answer;
      choices[i] = val;
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
      setError("Correct answer must match one of the choices.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSaved({
        ...question,   
        question:   form.question,
        difficulty: form.difficulty,
        topic:      form.topic,
        choices:    filledChoices,
        answer:     form.answer,
        imageUrl:   form.imageUrl || "",
      });
      onClose();
    } catch {
      setError("Failed to save. Try again.");
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit Question" onClose={onClose}>
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
            rows={3}
            style={{ resize: "vertical" }}
          />
        </div>

        <QuestionImageField form={form} setForm={setForm} />

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
          <select name="answer" className={styles.input} value={form.answer} onChange={handleChange}>
            <option value="">— Select correct answer —</option>
            {form.choices.filter(c => c.trim() !== "").map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
          <p className={styles.fieldHint}>Select which choice is correct.</p>
        </div>
      </div>

      {error && <p className={styles.modalError}>{error}</p>}

      <div className={styles.modalActions}>
        <button className={styles.rowBtn} onClick={onClose}>Cancel</button>
        <button className={styles.actionBtn} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </Modal>
  );
}