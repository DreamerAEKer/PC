import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD6ZRCv-moEnSlcl7TzVAbhBWe7rcWFANg",
  authDomain: "pcgpo-5385d.firebaseapp.com",
  projectId: "pcgpo-5385d",
  storageBucket: "pcgpo-5385d.firebasestorage.app",
  messagingSenderId: "710049341329",
  appId: "1:710049341329:web:47c984c4b19751f0c94430",
  measurementId: "G-1NB65MTL81"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
