import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyBPg9qE-VMkjQmNLu7haNiuD3IeLscIWzI",
    authDomain: "seche10semaines.firebaseapp.com",
    projectId: "seche10semaines",
    storageBucket: "seche10semaines.firebasestorage.app",
    messagingSenderId: "179899198196",
    appId: "1:179899198196:web:9ab82351b21f691c724ca1",
    measurementId: "G-ZDSKMWFQDY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();