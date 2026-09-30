
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY ,
  authDomain: "faultlineai.firebaseapp.com",
  projectId: "faultlineai",
  storageBucket: "faultlineai.firebasestorage.app",
  messagingSenderId: "952700272915",
  appId: "1:952700272915:web:53c4c7916ca611b76c5ae6",
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export { auth, app };