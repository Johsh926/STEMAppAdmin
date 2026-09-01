import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebase";

export function doSignInWithEmailAndPassword(email, password){
  return signInWithEmailAndPassword(auth, email, password);
}

export function doSignOut(){
  return signOut(auth);
}

export function doCreateUserWithEmailAndPassword(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function doPasswordReset(email) {
  return sendPasswordResetEmail(auth, email);
}