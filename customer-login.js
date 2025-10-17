import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");
const formTitle = document.getElementById("formTitle");
const message = document.getElementById("message");

// 🔁 Switch forms
showRegister.addEventListener("click", e => {
  e.preventDefault();
  loginForm.style.display = "none";
  registerForm.style.display = "block";
  formTitle.textContent = "Customer Registration";
  message.textContent = "";
});

showLogin.addEventListener("click", e => {
  e.preventDefault();
  registerForm.style.display = "none";
  loginForm.style.display = "block";
  formTitle.textContent = "Customer Login";
  message.textContent = "";
});

// 🟢 Register
registerForm.addEventListener("submit", async e => {
  e.preventDefault();
  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value.trim();
  const address = document.getElementById("registerAddress").value.trim();
  const phone = document.getElementById("registerPhone").value.trim();

  if (password.length < 6) {
    message.textContent = "Password must be at least 6 characters.";
    message.className = "message error";
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "customers", user.uid), {
      name,
      email,
      address,
      phone,
      quota: 12,
      createdAt: new Date().toISOString()
    });

    message.textContent = "Registration successful! Redirecting...";
    message.className = "message success";

    setTimeout(() => {
      window.location.href = "customer-dashboard.html";
    }, 1500);

  } catch (error) {
    message.textContent = error.message;
    message.className = "message error";
    console.error("Registration error:", error);
  }
});

// 🔵 Login
loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const docRef = doc(db, "customers", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      message.textContent = "Login successful! Redirecting...";
      message.className = "message success";

      setTimeout(() => {
        window.location.href = "customer-dashboard.html";
      }, 1500);
    } else {
      message.textContent = "No customer record found.";
      message.className = "message error";
    }

  } catch (error) {
    message.textContent = error.message;
    message.className = "message error";
    console.error("Login error:", error);
  }
});
