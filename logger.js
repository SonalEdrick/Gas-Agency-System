// logger.js
import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/**
 * Logs a system event to Firestore under the 'logs' collection.
 * @param {string|null} userId - The UID of the actor (admin or customer)
 * @param {string} userType - 'admin' or 'customer'
 * @param {string} action - Short code like 'BOOKING_CREATED' or 'PROFILE_UPDATED'
 * @param {string} message - Human readable description
 */
export async function logEvent(userId, userType, action, message) {
  try {
    await addDoc(collection(db, "logs"), {
      userId: userId || "unknown",
      userType,
      action,
      message,
      timestamp: serverTimestamp()
    });
    console.log(`📘 Log added: [${action}] ${message}`);
  } catch (err) {
    console.error("⚠️ Logging error:", err);
  }
}
