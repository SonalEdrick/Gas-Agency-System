import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const loginForm = document.getElementById("adminLoginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value.trim();

  try {
    // Login with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check if user is admin
    const adminRef = doc(db, "admins", user.uid);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists()) {
      message.textContent = "Access denied. Not an admin account.";
      message.className = "message error";
      return;
    }

    message.textContent = "Login successful! Redirecting...";
    message.className = "message success";

    setTimeout(() => {
      window.location.href = "admin-dashboard.html";
    }, 1500);

  } catch (error) {
    message.textContent = error.message;
    message.className = "message error";
  }
});
