import { useState, useEffect } from "react";
import {
  collection, getDocs, doc,
  getDoc, setDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import Modal from "../../components/Modal";
import Badge from "../../components/Badge";
import styles from "./Pages.module.css";

export default function Guides() {
  const [topics, setTopics]           = useState([]);
  const [guides, setGuides]           = useState({});
  const [loading, setLoading]         = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [editingGuide, setEditingGuide]   = useState(null);
  const [viewingGuide, setViewingGuide]   = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const topicsSnap = await getDocs(collection(db, "questions"));
      const topicList  = topicsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTopics(topicList);

      const guidesSnap = await getDocs(collection(db, "guides"));
      const guidesMap  = {};
      guidesSnap.docs.forEach(d => {
        guidesMap[d.id] = { id: d.id, ...d.data() };
      });
      setGuides(guidesMap);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(topicId) {
    if (!window.confirm("Delete this guide?")) return;
    try {
      await deleteDoc(doc(db, "guides", topicId));
      setGuides(prev => {
        const updated = { ...prev };
        delete updated[topicId];
        return updated;
      });
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  async function handleSave(topicId, data) {
    await setDoc(doc(db, "guides", topicId), {
      ...data,
      topicId,
      updatedAt: serverTimestamp(),
    });
    setGuides(prev => ({
      ...prev,
      [topicId]: { id: topicId, ...data, topicId },
    }));
  }

  if (loading) return <p className={styles.loadingText}>Loading guides...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Topic Guides</h2>
          <p className={styles.sectionSub}>One guide per topic — sections with headings and content</p>
        </div>
      </div>

      <div className={styles.guideGrid}>
        {topics.map(topic => {
          const guide     = guides[topic.id];
          const hasGuide  = !!guide;

          return (
            <div key={topic.id} className={styles.guideCard}>
              <div className={styles.guideCardTop}>
                <div>
                  <p className={styles.guideCardTitle}>
                    {topic.title || topic.id}
                  </p>
                  <p className={styles.guideCardMeta}>
                    {hasGuide
                      ? `${guide.sections?.length || 0} section${guide.sections?.length !== 1 ? "s" : ""}`
                      : "No guide yet"}
                  </p>
                </div>
                <Badge color={hasGuide ? "green" : "gray"}>
                  {hasGuide ? "Published" : "No guide"}
                </Badge>
              </div>

              <div className={styles.guideCardActions}>
                {hasGuide ? (
                  <>
                    <button
                      className={styles.rowBtn}
                      onClick={() => setViewingGuide({ topicId: topic.id, guide })}
                    >
                      View
                    </button>
                    <button
                      className={styles.rowBtn}
                      onClick={() => setEditingGuide({ topicId: topic.id, guide })}
                    >
                      Edit
                    </button>
                    <button
                      className={`${styles.rowBtn} ${styles.rowBtnDanger}`}
                      onClick={() => handleDelete(topic.id)}
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    className={styles.actionBtn}
                    onClick={() => setEditingGuide({ topicId: topic.id, guide: null })}
                  >
                    + Create Guide
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {viewingGuide && (
        <ViewGuideModal
          topicId={viewingGuide.topicId}
          guide={viewingGuide.guide}
          topics={topics}
          onClose={() => setViewingGuide(null)}
        />
      )}

      {editingGuide && (
        <EditGuideModal
          topicId={editingGuide.topicId}
          guide={editingGuide.guide}
          topics={topics}
          onClose={() => setEditingGuide(null)}
          onSaved={async (topicId, data) => {
            await handleSave(topicId, data);
            setEditingGuide(null);
          }}
        />
      )}
    </div>
  );
}

function ViewGuideModal({ topicId, guide, topics, onClose }) {
  const topic = topics.find(t => t.id === topicId);

  return (
    <Modal title={`Guide — ${topic?.title || topicId}`} onClose={onClose}>
      <div className={styles.guideView}>
        {guide.sections?.length > 0 ? (
          guide.sections.map((section, i) => (
            <div key={i} className={styles.guideSection}>
              {section.heading && (
                <h3 className={styles.guideSectionHeading}>{section.heading}</h3>
              )}
              {section.content && (
                <p className={styles.guideSectionContent}>{section.content}</p>
              )}
              {section.imageUrl && (
                <img
                  src={section.imageUrl}
                  alt={section.heading || `Section ${i + 1}`}
                  className={styles.guideSectionImage}
                />
              )}
            </div>
          ))
        ) : (
          <p className={styles.loadingText}>No sections added yet.</p>
        )}
      </div>
      <div className={styles.modalActions}>
        <button className={styles.actionBtn} onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

function EditGuideModal({ topicId, guide, topics, onClose, onSaved }) {
  const topic = topics.find(t => t.id === topicId);

  const [sections, setSections] = useState(
    guide?.sections?.length > 0
      ? guide.sections
      : [{ heading: "", content: "", imageUrl: "", caption: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  function addSection() {
    setSections(prev => [...prev, { heading: "", content: "", imageUrl: "", caption: "" }]);
  }

  function removeSection(i) {
    setSections(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateSection(i, field, value) {
    setSections(prev => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      return updated;
    });
  }

  function moveSection(i, direction) {
    setSections(prev => {
      const updated = [...prev];
      const swapIdx = direction === "up" ? i - 1 : i + 1;
      if (swapIdx < 0 || swapIdx >= updated.length) return prev;
      [updated[i], updated[swapIdx]] = [updated[swapIdx], updated[i]];
      return updated;
    });
  }

  async function handleImageUpload(i, file) {
    if (!file) return;

    updateSection(i, "uploadProgress", 0);
    updateSection(i, "imageUrl", "");

    const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;   // name top left
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET; //preset name

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("cloud_name", CLOUD_NAME);

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            updateSection(i, "uploadProgress", percent);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            updateSection(i, "imageUrl", data.secure_url);
            updateSection(i, "uploadProgress", null);
            resolve();
          } else {
            reject(new Error("Upload failed"));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error")));

        xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
        xhr.send(formData);
      });

    } catch (err) {
      console.error("Upload failed:", err);
      updateSection(i, "uploadProgress", null);
      alert("Image upload failed. Try again.");
    }
  }

  async function handleSave() {
    const filled = sections.filter(s => s.heading.trim() || s.content.trim());
    if (filled.length === 0) {
      setError("At least one section with a heading or content is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSaved(topicId, { sections: filled });
    } catch (err) {
      console.error(err);
      setError("Failed to save. Try again.");
      setSaving(false);
    }
  }

  return (
    <Modal
      title={guide ? `Edit Guide — ${topic?.title || topicId}` : `Create Guide — ${topic?.title || topicId}`}
      onClose={onClose}
    >
      <div className={styles.modalFields}>
        {sections.map((section, i) => (
          <div key={i} className={styles.sectionEditor}>

            <div className={styles.sectionEditorHeader}>
              <span className={styles.sectionEditorNum}>Section {i + 1}</span>
              <div className={styles.sectionEditorControls}>
                <button
                  className={styles.iconBtn}
                  onClick={() => moveSection(i, "up")}
                  disabled={i === 0}
                  title="Move up"
                >↑</button>
                <button
                  className={styles.iconBtn}
                  onClick={() => moveSection(i, "down")}
                  disabled={i === sections.length - 1}
                  title="Move down"
                >↓</button>
                <button
                  className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                  onClick={() => removeSection(i)}
                  disabled={sections.length === 1}
                  title="Remove section"
                >✕</button>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Heading</label>
              <input
                className={styles.input}
                value={section.heading}
                onChange={e => updateSection(i, "heading", e.target.value)}
                placeholder="e.g. What is a Function?"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Content</label>
              <textarea
                className={styles.input}
                value={section.content}
                onChange={e => updateSection(i, "content", e.target.value)}
                placeholder="Write the guide content for this section..."
                rows={4}
                style={{ resize: "vertical" }}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Image <span className={styles.optional}>(optional)</span>
              </label>

              <input
                type="file"
                accept="image/*"
                className={styles.fileInput}
                onChange={e => handleImageUpload(i, e.target.files[0])}
              />

              {section.uploadProgress != null && (
                <div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${section.uploadProgress}%` }}
                    />
                  </div>
                  <span className={styles.progressText}>
                    {section.uploadProgress < 100
                      ? `Uploading... ${section.uploadProgress}%`
                      : "Processing..."}
                  </span>
                </div>
              )}

              {section.imageUrl && section.uploadProgress == null && (
                <div className={styles.imagePreviewWrap}>
                  <img
                    src={section.imageUrl}
                    alt="preview"
                    className={styles.imagePreview}
                  />
                  <button
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    onClick={() => {
                      updateSection(i, "imageUrl", "");
                      updateSection(i, "caption", "");
                    }}
                    title="Remove image"
                  >✕</button>
                </div>
              )}
            </div>

            {section.imageUrl && section.uploadProgress == null && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Caption <span className={styles.optional}>(optional)</span>
                </label>
                <input
                  className={styles.input}
                  value={section.caption || ""}
                  onChange={e => updateSection(i, "caption", e.target.value)}
                  placeholder="e.g. The picture above shows a parabola..."
                />
              </div>
            )}
          </div>
        ))}

        <button className={styles.addSectionBtn} onClick={addSection}>
          + Add Section
        </button>
      </div>

      {error && <p className={styles.modalError}>{error}</p>}

      <div className={styles.modalActions}>
        <button className={styles.rowBtn} onClick={onClose}>Cancel</button>
        <button className={styles.actionBtn} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : guide ? "Save Changes" : "Create Guide"}
        </button>
      </div>
    </Modal>
  );
}