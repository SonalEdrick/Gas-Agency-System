// Smooth Scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});

// Dropdown Toggle on Click
const loginBtn = document.getElementById('loginBtn');
const loginDropdown = document.getElementById('loginDropdown');

loginBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // Prevent closing immediately
  loginDropdown.classList.toggle('show');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!loginDropdown.contains(e.target) && !loginBtn.contains(e.target)) {
    loginDropdown.classList.remove('show');
  }
});
