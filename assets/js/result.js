/* ==========================================
   Shortlink — Result page logic (static)
   Shows the shortened link with copy button.
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
  const shortUrl = params.get("url");

  linkInput.value = shortUrl || window.location.origin + "/go.html?code=" + code;

  copyBtn.addEventListener("click", function () {
    const text = linkInput.value;
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);

    try {
      navigator.clipboard.writeText(text).then(function () {
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
      document.execCommand("copy");
      showToast("Short link copied to clipboard");
    }
  });

  newBtn.addEventListener("click", function () {
    window.location.href = "index.html";
  });
})();
