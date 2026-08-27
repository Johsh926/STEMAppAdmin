import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Firebase configuration is intentionally read from Vite environment variables.
 * Do NOT hard-code private credentials in source control.
 *
 * Create a client/.env file from client/.env.example and fill in the values
 * from Firebase Console → Project settings → Your apps → Web app.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredFirebaseKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "messagingSenderId",
  "appId",
];

export const firebaseConfigured = requiredFirebaseKeys.every(
  (key) =>
    typeof firebaseConfig[key] === "string" &&
    firebaseConfig[key].trim().length > 0
);

let app = null;
let auth = null;
let db = null;

if (firebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  // Keep the React app renderable when the .env file is missing.
  // Previously getAuth() received an undefined API key and crashed the
  // entire application before React could render anything.
  console.error(
    "[Firebase] Configuration is missing. Create client/.env from client/.env.example."
  );
}

export { firebaseConfig, app, auth, db };
