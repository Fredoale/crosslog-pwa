// ============================================
// FIREBASE CONFIGURATION
// ============================================

import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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

// Initialize Firestore con persistencia offline (IndexedDB)
// Permite que los datos GPS y OTs se guarden localmente y se sincronicen cuando vuelve la conexión
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(), // Soporte multi-pestaña
  }),
});

// Initialize Storage (for photos)
export const storage = getStorage(app);

console.log('[Firebase] Inicializado correctamente');
