/* ==========================================
   Shortlink — Home page logic (static)
   Generates a short code, stores it in localStorage,
   then navigates to the result page.
   ========================================== */

(function () {
  const form = document.getElementById("shorten-form");
  const input = document.getElementById("url-input");
  const btn = document.getElementById("shorten-btn");

  if (!form) return;

  // Show a toast notification
  function showToast(message, type = "info") {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = "toast show";
    if (type === "error") toast.style.background = "#dc2626";
    else toast.style.background = "#0f172a";
    setTimeout(() => toast.classList.remove("show"), 3000);
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

  // Generate a 6-char short code
  function generateCode() {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
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
      showToast("Please enter a valid URL (http:// or https://)", "error");
      input.focus();
      return;
    }

    // Normalize URL
    let longUrl = raw;
    if (!/^https?:\/\//i.test(longUrl)) {
      longUrl = "https://" + longUrl;
    }

    // Generate a unique code
    let code;
    do {
      code = generateCode();
    } while (localStorage.getItem("sl:" + code));

    // Save the mapping in localStorage
    try {
      localStorage.setItem("sl:" + code, longUrl);
    } catch (err) {
      showToast("Storage unavailable — try clearing site data.", "error");
      btn.textContent = "Shorten";
      btn.disabled = false;
      return;
    }

    // Build the short link (static: go.html?code=ABC)
    const shortUrl = window.location.origin + window.location.pathname.replace(
      /[^\/]*$/,
      ""
    ) + "go.html?code=" + code;

    // Navigate to result page with code + short link
    const resultUrl =
      "result.html?code=" +
      encodeURIComponent(code) +
      "&url=" +
      encodeURIComponent(shortUrl);
    window.location.href = resultUrl;
  });

  // Auto-prepend https:// if missing on blur
  input.addEventListener("blur", function () {
    const val = this.value.trim();
    if (val && !/^https?:\/\//i.test(val)) {
      this.value = "https://" + val;
    }
  });
})();
