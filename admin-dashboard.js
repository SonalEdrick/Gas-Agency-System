import { auth, db } from "./firebase.js";
import { logEvent } from "./logger.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const ADMIN_EMAIL = "sonalveigas2004@gmail.com"; // also a receiver for new bookings (if needed)

const logoutBtn = document.getElementById("logoutBtn");
const totalCustomers = document.getElementById("totalCustomers");
const totalBookings = document.getElementById("totalBookings");
const pendingBookings = document.getElementById("pendingBookings");
const bookingsTable = document.getElementById("bookingsTable");
const noticeForm = document.getElementById("noticeForm");
const noticeMessage = document.getElementById("noticeMessage");
const noticeList = document.getElementById("noticeList");
const noticeTarget = document.getElementById("noticeTarget");
const customerSelect = document.getElementById("customerSelect");

let currentAdminUid = null;
let customersCache = []; // store customers list

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "admin-login.html";
    return;
  }

  const adminRef = doc(db, "admins", user.uid);
  const adminSnap = await getDoc(adminRef);
  if (!adminSnap.exists()) {
    alert("Access denied: Not an admin account.");
    await signOut(auth);
    window.location.href = "index.html";
    return;
  }

  currentAdminUid = user.uid;
  noticeTarget.addEventListener("change", toggleCustomerSelect);

  await loadDashboard();
  await loadCustomers(); // preload customers for dropdown
});

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
    console.warn("Email send failed:", err);
  }
}

// --------------------
// Toggle customer select
// --------------------
function toggleCustomerSelect() {
  customerSelect.style.display = noticeTarget.value === "specific" ? "block" : "none";
}

// --------------------
// Load Customers for dropdown
// --------------------
async function loadCustomers() {
  try {
    const snapshot = await getDocs(collection(db, "customers"));
    if (snapshot.empty) return;
    customersCache = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }));

    customerSelect.innerHTML = '<option value="">Select a customer...</option>';
    customersCache.forEach((c) => {
      const option = document.createElement("option");
      option.value = c.uid;
      option.textContent = `${c.name || "Unnamed"} (${c.email || "No Email"})`;
      customerSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Error loading customers:", err);
  }
}

// --------------------
// Load Dashboard Stats
// --------------------
async function loadDashboard() {
  try {
    const customersSnap = await getDocs(collection(db, "customers"));
    totalCustomers.textContent = customersSnap.size;

    const bookingsSnap = await getDocs(collection(db, "bookings"));
    totalBookings.textContent = bookingsSnap.size;
    const pending = bookingsSnap.docs.filter((b) => b.data().status === "Pending Approval").length;
    pendingBookings.textContent = pending;

    await loadBookings();
    await loadNotices();
  } catch (err) {
    console.error("Error loading dashboard:", err);
  }
}

// --------------------
// Load Bookings
// --------------------
async function loadBookings() {
  bookingsTable.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";

  try {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      bookingsTable.innerHTML = "<tr><td colspan='5'>No bookings found.</td></tr>";
      return;
    }

    bookingsTable.innerHTML = "";
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.email ?? data.userId}</td>
        <td>${data.payment ?? "-"}</td>
        <td>${data.status ?? "-"}</td>
        <td>
          ${
            data.status === "Pending Approval"
              ? `<button class="btn approve" data-id="${docSnap.id}">Approve</button>
                 <button class="btn reject" data-id="${docSnap.id}">Reject</button>`
              : "-"
          }
        </td>
      `;
      bookingsTable.appendChild(tr);
    }

    document.querySelectorAll(".approve").forEach((btn) =>
      btn.addEventListener("click", () => updateBookingStatus(btn.dataset.id, "Approved"))
    );
    document.querySelectorAll(".reject").forEach((btn) =>
      btn.addEventListener("click", () => updateBookingStatus(btn.dataset.id, "Rejected"))
    );
  } catch (err) {
    console.error("Error loading bookings:", err);
  }
}

// --------------------
// Update Booking Status
// --------------------
async function updateBookingStatus(bookingId, newStatus) {
  try {
    const bookingRef = doc(db, "bookings", bookingId);
    await runTransaction(db, async (tx) => {
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists()) throw new Error("Booking not found.");
      tx.update(bookingRef, {
        status: newStatus,
        reviewedAt: serverTimestamp(),
        reviewedBy: currentAdminUid,
      });
    });

    // after transaction, fetch booking to get latest data (email, userId)
    try {
      const bookingSnap = await getDoc(doc(db, "bookings", bookingId));
      if (bookingSnap.exists()) {
        const b = bookingSnap.data();
        // notify customer by email
        const custEmail = b.email;
        const subject = newStatus === "Approved" ? "Your gas booking is approved" : "Your gas booking was rejected";
        const message = `Hello,\n\nYour booking (ID: ${bookingId}) status has been updated to: ${newStatus}.\n\nRegards,\nGas Agency System`;
        if (custEmail) await sendEmail(custEmail, subject, message);
      }
    } catch (err) {
      console.warn("Failed to send booking-status email:", err);
    }

    await logEvent(currentAdminUid, "admin", "BOOKING_" + newStatus, `Admin ${newStatus.toLowerCase()} a booking.`);
    await loadDashboard();
  } catch (err) {
    console.error("Error updating booking:", err);
  }
}

// --------------------
// Post Notice (with dropdown)
// --------------------
noticeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = noticeMessage.value.trim();
  if (!msg) return;

  const targetType = noticeTarget.value;
  const selectedCustomerId = customerSelect.value;

  if (targetType === "specific" && !selectedCustomerId) {
    alert("Please select a customer for specific notice.");
    return;
  }

  try {
    const payload = {
      message: msg,
      createdAt: serverTimestamp(),
      postedBy: currentAdminUid,
      targetType,
    };
    if (targetType === "specific") payload.targetUserId = selectedCustomerId;

    const newDoc = await addDoc(collection(db, "notices"), payload);
    await logEvent(currentAdminUid, "admin", "NOTICE_POSTED", `Admin posted a ${targetType} notice.`);

    // if specific, send email to that customer
    if (targetType === "specific") {
      try {
        const custSnap = await getDoc(doc(db, "customers", selectedCustomerId));
        if (custSnap.exists()) {
          const cust = custSnap.data();
          const custEmail = cust.email;
          if (custEmail) {
            const subject = "New Notice from Gas Agency";
            const message = `Hello ${cust.name || ""},\n\n${msg}\n\nRegards,\nGas Agency System`;
            await sendEmail(custEmail, subject, message);
          }
        }
      } catch (err) {
        console.warn("Failed to send notice email to specific customer:", err);
      }
    }

    noticeMessage.value = "";
    customerSelect.value = "";
    noticeTarget.value = "global";
    toggleCustomerSelect();
    await loadNotices();
  } catch (err) {
    console.error("Error posting notice:", err);
  }
});

// --------------------
// Load Notices
// --------------------
async function loadNotices() {
  try {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      noticeList.innerHTML = "<li>No notices yet.</li>";
      return;
    }
    noticeList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const targetInfo =
        data.targetType === "global"
          ? " (Global)"
          : ` (Specific: ${data.targetUserId ?? "—"})`;
      const li = document.createElement("li");
      li.textContent = `${data.message}${targetInfo}`;
      noticeList.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading notices:", err);
  }
}

// --------------------
// Logout
// --------------------
logoutBtn.addEventListener("click", async () => {
  try {
    await logEvent(currentAdminUid, "admin", "LOGOUT", "Admin logged out.");
    await signOut(auth);
    window.location.href = "index.html";
  } catch (err) {
    console.error("Logout error:", err);
  }
});
