/* ==========================================
   Shortlink — Home page logic
   ========================================== */

(function () {
  const form = document.getElementById("shorten-form");
  const input = document.getElementById("url-input");
  const btn = document.getElementById("shorten-btn");

  if (!form) return;

  // Show a toast notification
  function showToast(message) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
  }

  // Validate URL
  function isValidUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  // Generate a short code (simulated)
  function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const raw = input.value.trim();

    if (!raw) {
      input.focus();
      return;
    }

    if (!isValidUrl(raw)) {
      showToast("Please enter a valid URL (http:// or https://)");
      input.focus();
      return;
    }

    // Loading state
    const originalText = btn.textContent;
    btn.textContent = "Shortening…";
    btn.disabled = true;

    // Simulate network delay
    setTimeout(() => {
      const code = generateCode();
      const shortUrl = window.location.origin + "/r/" + code;

      // Store the destination so the go page can read it
      try {
        localStorage.setItem("shortlink:" + code, raw);
      } catch (err) {
        // localStorage may be disabled — proceed anyway
      }

      // Navigate to result page passing the code + short link
      const resultUrl = "result.html?code=" + encodeURIComponent(code) + "&url=" + encodeURIComponent(shortUrl);
      window.location.href = resultUrl;
    }, 800);
  });

  // Auto-prepend https:// if missing on blur
  input.addEventListener("blur", function () {
    const val = this.value.trim();
    if (val && !/^https?:\/\//i.test(val)) {
      this.value = "https://" + val;
    }
  });
})();
