import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; 

const firebaseConfig = {
  apiKey: "AIzaSyDqJLa4Crijq1O0kVG_ijljOL3jAPZEsRI",
  authDomain: "ai-doubt-solver-57435.firebaseapp.com",
  projectId: "ai-doubt-solver-57435",
  storageBucket: "ai-doubt-solver-57435.firebasestorage.app",
  messagingSenderId: "733782406661",
  appId: "1:733782406661:web:6de2bafe1bd60f8b188e6c",
  measurementId: "G-7ZF95C2THL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });
export const db = getFirestore(app);