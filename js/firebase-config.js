import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCmwzIgserr8kzsvCBp0NI4K3GZ76NsCDI",
    authDomain: "ambulatoriok-ad71a.firebaseapp.com",
    projectId: "ambulatoriok-ad71a",
    storageBucket: "ambulatoriok-ad71a.appspot.com",
    messagingSenderId: "1076926719183",
    appId: "1:1076926719183:web:13cb27548bcd163092c3ba",
    measurementId: "G-26X2MSV2RE"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export const unitsRef = collection(db, "units");
export const specialtiesRef = collection(db, "specialties");
export const professionalsRef = collection(db, "professionals");
export const scheduleRef = collection(db, "schedule");
export { db };