// ============================================
// FIREBASE CONFIGURATION
// ============================================

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCCOR8UgE6w3xgr0htvvVWm6QDynC2138s",
  authDomain: "croog-marketplace.firebaseapp.com",
  projectId: "croog-marketplace",
  storageBucket: "croog-marketplace.firebasestorage.app",
  messagingSenderId: "203275697008",
  appId: "1:203275697008:web:fd3d995d90b4a0cca7edb5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

console.log('[Firebase] Inicializado correctamente');
