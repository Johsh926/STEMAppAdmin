import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebase";

export function doSignInWithEmailAndPassword(email, password){
  return signInWithEmailAndPassword(auth, email, password);
}

export function doSignOut(){
  return signOut(auth);
}