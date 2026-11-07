/* ==========================================
   Shortlink — Result page logic
   ========================================== */

(function () {
  const linkInput = document.getElementById("short-link");
  const copyBtn = document.getElementById("copy-btn");
  const newBtn = document.getElementById("new-shorten-btn");

  if (!linkInput) return;

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

  // Parse query params
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const shortUrl = params.get("url") || window.location.origin + "/r/" + code;

  linkInput.value = shortUrl;

  copyBtn.addEventListener("click", function () {
    linkInput.select();
    linkInput.setSelectionRange(0, 99999); // mobile support

    try {
      navigator.clipboard.writeText(shortUrl).then(function () {
        const original = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        copyBtn.classList.add("btn-outline");
        copyBtn.classList.remove("btn-primary");

        showToast("Short link copied to clipboard");

        setTimeout(() => {
          copyBtn.textContent = original;
          copyBtn.classList.remove("btn-outline");
          copyBtn.classList.add("btn-primary");
        }, 1500);
      });
    } catch (err) {
      // Fallback for older browsers
      document.execCommand("copy");
      showToast("Short link copied to clipboard");
    }
  });

  newBtn.addEventListener("click", function () {
    window.location.href = "index.html";
  });
})();
