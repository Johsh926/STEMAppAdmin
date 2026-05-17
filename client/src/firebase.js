// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCFOU0aGo7ZabAbsZIzwxD9y0nRpTB_aUM",
  authDomain: "stem-app-c2b57.firebaseapp.com",
  projectId: "stem-app-c2b57",
  storageBucket: "stem-app-c2b57.firebasestorage.app",
  messagingSenderId: "956910296462",
  appId: "1:956910296462:web:1cde7271437d2682c0d8df",
  measurementId: "G-780VCLXV9R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export default getFirestore();