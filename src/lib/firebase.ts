
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCu0K7Y_nVC5Jol7FY_Iv8Q9XSUSr3AhIg",
  authDomain: "exp-track-3af56.firebaseapp.com",
  projectId: "exp-track-3af56",
  storageBucket: "exp-track-3af56.firebasestorage.app",
  messagingSenderId: "329294187672",
  appId: "1:329294187672:web:7c5ae9dbe0a845e97b54ed"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to emulators in development
if (import.meta.env.DEV) {
  // Uncomment these lines to use Firebase emulators during development
  // connectAuthEmulator(auth, 'http://localhost:9099');
  // connectFirestoreEmulator(db, 'localhost', 8080);
}

export default app;
