const STYLE_ID = "claude-rtl-style";
const PROCESSED_ATTR = "data-rtl-checked";
const FONT_LINK_ID = "claude-rtl-font-link";

const LATIN_RUN_REGEX = /[A-Za-z0-9][A-Za-z0-9\s.,/%()+\-:_'"]*[A-Za-z0-9)%]|[A-Za-z0-9]/g;
const LRI = "\u2066";
const PDI = "\u2069";

const RTL_CSS = `
  .claude-rtl-active {
    direction: rtl !important;
    text-align: right !important;
    unicode-bidi: isolate !important;
    font-family: 'Vazirmatn', Tahoma, sans-serif !important;
  }

  .claude-rtl-active ul,
  .claude-rtl-active ol {
    padding-right: 1.5em !important;
    padding-left: 0 !important;
  }

  .claude-rtl-active li {
    text-align: right !important;
  }

  .claude-rtl-active blockquote {
    border-right: 3px solid currentColor !important;
    border-left: none !important;
    padding-right: 1em !important;
    padding-left: 0 !important;
  }

  .claude-rtl-active table {
    direction: rtl !important;
  }

  .claude-rtl-isolate {
    unicode-bidi: isolate;
    direction: ltr;
  }

  pre, code {
    direction: ltr !important;
    text-align: left !important;
    unicode-bidi: embed !important;
    font-family: inherit !important;
  }

  .claude-rtl-input-active {
    direction: rtl !important;
    text-align: right !important;
    unicode-bidi: plaintext !important;
    font-family: 'Vazirmatn', Tahoma, sans-serif !important;
  }

  .claude-rtl-input-active p {
    direction: rtl !important;
  }

  .claude-rtl-export-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: #cc785c;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease;
    flex-shrink: 0;
  }

  .claude-rtl-export-btn:hover {
    background: rgba(204, 120, 92, 0.15);
    color: #d4976a;
  }

  .claude-rtl-export-btn svg {
    width: 20px;
    height: 20px;
  }

  #claude-rtl-export-menu {
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    min-width: 150px;
  }
`;

function isPersianDominant(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const rtlChars = (trimmed.match(/[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/g) || []).length;
  const totalLetters = (trimmed.match(/[A-Za-z\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/g) || []).length;
  if (totalLetters === 0) return false;
  return rtlChars / totalLetters > 0.3;
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = RTL_CSS;
  document.head.appendChild(style);
}

function removeStyle() {
  const el = document.getElementById(STYLE_ID);
  if (el) el.remove();
}

function injectFont() {
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap";
  document.head.appendChild(link);
}

function removeFont() {
  const el = document.getElementById(FONT_LINK_ID);
  if (el) el.remove();
}

function isolateLatinRuns(el) {
  if (el.closest("pre, code")) return;

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (node.parentElement && node.parentElement.closest("pre, code")) {
        return NodeFilter.FILTER_REJECT;
      }
      return LATIN_RUN_REGEX.test(node.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);

  textNodes.forEach((textNode) => {
    const original = textNode.textContent;
    LATIN_RUN_REGEX.lastIndex = 0;
    if (!LATIN_RUN_REGEX.test(original)) return;

    LATIN_RUN_REGEX.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = LATIN_RUN_REGEX.exec(original)) !== null) {
      if (match.index > lastIndex) {
        frag.appendChild(document.createTextNode(original.slice(lastIndex, match.index)));
      }
      frag.appendChild(document.createTextNode(LRI + match[0] + PDI));
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < original.length) {
      frag.appendChild(document.createTextNode(original.slice(lastIndex)));
    }

    textNode.parentNode.replaceChild(frag, textNode);
  });
}

const TARGET_SELECTOR = [
  "p.font-claude-response-body",
  "h1.font-claude-response-body",
  "h2.font-claude-response-body",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "td",
  "th",
  "blockquote",
  ".font-claude-response-body",
  ".font-user-message",
].join(", ");

function processElement(el) {
  if (el.hasAttribute(PROCESSED_ATTR)) return;
  if (el.closest("pre, code")) return;

  const text = el.textContent || "";
  if (isPersianDominant(text)) {
    el.classList.add("claude-rtl-active");
    isolateLatinRuns(el);
  }
  el.setAttribute(PROCESSED_ATTR, "1");
}

function scanAll(root = document.body) {
  if (!root) return;
  root.querySelectorAll(TARGET_SELECTOR).forEach(processElement);
}

function clearAllRTL() {
  document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach((el) => el.removeAttribute(PROCESSED_ATTR));
  document.querySelectorAll(".claude-rtl-active").forEach((el) => el.classList.remove("claude-rtl-active"));
}

const INPUT_SELECTOR = 'div.tiptap.ProseMirror[contenteditable="true"][data-testid="chat-input"]';

function processInputElement(el) {
  if (el.dataset.rtlInputBound === "1") return;
  el.dataset.rtlInputBound = "1";

  const checkAndApply = () => {
    const text = el.textContent || "";
    if (!text.trim()) {
      el.classList.remove("claude-rtl-input-active");
      return;
    }
    if (isPersianDominant(text)) {
      el.classList.add("claude-rtl-input-active");
    } else {
      el.classList.remove("claude-rtl-input-active");
    }
  };

  el.addEventListener("input", checkAndApply);
  el.addEventListener("focus", checkAndApply);
  checkAndApply();
}

function scanInputs(root = document.body) {
  if (!root) return;
  root.querySelectorAll(INPUT_SELECTOR).forEach(processInputElement);
  if (root.matches && root.matches(INPUT_SELECTOR)) {
    processInputElement(root);
  }
}

function clearInputRTL() {
  document.querySelectorAll(`[data-rtl-input-bound]`).forEach((el) => {
    el.removeAttribute("data-rtl-input-bound");
    el.classList.remove("claude-rtl-input-active");
  });
}

const ACTION_BAR_SELECTOR = '[data-message-action-bar] [role="toolbar"]';

function findMessageContainer(toolbarEl) {
  const messageWrapper = toolbarEl.closest("[data-message-action-bar]")?.parentElement;
  if (!messageWrapper) return null;
  return messageWrapper.parentElement || messageWrapper;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// پردازش فقط nodeهایی که واقعاً تغییر کردن، نه کل document
function processAddedNode(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  // اگه خودش match می‌کنه
  if (node.matches(TARGET_SELECTOR)) processElement(node);
  // فرزنداشو هم چک کن
  node.querySelectorAll(TARGET_SELECTOR).forEach(processElement);
  // اینپوت
  if (node.matches(INPUT_SELECTOR)) processInputElement(node);
  node.querySelectorAll(INPUT_SELECTOR).forEach(processInputElement);
  // action bar
  node.querySelectorAll(ACTION_BAR_SELECTOR).forEach(createExportButton);
  if (node.matches(ACTION_BAR_SELECTOR)) createExportButton(node);
}

const debouncedCharacterDataHandler = debounce((parentEl) => {
  if (!parentEl || !parentEl.isConnected) return;
  parentEl.removeAttribute(PROCESSED_ATTR);
  if (parentEl.matches(TARGET_SELECTOR)) processElement(parentEl);
}, 1000);

const debouncedScanAll = debounce(() => {
  scanAll();
  scanActionBars();
}, 500);

function exportIconSVG() {
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function createExportButton(toolbarEl) {
  if (toolbarEl.querySelector(".claude-rtl-export-btn")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "claude-rtl-export-btn";
  btn.title = "خروجی فارسی (RTL)";
  btn.setAttribute("aria-label", "Export with RTL formatting");
  btn.innerHTML = exportIconSVG();

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const messageEl = findMessageContainer(toolbarEl);
    if (!messageEl) return;
    showExportMenu(btn, messageEl);
  });

  toolbarEl.appendChild(btn);
}

function scanActionBars(root = document.body) {
  if (!root) return;
  root.querySelectorAll(ACTION_BAR_SELECTOR).forEach((toolbar) => {
    createExportButton(toolbar);
  });
}

function showExportMenu(anchorBtn, messageEl) {
  const existing = document.getElementById("claude-rtl-export-menu");
  if (existing) existing.remove();

  const menu = document.createElement("div");
  menu.id = "claude-rtl-export-menu";
  menu.style.cssText = `
    position: absolute;
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 6px;
    z-index: 9999;
    direction: rtl;
    font-family: 'Vazirmatn', Tahoma, sans-serif;
  `;

  const mdBtn = document.createElement("div");
  mdBtn.textContent = "📄 خروجی Markdown";
  mdBtn.style.cssText =
    "padding: 6px 12px; cursor: pointer; color: #ddd; font-size: 12px; border-radius: 4px;";
  mdBtn.addEventListener("mouseenter", () => (mdBtn.style.background = "#2a2a2a"));
  mdBtn.addEventListener("mouseleave", () => (mdBtn.style.background = "transparent"));
  mdBtn.addEventListener("click", () => {
    exportAsMarkdown(messageEl);
    menu.remove();
  });

  const pdfBtn = document.createElement("div");
  pdfBtn.textContent = "🖨 خروجی PDF";
  pdfBtn.style.cssText = mdBtn.style.cssText;
  pdfBtn.addEventListener("mouseenter", () => (pdfBtn.style.background = "#2a2a2a"));
  pdfBtn.addEventListener("mouseleave", () => (pdfBtn.style.background = "transparent"));
  pdfBtn.addEventListener("click", () => {
    exportAsPDF(messageEl);
    menu.remove();
  });

  menu.appendChild(mdBtn);
  menu.appendChild(pdfBtn);

  const rect = anchorBtn.getBoundingClientRect();
  menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
  menu.style.left = `${rect.left + window.scrollX}px`;
  document.body.appendChild(menu);

  setTimeout(() => {
    document.addEventListener(
      "click",
      function closeMenu(e) {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener("click", closeMenu);
        }
      },
      { once: true },
    );
  }, 0);
}

function htmlToMarkdownRTL(el) {
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const tag = node.tagName.toLowerCase();
    const children = Array.from(node.childNodes).map(walk).join("");

    switch (tag) {
      case "h1":
        return `# ${children}\n\n`;
      case "h2":
        return `## ${children}\n\n`;
      case "h3":
        return `### ${children}\n\n`;
      case "h4":
        return `#### ${children}\n\n`;
      case "strong":
      case "b":
        return `**${children}**`;
      case "em":
      case "i":
        return `*${children}*`;
      case "code":
        return node.closest("pre") ? children : `\`${children}\``;
      case "pre":
        return `\`\`\`\n${children}\n\`\`\`\n\n`;
      case "li":
        return `- ${children}\n`;
      case "ul":
      case "ol":
        return `${children}\n`;
      case "blockquote":
        return `> ${children}\n\n`;
      case "p":
        return `${children}\n\n`;
      case "br":
        return "\n";
      case "a":
        return `[${children}](${node.href})`;
      case "button":
      case "svg":
        return "";
      default:
        return children;
    }
  }
  return Array.from(el.childNodes).map(walk).join("").trim();
}

function exportAsMarkdown(messageEl) {
  const md = htmlToMarkdownRTL(messageEl);
  const finalMd = `<!-- RTL: true -->\n\n${md}`;
  const blob = new Blob([finalMd], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, `claude-export-${Date.now()}.md`);
}

function exportAsPDF(messageEl) {
  const printWindow = window.open("", "_blank");
  const content = messageEl.cloneNode(true);
  content.querySelectorAll(".claude-rtl-export-btn, [data-message-action-bar]").forEach((b) => b.remove());

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
      <meta charset="UTF-8">
      <title>خروجی Claude</title>
      <style>
        body {
          font-family: 'Vazirmatn', Tahoma, sans-serif;
          direction: rtl;
          text-align: right;
          line-height: 1.9;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
          color: #1a1a1a;
        }
        pre, code {
          direction: ltr;
          text-align: left;
          unicode-bidi: embed;
          background: #f5f5f5;
          padding: 8px;
          border-radius: 6px;
          display: block;
          font-family: monospace;
          overflow-x: auto;
        }
        h1, h2, h3, h4 { margin-top: 1.2em; }
        ul, ol { padding-right: 1.5em; padding-left: 0; }
        blockquote {
          border-right: 3px solid #ccc;
          border-left: none;
          padding-right: 1em;
          padding-left: 0;
          color: #555;
        }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>${content.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 400);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

let observer = null;

function startObserving() {
  if (observer) return;
  observer = new MutationObserver((mutations) => {
    let hasNewNodes = false;
    let characterDataParents = new Set();

    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          processAddedNode(node);
          hasNewNodes = true;
        });
      } else if (mutation.type === "characterData") {
        // جمع‌آوری parentها برای debounce
        const parent = mutation.target.parentElement;
        if (parent) characterDataParents.add(parent);
      }
    }

    // characterData رو debounce می‌کنیم
    characterDataParents.forEach((parent) => debouncedCharacterDataHandler(parent));

    // فقط اگه node جدید اضافه شد یه scan کلی بزن (با debounce)
    if (hasNewNodes) debouncedScanAll();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    // characterDataOldValue رو حذف کردیم — لازم نداریم و هزینه داره
  });
}

function stopObserving() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

function enableRTL() {
  injectStyle();
  injectFont();
  scanAll();
  scanInputs();
  scanActionBars();
  startObserving();
}

function disableRTL() {
  removeStyle();
  removeFont();
  stopObserving();
  clearAllRTL();
  clearInputRTL();
  document.querySelectorAll(".claude-rtl-export-btn").forEach((b) => b.remove());
}

chrome.storage.local.get(["rtlEnabled"], (result) => {
  if (result.rtlEnabled) enableRTL();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "toggleRTL") {
    msg.enabled ? enableRTL() : disableRTL();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && "rtlEnabled" in changes) {
    changes.rtlEnabled.newValue ? enableRTL() : disableRTL();
  }
});
