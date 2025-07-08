// content.js (Full Updated "Patient" Version)

// =======================================================================
// Main Logic - NOW WITH A ROBUST WAITING MECHANISM
// =======================================================================

function main() {
  chrome.storage.sync.get(["enabled"], (data) => {
    if (!data.enabled) return;

    // Define the selectors for all elements we absolutely need before proceeding.
    const selectors = {
      title: ".text-title-large a",
      description: 'div[data-track-load="description_content"]',
      language: 'button[aria-controls^="radix-"]',
    };

    console.log("ThinkDSA AI: Waiting for LeetCode UI elements to load...");
    waitForElements(selectors, () => {
      console.log("ThinkDSA AI: All UI elements found. Initializing.");
      modifyUI();
      addHoverStyle();
    });
  });
}

/**
 * A robust function to wait for multiple elements to be available in the DOM.
 * @param {object} selectors - An object where keys are names and values are CSS selectors.
 * @param {function} callback - The function to execute once all elements are found.
 * @param {number} timeout - The maximum time to wait in milliseconds.
 */
function waitForElements(selectors, callback, timeout = 10000) {
  const startTime = Date.now();
  const interval = setInterval(() => {
    const allFound = Object.values(selectors).every((selector) =>
      document.querySelector(selector)
    );

    if (allFound) {
      clearInterval(interval);
      callback();
    } else if (Date.now() - startTime > timeout) {
      clearInterval(interval);
      console.error(
        "ThinkDSA AI: Timed out waiting for UI elements.",
        selectors
      );
    }
  }, 200); // Check every 200ms
}

// =======================================================================
// Data Extraction Functions - WITH ADDED LOGGING FOR DEBUGGING
// =======================================================================

function getProblemTitle() {
  const titleElement = document.querySelector(".text-title-large a");
  const title = titleElement ? titleElement.innerText.trim() : "N/A";
  console.log("ThinkDSA AI Extracted Title:", title);
  return title;
}

function getProblemDescription() {
  const descriptionElement = document.querySelector(
    'div[data-track-load="description_content"]'
  );
  const description = descriptionElement
    ? descriptionElement.innerText.trim()
    : "Could not find description.";
  console.log(
    "ThinkDSA AI Extracted Description:",
    description.substring(0, 100) + "..."
  ); // Log first 100 chars
  return description;
}

function getSelectedLanguage() {
  const langButton = document.querySelector('button[aria-controls^="radix-"]');
  const language = langButton
    ? langButton.innerText.split("\n")[0].trim()
    : "N/A";
  console.log("ThinkDSA AI Extracted Language:", language);
  return language;
}

function getUserCode() {
  return Array.from(document.querySelectorAll(".view-line"))
    .map((line) => line.innerText)
    .join("\n");
}

// =======================================================================
// UI Modification and Event Handling - No major changes needed here
// =======================================================================

function modifyUI() {
  const buttonBar = document.getElementById("ide-top-btns");
  if (!buttonBar) return;

  // Hide Run/Submit buttons if they exist
  const originalRunBtn = document.querySelector(
    'button[data-e2e-locator="console-run-button"]'
  );
  if (originalRunBtn) {
    const originalBtnGroupContainer = originalRunBtn.closest(
      ".relative.flex.overflow-hidden.rounded"
    );
    if (originalBtnGroupContainer)
      originalBtnGroupContainer.style.display = "none";
  }

  const aiButton = document.createElement("button");
  aiButton.setAttribute("data-e2e-locator", "thinkdsa-ai-button");
  aiButton.textContent = "Get Hint";
  Object.assign(aiButton.style, {
    /* Styles remain the same */ backgroundColor: "#FFA116",
    color: "white",
    height: "34px",
    padding: "0 16px",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    fontFamily: "sans-serif",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s ease",
  });

  aiButton.onclick = () => handleGetHintClick(aiButton);
  buttonBar.appendChild(aiButton);

  // Clean up other UI elements
  const noteStickySvg = document.querySelector('svg[data-icon="note-sticky"]');
  if (noteStickySvg) noteStickySvg.closest("div.group.flex")?.remove();
  const shortcutsBtn = document.querySelector(
    'div.group.flex.flex-none.items-center.justify-center.hover\\:bg-fill-quaternary > button[data-state="closed"]'
  );
  if (shortcutsBtn) shortcutsBtn.parentElement?.remove();

  // --- Fetch Initial Hint using the now-reliable data extraction functions ---
  const problemDetails = {
    title: getProblemTitle(),
    description: getProblemDescription(),
    language: getSelectedLanguage(),
    userCode: "",
  };

  displayResultInPanel("Sudo is thinking of a first hint for you...");

  chrome.runtime.sendMessage(
    { action: "getAIHelp", problemDetails },
    (response) => {
      if (chrome.runtime.lastError || response.error) {
        const errorMsg = chrome.runtime.lastError
          ? `Extension Error: ${chrome.runtime.lastError.message}`
          : `AI Error: ${response.error}`;
        displayResultInPanel(errorMsg, true);
      } else {
        displayResultInPanel(response.hint);
      }
    }
  );
}

function handleGetHintClick(button) {
  const userCode = getUserCode();
  if (!userCode || userCode.trim() === "") {
    displayResultInPanel(
      "Please write some code first before asking for a new hint!",
      true
    );
    return;
  }

  const problemDetails = {
    title: getProblemTitle(),
    description: getProblemDescription(),
    language: getSelectedLanguage(),
    userCode: userCode,
  };

  button.disabled = true;
  button.textContent = "Thinking...";
  displayResultInPanel("Sudo is analyzing your code...");

  chrome.runtime.sendMessage(
    { action: "getAIHelp", problemDetails },
    (response) => {
      if (chrome.runtime.lastError || response.error) {
        const errorMsg = chrome.runtime.lastError
          ? `Extension Error: ${chrome.runtime.lastError.message}`
          : `AI Error: ${response.error}`;
        displayResultInPanel(errorMsg, true);
      } else {
        displayResultInPanel(response.hint);
      }
      button.disabled = false;
      button.textContent = "Get Hint";
    }
  );
}

// =======================================================================
// Helper Functions - No changes needed
// =======================================================================
function addHoverStyle() {
  /*...no changes...*/ const styleId = "thinkdsa-hover-style";
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.innerHTML = `
    button[data-e2e-locator="thinkdsa-ai-button"]:hover:not(:disabled) { background-color: #E59106 !important; }
    button[data-e2e-locator="thinkdsa-ai-button"]:disabled { background-color: #B0AFAF !important; color: #5a5a5a !important; cursor: not-allowed; }
  `;
  document.head.appendChild(style);
}
function displayResultInPanel(message, isError = !1) {
  /*...no changes...*/ const targetPanel = document.querySelector(
    'div[data-layout-path="/c1/ts1/t0"]'
  );
  if (!targetPanel) return;
  for (; targetPanel.firstChild; )
    targetPanel.removeChild(targetPanel.lastChild);
  const contentWrapper = document.createElement("div");
  Object.assign(contentWrapper.style, {
    padding: "15px",
    height: "100%",
    overflowY: "auto",
    color: isError ? "#EF4444" : "var(--text-primary)",
  });
  const responseParagraph = document.createElement("pre");
  (responseParagraph.textContent = message),
    Object.assign(responseParagraph.style, {
      whiteSpace: "pre-wrap",
      wordWrap: "break-word",
      fontSize: "14px",
      fontFamily: "monospace",
      lineHeight: "1.6",
    }),
    contentWrapper.appendChild(responseParagraph),
    targetPanel.appendChild(contentWrapper);
}

// Start the extension
main();
