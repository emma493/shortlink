// ==========================================
// Shortlink Admin — Firebase config
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";
import {
  getFirestore,
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAputCCZMgOfasMU2Giu5T2g7KbfVgoNWE",
  authDomain: "shortlink-data.firebaseapp.com",
  projectId: "shortlink-data",
  storageBucket: "shortlink-data.firebasestorage.app",
  messagingSenderId: "849022292465",
  appId: "1:849022292465:web:a3d9aa96a3b61612997450",
  measurementId: "G-2XB3D0RP13"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);

// Firestore helpers
export { doc, getDoc, onSnapshot, collection, query, orderBy, limit, getDocs };

// Reference to the stats document in Firestore (legacy, kept for compat)
export const STATS_DOC = doc(db, "stats", "overview");

// Collection for page view events (written by track.js on every page load)
export const PAGE_VIEWS_COLLECTION = collection(db, "page_views");
