import { useState, useEffect, useRef } from "react";
import {
  collection, getDocs, deleteDoc, doc,
  addDoc, setDoc, serverTimestamp, orderBy, query, writeBatch
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../contexts/authContext";
import { logAction } from "../../firebase/logs";
import Table from "../../components/Table";
import Badge from "../../components/Badge";
import Modal from "../../components/Modal";
import styles from "./Pages.module.css";

const DIFFICULTIES = ["easy", "medium", "hard"];

export default function Questions() {
  const { currentUser, userRole } = useAuth();
  const actor = { uid: currentUser?.uid, email: currentUser?.email, role: userRole };

  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [topicMeta, setTopicMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [savingTopic, setSavingTopic] = useState(false);
  const [filterTopic, setFilterTopic] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingQuestion, setEditingQuestion] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const topicsSnap = await getDocs(collection(db, "questions"));
      const topicList = topicsSnap.docs.map(d => d.id);
      const metaMap = {};
      topicsSnap.docs.forEach(d => { metaMap[d.id] = d.data(); });
      setTopics(topicList);
      setTopicMeta(metaMap);

      const allQuestions = [];
      await Promise.all(
        topicList.map(async (topic) => {
          await Promise.all(
            DIFFICULTIES.map(async (difficulty) => {
              try {
                const q = query(collection(db, "questions", topic, difficulty), orderBy("createdAt", "desc"));
                const snap = await getDocs(q);
                snap.docs.forEach(d => { allQuestions.push({ id: d.id, topic, difficulty, ...d.data() }); });
              } catch {
                const snap = await getDocs(collection(db, "questions", topic, difficulty));
                snap.docs.forEach(d => { allQuestions.push({ id: d.id, topic, difficulty, ...d.data() }); });
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
      setTopicMeta(prev => ({ ...prev, [cleaned]: { title: newTopic.trim(), createdAt: new Date() } }));
      logAction(actor, "create_topic", `Created new topic: "${newTopic.trim()}"`);
      setNewTopic("");
      setShowAddTopic(false);
    } catch (err) {
      console.error("Failed to add topic:", err);
      alert("Failed to add topic.");
    } finally {
      setSavingTopic(false);
    }
  }

  async function handleDeleteTopic(topicId) {
    const title = topicMeta[topicId]?.title || topicId;
    const affectedCount = questions.filter(q => q.topic === topicId).length;

    if (!window.confirm(`Delete topic "${title}"?\n\nThis permanently deletes ${affectedCount} questions.\n\nThis cannot be undone.`)) return;

    try {
      await Promise.all(
        DIFFICULTIES.map(async (difficulty) => {
          const snap = await getDocs(collection(db, "questions", topicId, difficulty));
          await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
        })
      );
      await deleteDoc(doc(db, "questions", topicId));
      await deleteDoc(doc(db, "guides", topicId));

      setTopics(prev => prev.filter(t => t !== topicId));
      setTopicMeta(prev => { const updated = { ...prev }; delete updated[topicId]; return updated; });
      setQuestions(prev => prev.filter(q => q.topic !== topicId));
      if (filterTopic === topicId) setFilterTopic("all");

      logAction(actor, "delete_topic", `Deleted topic "${title}"`);
    } catch (err) {
      console.error("Failed to delete topic:", err);
      alert("Failed to delete topic. Check the console for details.");
    }
  }

  async function handleDelete(question) {
    if (!window.confirm("Delete this question?")) return;
    try {
      await deleteDoc(doc(db, "questions", question.topic, question.difficulty, question.id));
      setQuestions(prev => prev.filter(q => q.id !== question.id));
      logAction(actor, "delete_question", `Deleted question in ${question.topic}/${question.difficulty}`);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  async function handleEdit(original, updated) {
    try {
      const pathChanged = updated.topic !== original.topic || updated.difficulty !== original.difficulty;
      const newRef = doc(db, "questions", updated.topic, updated.difficulty, updated.id);

      const payload = {
        question: updated.question,
        answer: updated.answer,
        choices: updated.choices,
        imageUrl: updated.imageUrl || "",
        correctFeedback: updated.correctFeedback || "",
        incorrectFeedback: updated.incorrectFeedback || "",
        createdBy: updated.createdBy,
        createdAt: updated.createdAt,
      };

      if (pathChanged) {
        const oldRef = doc(db, "questions", original.topic, original.difficulty, original.id);
        const batch = writeBatch(db);
        batch.set(newRef, payload);
        batch.delete(oldRef);
        await batch.commit();
      } else {
        await setDoc(newRef, payload);
      }

      setQuestions(prev => prev.map(q => q.id === original.id && q.topic === original.topic && q.difficulty === original.difficulty ? { ...q, ...updated } : q));
      logAction(actor, "edit_question", `Edited question in ${updated.topic}/${updated.difficulty}`);
    } catch (err) {
      console.error("Edit failed:", err);
      throw err;
    }
  }

  const filtered = questions.filter(q => {
    const topicOk = filterTopic === "all" || q.topic === filterTopic;
    const diffOk = filterDifficulty === "all" || q.difficulty === filterDifficulty;
    const searchOk = (q.question || "").toLowerCase().includes(searchQuery.toLowerCase());
    return topicOk && diffOk && searchOk;
  });

  function diffColor(d) {
    if (d === "easy") return "green";
    if (d === "medium") return "blue";
    if (d === "hard") return "red";
    return "gray";
  }

  const formatTopicString = (str) => {
    return str.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader} style={{ justifyContent: "flex-end" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={styles.rowBtn} onClick={() => setShowAddTopic(true)}>+ Add Topic</button>
          <button className={styles.actionBtn} onClick={() => setShowAddModal(true)}>+ Add Question</button>
        </div>
      </div>

      <div className={styles.filterRow} style={{ marginTop: '20px', marginBottom: '16px' }}>
        <input
          type="text"
          className={styles.searchBox}
          placeholder="Search questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '240px' }}
        />
        <select className={styles.filterSelect} value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
          <option value="all">All Topics</option>
          {topics.map(t => <option key={t} value={t}>{formatTopicString(t)}</option>)}
        </select>
        <select className={styles.filterSelect} value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}>
          <option value="all">All Difficulties</option>
          {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
        </select>
      </div>

      <div className={styles.topicManageGrid} style={{ marginBottom: '16px' }}>
        {topics.map(t => {
          const meta = topicMeta[t] || {};
          const created = meta.createdAt?.toDate ? meta.createdAt.toDate().toLocaleDateString() : "—";
          const questionCount = questions.filter(q => q.topic === t).length;

          return (
            <div key={t} className={styles.topicManageChip}>
              <Badge color="purple">{formatTopicString(meta.title || t)}</Badge>
              <span className={styles.topicManageDate}>Created: {created} · {questionCount} Questions</span>
              <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => handleDeleteTopic(t)}>✕</button>
            </div>
          );
        })}
      </div>

      <Table
        columns={["#", "IMAGE", "QUESTION", "TOPIC", "DIFFICULTY", "ANSWER", "ACTIONS"]}
        loading={loading}
        empty={filtered.length === 0}
        emptyText="No questions found."
      >
        {filtered.map((q, i) => (
          <tr key={`${q.topic}-${q.difficulty}-${q.id}`}>
            <td className={styles.muted}>{i + 1}</td>
            <td>
              {q.imageUrl ? (
                <img src={q.imageUrl} alt="question" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0" }} />
              ) : <div style={{ width: 40, height: 40, backgroundColor: "#e2e8f0", borderRadius: 6 }}></div>}
            </td>
            <td className={styles.questionCell}>{q.question || "—"}</td>
            <td><Badge color="purple">{formatTopicString(q.topic)}</Badge></td>
            <td><Badge color={diffColor(q.difficulty)}>{q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}</Badge></td>
            <td className={styles.muted}>{q.answer || "—"}</td>
            <td className={styles.actions}>
              <button className={styles.rowBtn} onClick={() => setEditingQuestion(q)}>Edit</button>
              <button className={`${styles.rowBtn} ${styles.rowBtnDanger}`} onClick={() => handleDelete(q)}>Delete</button>
            </td>
          </tr>
        ))}
      </Table>

      {showAddTopic && (
        <Modal title="TOPIC" onClose={() => { setShowAddTopic(false); setNewTopic(""); }}>
          <div className={styles.modalFields}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Topic Name</label>
              <input className={styles.input} value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="Enter Topic Name" />
            </div>
          </div>
          <div className={styles.modalActions}>
            <button className={styles.rowBtn} onClick={() => { setShowAddTopic(false); setNewTopic(""); }}>Cancel</button>
            <button className={styles.actionBtn} onClick={handleAddTopic} disabled={savingTopic}>
              {savingTopic ? "Saving..." : "Add Topic"}
            </button>
          </div>
        </Modal>
      )}

      {showAddModal && (
        <QuestionFormModal
          mode="add"
          topics={topics}
          actor={actor}
          onClose={() => setShowAddModal(false)}
          onSaved={async () => { setShowAddModal(false); await fetchAll(); }}
        />
      )}
      {editingQuestion && (
        <QuestionFormModal
          mode="edit"
          question={editingQuestion}
          topics={topics}
          actor={actor}
          onClose={() => setEditingQuestion(null)}
          onSaved={async (updated) => {
            await handleEdit(editingQuestion, updated);
            setEditingQuestion(null);
            await fetchAll();
          }}
        />
      )}
    </div>
  );
}

function QuestionFormModal({ mode, question, topics, actor, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const [topic, setTopic] = useState(question?.topic || topics[0] || "");
  const [difficulty, setDifficulty] = useState(question?.difficulty || "easy");
  const [prompt, setPrompt] = useState(question?.question || "");
  const [imageUrl, setImageUrl] = useState(question?.imageUrl || "");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(question?.imageUrl || "");
  const imageInputRef = useRef(null);
  const [choices, setChoices] = useState(() => {
    const existing = question?.choices || [];
    return [0, 1, 2, 3].map(i => existing[i] || "");
  });
  const [answer, setAnswer] = useState(question?.answer || "");
  const [correctFeedback, setCorrectFeedback] = useState(question?.correctFeedback || "");
  const [incorrectFeedback, setIncorrectFeedback] = useState(question?.incorrectFeedback || "");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!topic || !prompt.trim() || choices.some(c => !c.trim()) || !answer) {
      alert("Please complete the topic, question, all four choices, and correct answer.");
      return;
    }
    setSaving(true);
    try {
      let finalImageUrl = imageUrl.trim();

      if (imageFile) {
        const storage = getStorage();
        const safeFileName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const imagePath = `question-images/${topic}/${Date.now()}-${safeFileName}`;
        const imageRef = storageRef(storage, imagePath);
        const uploadedImage = await uploadBytes(imageRef, imageFile);
        finalImageUrl = await getDownloadURL(uploadedImage.ref);
      }

      const payload = {
      question: prompt.trim(),
      choices: choices.map(c => c.trim()),
      answer,
      imageUrl: finalImageUrl,
      correctFeedback: correctFeedback.trim(),
      incorrectFeedback: incorrectFeedback.trim(),
      createdBy: question?.createdBy || actor?.uid || "",
      createdAt: question?.createdAt || serverTimestamp(),
      };
      if (isEdit) {
        await onSaved({ ...question, ...payload, topic, difficulty });
      } else {
        await addDoc(collection(db, "questions", topic, difficulty), payload);
        logAction(actor, "create_question", `Created question in ${topic}/${difficulty}`);
        await onSaved();
      }
    } catch (err) {
      console.error(`Failed to ${isEdit ? "edit" : "add"} question:`, err);
      alert(`Failed to ${isEdit ? "save" : "add"} question. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  const fieldStyle = { width: "100%", boxSizing: "border-box" };
  const feedbackStyle = { ...fieldStyle, minHeight: 82, resize: "vertical" };

  return (
    <Modal title={isEdit ? "EDIT QUESTION" : "ADD NEW QUESTION"} onClose={onClose}>
      <form onSubmit={submit}>
        <div className={styles.modalFields}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Topic</label>
              <select className={styles.input} style={fieldStyle} value={topic} onChange={e => setTopic(e.target.value)} required>
                <option value="" disabled>Select topic</option>
                {topics.map(t => <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Difficulty</label>
              <select className={styles.input} style={fieldStyle} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Question</label>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 120px", gap: 12, alignItems: "stretch" }}>
              <textarea
                className={styles.input}
                style={{ ...fieldStyle, minHeight: 88, resize: "vertical" }}
                rows={3}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                required
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith("image/")) {
                      alert("Please select an image file.");
                      e.target.value = "";
                      return;
                    }
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                    setImageUrl("");
                  }}
                />
                <button
                  type="button"
                  className={styles.rowBtn}
                  style={{ height: 88, width: "100%", whiteSpace: "normal" }}
                  onClick={() => imageInputRef.current?.click()}
                  disabled={saving}
                >
                  + Add Image
                </button>
                {imagePreview && (
                  <div style={{ position: "relative" }}>
                    <img
                      src={imagePreview}
                      alt="Question preview"
                      style={{ width: "100%", height: 68, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0" }}
                    />
                    <button
                      type="button"
                      aria-label="Remove question image"
                      title="Remove image"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview("");
                        setImageUrl("");
                        if (imageInputRef.current) imageInputRef.current.value = "";
                      }}
                      disabled={saving}
                      style={{ position: "absolute", top: 3, right: 3, border: 0, borderRadius: 4, background: "#fff", cursor: "pointer", padding: "2px 6px" }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
            <small>Type your question and optionally add an image beside it.</small>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Choices (A, B, C, D)</label>
            {choices.map((choice, i) => (
              <input key={i} className={styles.input} style={{ ...fieldStyle, marginBottom: 8 }} value={choice}
                onChange={e => setChoices(prev => prev.map((c, index) => index === i ? e.target.value : c))}
                placeholder={`Choice ${String.fromCharCode(65 + i)}`} required />
            ))}
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Correct Answer</label>
            <select className={styles.input} style={fieldStyle} value={answer} onChange={e => setAnswer(e.target.value)} required>
              <option value="">— Select correct answer —</option>
              {choices.map((choice, i) => choice.trim() && (
                <option key={i} value={choice.trim()}>{String.fromCharCode(65 + i)}. {choice.trim()}</option>
              ))}
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Feedback for Correct Answer</label>
            <textarea className={styles.input} style={feedbackStyle} value={correctFeedback}
              onChange={e => setCorrectFeedback(e.target.value)}
              placeholder="Example: Correct! Great job. You identified the right answer." />
            <small>Shown/spoken when the student answers correctly.</small>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Feedback for Incorrect Answer</label>
            <textarea className={styles.input} style={feedbackStyle} value={incorrectFeedback}
              onChange={e => setIncorrectFeedback(e.target.value)}
              placeholder="Example: Not quite. Review the concept and try again." />
            <small>Shown/spoken when the student answers incorrectly.</small>
          </div>
        </div>
        <div className={styles.modalActions}>
          <button type="button" className={styles.rowBtn} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className={styles.actionBtn} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Save Question"}
          </button>
        </div>
      </form>
    </Modal>
  );
}