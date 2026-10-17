import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Submit student feedback from the STEM student app.
 * Call this from a student feedback form after validating its fields.
 */
export async function submitFeedback({ studentName, studentEmail, subject, message, studentUid = null }) {
  const cleanSubject = String(subject || "").trim();
  const cleanMessage = String(message || "").trim();

  if (!cleanSubject) throw new Error("Please enter a subject.");
  if (!cleanMessage) throw new Error("Please enter a message.");
  if (cleanSubject.length > 150) throw new Error("Subject must be 150 characters or fewer.");
  if (cleanMessage.length > 3000) throw new Error("Message must be 3000 characters or fewer.");

  const feedback = {
    studentUid,
    studentName: String(studentName || "Student").trim().slice(0, 100),
    studentEmail: String(studentEmail || "").trim().slice(0, 254),
    subject: cleanSubject,
    message: cleanMessage,
    status: "Pending",
    reply: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "responses"), feedback);
  return ref.id;
}
