import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function logAction(actor, action, details) {
  try {
    await addDoc(collection(db, "logs"), {
      actorUid:   actor?.uid   || "unknown",
      actorEmail: actor?.email || "unknown",
      actorRole:  actor?.role  || "unknown",
      action,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to write log:", err);
  }
}