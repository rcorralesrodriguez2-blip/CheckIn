// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "checkin-c0lb6",
  appId: "1:531754091508:web:c67372784757d123c66fa1",
  storageBucket: "checkin-c0lb6.appspot.com",
  apiKey: "AIzaSyCYM43zcgLmqyrpkrvNp4-GFCs4UI4EdEA",
  authDomain: "checkin-c0lb6.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "531754091508",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
