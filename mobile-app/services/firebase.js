import { initializeApp, getApps } from "firebase/app";
import { initializeAuth, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration from environment variables
 // For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBxF_T2QHfek8sPBPpO4zIs07tAM_sbc8o",
  authDomain: "ai-hma.firebaseapp.com",
  projectId: "ai-hma",
  storageBucket: "ai-hma.firebasestorage.app",
  messagingSenderId: "792016276355",
  appId: "1:792016276355:web:9575581d02be004c64c4b6",
  measurementId: "G-LVVEMQHCGK"
};

// Check if Firebase is properly configured
const isConfigured = 
  firebaseConfig.apiKey && 
  !firebaseConfig.apiKey.includes("Demo") && 
  !firebaseConfig.apiKey.includes("your-") &&
  firebaseConfig.apiKey.length > 30;

if (!isConfigured) {
  console.warn("Firebase not properly configured");
  console.warn("Get your config from: https://console.firebase.google.com");
}

let app, auth, db, storage;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  
  // inMemoryPersistence works on both web and native in firebase v12
  auth = initializeAuth(app, {
    persistence: inMemoryPersistence,
  });
  
  db = getFirestore(app);
  storage = getStorage(app);
  
  if (isConfigured) {
    console.log("Firebase initialized successfully");
  }
} catch (error) {
  console.error("Firebase initialization error:", error.message);
  console.warn("App will run with limited functionality");
  console.warn("Please configure Firebase properly");
}

export { auth, db, storage };
export default app;
