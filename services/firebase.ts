import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// TODO: Replace the following with your app's Firebase project configuration
// IMPORTANT: Ensure "Email/Password" sign-in provider is enabled in Firebase Console > Authentication > Sign-in method
const firebaseConfig = {
  apiKey: "AIzaSyAPxf0QljbarVMVGFV86VFljkRvB6Zt3do",
  authDomain: "checkdai-3ca4e.firebaseapp.com",
  projectId: "checkdai-3ca4e",
  storageBucket: "checkdai-3ca4e.firebasestorage.app",
  messagingSenderId: "307152848636",
  appId: "1:307152848636:web:2267561b9914d8b5a3f979"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);