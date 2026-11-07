/* ==========================================
   Shortlink — Page 1 (index.html)
   Intermediate page: "Click here to continue"
   then navigates to page-2.html
   ========================================== */

(function () {
  const btn = document.getElementById("continue-btn");

  if (!btn) return;

  let clicked = false;

  btn.addEventListener("click", function () {
    if (clicked) return;
    clicked = true;

    // Visual feedback
    const original = btn.textContent;
    btn.textContent = "Verifying…";
    btn.classList.add("btn-loading");
    btn.disabled = true;

    // Small delay to show feedback, then navigate
    setTimeout(() => {
      window.location.href = "page-2.html";
    }, 800);
  });
})();
