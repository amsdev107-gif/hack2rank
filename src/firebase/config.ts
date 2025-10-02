import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAn1j4uVKPv-qkKEg-ukTP6KQc-WVO4k9s",
  authDomain: "hack2rank-101.firebaseapp.com",
  projectId: "hack2rank-101",
  databaseURL: "https://hack2rank-101-default-rtdb.asia-southeast1.firebasedatabase.app/",
  storageBucket: "hack2rank-101.firebasestorage.app",
  messagingSenderId: "93312880352",
  appId: "1:93312880352:web:f378b10bb634cfa9a18a85",
  measurementId: "G-772B4NFZG1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const realtimeDb = getDatabase(app);

// Enable offline persistence and handle connection issues
try {
  // Enable network for Firestore
  enableNetwork(db).catch((error) => {
    console.warn('Failed to enable Firestore network:', error);
  });
} catch (error) {
  console.warn('Firestore network setup error:', error);
}

// Add connection state monitoring
export const checkFirestoreConnection = async () => {
  try {
    await enableNetwork(db);
    return true;
  } catch (error) {
    console.warn('Firestore connection check failed:', error);
    return false;
  }
};

export default app;