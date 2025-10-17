import { auth, db } from "./firebase.js";
import { logEvent } from "./logger.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const ADMIN_EMAIL = "sonalveigas2004@gmail.com"; // admin receiver

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userQuota = document.getElementById("userQuota");
const bookingForm = document.getElementById("bookingForm");
const bookingMessage = document.getElementById("bookingMessage");
const historyBody = document.getElementById("historyBody");
const noticeList = document.getElementById("noticeList");
const logoutBtn = document.getElementById("logoutBtn");

let currentUserId = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserId = user.uid;
    await loadUserDetails(user.uid);
    await loadBookingHistory(user.uid);
    await loadNotices();
  } else {
    window.location.href = "customer-login.html";
  }
});

async function loadUserDetails(uid) {
  try {
    const docRef = doc(db, "customers", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      userName.textContent = data.name;
      userEmail.textContent = data.email;
      userQuota.textContent = data.quota ?? "--";
    }
  } catch (error) {
    console.error("Error loading user details:", error);
  }
}

// helper: call local email server (plain-text)
async function sendEmail(to, subject, message) {
  try {
    await fetch("https://api-rpokubrtsa-uc.a.run.app/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, message }),
    });
    console.log(`Email request sent to ${to} - ${subject}`);
  } catch (err) {
    // do not block main flow if email fails
    console.warn("Email send failed:", err);
  }
}

// Book a Cylinder (with log)
bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  bookingMessage.textContent = "";

  const payment = document.getElementById("paymentOption").value;
  if (!payment) {
    bookingMessage.textContent = "Please select a payment method.";
    bookingMessage.className = "message error";
    return;
  }

  try {
    const userRef = doc(db, "customers", currentUserId);
    let bookedData = null;

    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error("User record not found.");

      const userData = userSnap.data();
      if (userData.quota <= 0) throw new Error("No remaining quota for this year.");

      const bookingRef = collection(db, "bookings");
      const newBookingRef = doc(bookingRef); // new random id
      const bookingPayload = {
        userId: currentUserId,
        email: userData.email,
        payment,
        status: "Pending Approval",
        createdAt: serverTimestamp(),
      };

      transaction.set(newBookingRef, bookingPayload);
      transaction.update(userRef, { quota: userData.quota - 1 });

      // store booking data to use after transaction completes
      bookedData = { id: newBookingRef.id, payload: bookingPayload, userData };
    });

    bookingMessage.textContent = "Cylinder booked successfully!";
    bookingMessage.className = "message success";
    await logEvent(currentUserId, "customer", "BOOKING_CREATED", "Customer booked a gas cylinder.");

    // send email to admin (non-blocking)
    try {
      const subject = `New Booking: ${bookedData.userData.name || "Customer"}`;
      const message = `New booking by ${bookedData.userData.name || "Customer"} (${bookedData.userData.email || "no-email"})\n\nPayment method: ${payment}\nBooking ID: ${bookedData.id}\nStatus: Pending Approval`;
      sendEmail(ADMIN_EMAIL, subject, message);
    } catch (e) {
      console.warn("Failed to queue admin email:", e);
    }

    bookingForm.reset();
    await loadBookingHistory(currentUserId);
    await loadUserDetails(currentUserId);
  } catch (error) {
    bookingMessage.textContent = error.message;
    bookingMessage.className = "message error";
    console.error("Booking error:", error);
  }
});

// Load Booking History
async function loadBookingHistory(uid) {
  try {
    const q = query(collection(db, "bookings"), where("userId", "==", uid), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      historyBody.innerHTML = "<tr><td colspan='3'>No bookings found.</td></tr>";
      return;
    }
    historyBody.innerHTML = "";
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const date = data.createdAt?.toDate().toLocaleString() ?? "—";
      historyBody.innerHTML += `<tr><td>${date}</td><td>${data.payment}</td><td>${data.status}</td></tr>`;
    });
  } catch (error) {
    console.error("Error loading booking history:", error);
  }
}

/* // Load Notices: two queries - global + specific
async function loadNotices() {
  try {
    // Query 1: global notices
    const qGlobal = query(
      collection(db, "notices"),
      where("targetType", "==", "global"),
      orderBy("createdAt", "desc")
    );

    // Query 2: specific notices for current user
    const qSpecific = query(
      collection(db, "notices"),
      where("targetUserId", "==", currentUserId),
      orderBy("createdAt", "desc")
    );

    const [snapGlobal, snapSpecific] = await Promise.all([getDocs(qGlobal), getDocs(qSpecific)]);

    const allDocs = [];
    snapGlobal.forEach(s => allDocs.push({ id: s.id, data: s.data() }));
    snapSpecific.forEach(s => {
      // avoid duplicates if any
      if (!allDocs.find(d => d.id === s.id)) allDocs.push({ id: s.id, data: s.data() });
    });

    if (allDocs.length === 0) {
      noticeList.innerHTML = "<li>No notices yet.</li>";
      return;
    }

    // sort by createdAt desc
    allDocs.sort((a, b) => {
      const ta = a.data.createdAt ? (a.data.createdAt.seconds || 0) : 0;
      const tb = b.data.createdAt ? (b.data.createdAt.seconds || 0) : 0;
      return tb - ta;
    });

    noticeList.innerHTML = "";
    allDocs.forEach(item => {
      noticeList.innerHTML += `<li>${item.data.message}</li>`;
    });

  } catch (error) {
    console.error("Error loading notices:", error);
    noticeList.innerHTML = "<li>Error loading notices</li>";
  }
} */

// Logout (log it)
logoutBtn.addEventListener("click", async () => {
  try {
    await logEvent(currentUserId, "customer", "LOGOUT", "Customer logged out.");
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error("Logout error:", error);
  }
});

