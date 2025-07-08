// content.js - Clean Simple Version
console.log("ThinkDSA AI: Content script loaded!");

function main() {
  console.log("ThinkDSA AI: Main function called");
  chrome.storage.sync.get(["enabled"], (data) => {
    console.log("ThinkDSA AI: Extension enabled status:", data.enabled);
    if (!data.enabled) {
      console.log("ThinkDSA AI: Extension is disabled, exiting");
      return;
    }

    // Wait for LeetCode UI elements to load
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
  }, 200);
}

function modifyUI() {
  console.log("ThinkDSA AI: modifyUI function called");

  // Check if button already exists to prevent duplicates
  if (document.querySelector('button[data-e2e-locator="thinkdsa-ai-button"]')) {
    console.log("ThinkDSA AI: Button already exists, skipping creation");
    return;
  }

  const buttonBar = document.getElementById("ide-top-btns");
  console.log("ThinkDSA AI: buttonBar found:", !!buttonBar);
  if (!buttonBar) return;

  // Hide Run/Submit buttons
  const originalRunBtn = document.querySelector(
    'button[data-e2e-locator="console-run-button"]'
  );
  console.log("ThinkDSA AI: originalRunBtn found:", !!originalRunBtn);
  if (originalRunBtn) {
    const originalBtnGroupContainer = originalRunBtn.closest(
      ".relative.flex.overflow-hidden.rounded"
    );
    if (originalBtnGroupContainer) {
      originalBtnGroupContainer.style.display = "none";
      console.log("ThinkDSA AI: Hidden original run/submit buttons");
    }
  }

  // Create AI button
  const aiButton = document.createElement("button");
  aiButton.setAttribute("data-e2e-locator", "thinkdsa-ai-button");
  aiButton.textContent = "Get Hint";
  console.log("ThinkDSA AI: Created AI button");

  Object.assign(aiButton.style, {
    backgroundColor: "#FFA116",
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
  console.log("ThinkDSA AI: AI button added to DOM");

  // Clean up other UI elements
  const noteStickySvg = document.querySelector('svg[data-icon="note-sticky"]');
  if (noteStickySvg) noteStickySvg.closest("div.group.flex")?.remove();

  const shortcutsBtn = document.querySelector(
    'div.group.flex.flex-none.items-center.justify-center.hover\\:bg-fill-quaternary > button[data-state="closed"]'
  );
  if (shortcutsBtn) shortcutsBtn.parentElement?.remove();

  // Get initial hint
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

function addHoverStyle() {
  const styleId = "thinkdsa-hover-style";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.innerHTML = `
    button[data-e2e-locator="thinkdsa-ai-button"]:hover:not(:disabled) { 
      background-color: #E59106 !important; 
    }
    button[data-e2e-locator="thinkdsa-ai-button"]:disabled { 
      background-color: #B0AFAF !important; 
      color: #5a5a5a !important; 
      cursor: not-allowed; 
    }
  `;
  document.head.appendChild(style);
}

// Simple function to display AI response by replacing testcase panel content
function displayResultInPanel(message, isError = false) {
  console.log("ThinkDSA AI: displayResultInPanel called with:", message);

  const targetPanel = document.querySelector(
    'div[data-layout-path="/c1/ts1/t0"]'
  );
  if (!targetPanel) {
    console.error("ThinkDSA AI: Could not find target panel");
    return;
  }

  // Clear existing content
  while (targetPanel.firstChild) {
    targetPanel.removeChild(targetPanel.lastChild);
  }

  const contentWrapper = document.createElement("div");
  Object.assign(contentWrapper.style, {
    padding: "15px",
    height: "100%",
    overflowY: "auto",
    color: isError ? "#EF4444" : "var(--text-primary)",
  });

  const responseParagraph = document.createElement("pre");
  responseParagraph.textContent = message;
  Object.assign(responseParagraph.style, {
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    fontSize: "14px",
    fontFamily: "monospace",
    lineHeight: "1.6",
  });

  contentWrapper.appendChild(responseParagraph);
  targetPanel.appendChild(contentWrapper);
  console.log("ThinkDSA AI: AI response displayed in testcase panel");
}

// Data extraction functions
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
  );
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
  // Try Monaco Editor API first
  if (window.monaco && window.monaco.editor) {
    const editors = window.monaco.editor.getEditors();
    if (editors.length > 0) {
      const code = editors[0].getValue();
      console.log(
        "ThinkDSA AI: Extracted code via Monaco API:",
        code.length,
        "characters"
      );
      return code;
    }
  }

  // Try textarea elements
  const codeTextarea =
    document.querySelector('textarea[data-testid*="code"]') ||
    document.querySelector('textarea[class*="code"]') ||
    document.querySelector(".monaco-editor textarea") ||
    document.querySelector("#editor textarea");

  if (codeTextarea && codeTextarea.value) {
    console.log(
      "ThinkDSA AI: Extracted code via textarea:",
      codeTextarea.value.length,
      "characters"
    );
    return codeTextarea.value;
  }

  // Try Monaco editor model
  try {
    const editorElement = document.querySelector(".monaco-editor");
    if (editorElement && editorElement._editor) {
      const model = editorElement._editor.getModel();
      if (model) {
        const code = model.getValue();
        console.log(
          "ThinkDSA AI: Extracted code via Monaco model:",
          code.length,
          "characters"
        );
        return code;
      }
    }
  } catch (e) {
    console.log("ThinkDSA AI: Monaco model extraction failed:", e);
  }

  // Fallback to view-lines method
  const lines = Array.from(document.querySelectorAll(".view-line"))
    .map((line) => {
      const spans = line.querySelectorAll("span");
      if (spans.length > 0) {
        return Array.from(spans)
          .map((span) => span.textContent || span.innerText || "")
          .join("");
      }
      return line.textContent || line.innerText || "";
    })
    .filter((line) => line.trim() !== "");

  const code = lines.join("\n");
  console.log(
    "ThinkDSA AI: Extracted code via view-lines fallback:",
    code.length,
    "characters"
  );
  return code;
}

// Start the extension
console.log("ThinkDSA AI: Starting extension...");
main();
