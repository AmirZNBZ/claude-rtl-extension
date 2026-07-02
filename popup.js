const btn = document.getElementById("toggleBtn");
const btnIcon = document.getElementById("btnIcon");
const btnText = document.getElementById("btnText");
const badge = document.getElementById("statusBadge");
const hint = document.getElementById("hintText");

chrome.storage.local.get(["rtlEnabled"], (result) => {
  setUI(!!result.rtlEnabled);
});

btn.addEventListener("click", () => {
  chrome.storage.local.get(["rtlEnabled"], (result) => {
    const newState = !result.rtlEnabled;
    chrome.storage.local.set({ rtlEnabled: newState }, () => {
      setUI(newState);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "toggleRTL", enabled: newState },
          () => void chrome.runtime.lastError,
        );
      });
    });
  });
});

function setUI(enabled) {
  if (enabled) {
    btn.className = "toggle-btn on";
    btnIcon.textContent = "↲";
    btnText.textContent = "غیرفعال‌سازی";
    badge.className = "status-badge on";
    badge.textContent = "فعال";
    hint.className = "hint active";
    hint.innerHTML = "متن‌های فارسی اکنون<br/>راست‌چین هستند ✓";

    btn.classList.add("pulse");
    setTimeout(() => btn.classList.remove("pulse"), 700);
  } else {
    btn.className = "toggle-btn off";
    btnIcon.textContent = "↰";
    btnText.textContent = "فعال‌سازی RTL";
    badge.className = "status-badge off";
    badge.textContent = "غیرفعال";
    hint.className = "hint";
    hint.innerHTML = "دکمه را فشار دهید تا متن‌های فارسی<br/>راست‌چین شوند";
  }
}
