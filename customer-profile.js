import { auth, db } from "./firebase.js";
import { logEvent } from "./logger.js"; // ✅ NEW
import {
  onAuthStateChanged,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const addressInput = document.getElementById("address");
const profileForm = document.getElementById("profileForm");
const passwordForm = document.getElementById("passwordForm");
const newPassword = document.getElementById("newPassword");
const message = document.getElementById("message");

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "customer-login.html";
    return;
  }
  currentUser = user;
  await loadUserProfile(user.uid);
});

async function loadUserProfile(uid) {
  try {
    const userRef = doc(db, "customers", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      nameInput.value = data.name || "";
      emailInput.value = data.email || "";
      phoneInput.value = data.phone || "";
      addressInput.value = data.address || "";
    }
  } catch (error) {
    console.error("Error loading profile:", error);
  }
}

// ✏️ Update Profile (with log)
profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const userRef = doc(db, "customers", currentUser.uid);
    await updateDoc(userRef, {
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      address: addressInput.value.trim()
    });
    await logEvent(currentUser.uid, "customer", "PROFILE_UPDATED", "Customer updated their profile.");
    message.textContent = "Profile updated successfully!";
    message.className = "message success";
  } catch (error) {
    console.error("Error updating profile:", error);
    message.textContent = "Error updating profile.";
    message.className = "message error";
  }
});

// 🔐 Change Password (with log)
passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const newPass = newPassword.value.trim();
  if (newPass.length < 6) {
    message.textContent = "Password must be at least 6 characters.";
    message.className = "message error";
    return;
  }
  try {
    await updatePassword(currentUser, newPass);
    await logEvent(currentUser.uid, "customer", "PASSWORD_CHANGED", "Customer changed their password.");
    message.textContent = "Password updated successfully!";
    message.className = "message success";
    newPassword.value = "";
  } catch (error) {
    console.error("Password update error:", error);
    message.textContent = error.message;
    message.className = "message error";
  }
});
