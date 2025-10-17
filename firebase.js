// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ⚠️ Replace these with your Firebase project config
const firebaseConfig = {
    apiKey: "AIzaSyATBUSBDbQ3Hyp-1LdWvnKK_aiQo-RDKnw",
    authDomain: "gas-agency-cc9af.firebaseapp.com",
    projectId: "gas-agency-cc9af",
    storageBucket: "gas-agency-cc9af.firebasestorage.app",
    messagingSenderId: "257400770727",
    appId: "1:257400770727:web:8fcdf3cdceddca151e0b82",
    measurementId: "G-9JR8FFKSM7"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
