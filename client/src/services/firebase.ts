import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

// SPYCHAT Firebase Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCqoTSY67Wq5O8I2HoRdJ7A85O0vs_c6Ls",
  authDomain: "andriod-a0911.firebaseapp.com",
  databaseURL: "https://andriod-a0911-default-rtdb.firebaseio.com",
  projectId: "andriod-a0911",
  storageBucket: "andriod-a0911.firebasestorage.app",
  messagingSenderId: "235236089435",
  appId: "1:235236089435:web:e5d0a453b0ab6dbccf297e",
  measurementId: "G-RY4KWKDT6H"
};

// Initialize Firebase App
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Analytics conditionally (only supported in browser environments)
export let firebaseAnalytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      firebaseAnalytics = getAnalytics(firebaseApp);
    }
  }).catch(() => {
    // Ignore analytics unsupported environments (e.g. some native webviews)
  });
}
