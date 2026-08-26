import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, firebaseConfigured } from "./firebase";

function requireFirebaseAuth() {
  if (!firebaseConfigured || !auth) {
    throw new Error(
      "Firebase is not configured. Create client/.env from client/.env.example."
    );
  }
  return auth;
}

export function doSignInWithEmailAndPassword(email, password) {
  return signInWithEmailAndPassword(requireFirebaseAuth(), email, password);
}

export function doSignOut() {
  return signOut(requireFirebaseAuth());
}

export function doCreateUserWithEmailAndPassword(email, password) {
  return createUserWithEmailAndPassword(requireFirebaseAuth(), email, password);
}

export function doPasswordReset(email) {
  return sendPasswordResetEmail(requireFirebaseAuth(), email);
}
