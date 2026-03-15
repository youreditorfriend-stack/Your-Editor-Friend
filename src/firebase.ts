import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBqgmzrNelS701uQ1ngLvcoatUkcBuiRic",
  authDomain: "gen-lang-client-0681082317.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0681082317-default-rtdb.firebaseio.com",
  projectId: "gen-lang-client-0681082317",
  storageBucket: "gen-lang-client-0681082317.firebasestorage.app",
  messagingSenderId: "834918791822",
  appId: "1:834918791822:web:ef4b1dc9724967ab64a7df",
  measurementId: "G-4JWYMJ8NCZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
