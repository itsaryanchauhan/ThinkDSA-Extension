// content.js (Full Updated "Patient" Version)

console.log("ThinkDSA AI: Content script loaded!");

// =======================================================================
// Main Logic - NOW WITH A ROBUST WAITING MECHANISM
// =======================================================================

function main() {
  console.log("ThinkDSA AI: Main function called");
  chrome.storage.sync.get(["enabled"], (data) => {
    console.log("ThinkDSA AI: Extension enabled status:", data.enabled);
    if (!data.enabled) {
      console.log("ThinkDSA AI: Extension is disabled, exiting");
      return;
    }

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
      setupTabSwitching();

      // Initialize score button after a short delay to ensure navigation is ready
      setTimeout(() => waitForScoreButtonElements(), 1000);
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
  // Try multiple methods to extract the full code content

  // Method 1: Try Monaco Editor API
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

  // Method 2: Try to find the textarea or input element
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

  // Method 3: Extract from Monaco editor model
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

  // Method 4: Fallback to view-lines method (original approach)
  const lines = Array.from(document.querySelectorAll(".view-line"))
    .map((line) => {
      // Extract text content more thoroughly
      const spans = line.querySelectorAll("span");
      if (spans.length > 0) {
        return Array.from(spans)
          .map((span) => span.textContent || span.innerText || "")
          .join("");
      }
      return line.textContent || line.innerText || "";
    })
    .filter((line) => line.trim() !== ""); // Remove empty lines

  const code = lines.join("\n");
  console.log(
    "ThinkDSA AI: Extracted code via view-lines fallback:",
    code.length,
    "characters"
  );
  return code;
}

// =======================================================================
// UI Modification and Event Handling - No major changes needed here
// =======================================================================

function modifyUI() {
  console.log("ThinkDSA AI: modifyUI function called");

  // Try multiple selectors for the button bar
  let buttonBar = document.getElementById("ide-top-btns");
  if (!buttonBar) {
    // Try alternative selectors
    buttonBar =
      document.querySelector('[id*="ide"][id*="btn"]') ||
      document.querySelector('[class*="console"][class*="action"]') ||
      document.querySelector(".flex.items-center.space-x-2") ||
      document.querySelector(".flex.items-center.gap-2");
  }

  console.log("ThinkDSA AI: buttonBar found:", !!buttonBar);
  if (!buttonBar) {
    console.log("ThinkDSA AI: Could not find button bar, trying to create one");
    // If we can't find the button bar, try to find a parent container and create one
    const parentContainer =
      document.querySelector("#ide-top-zone") ||
      document.querySelector('[class*="ide"]') ||
      document.querySelector(".flex.h-full.flex-col");
    if (parentContainer) {
      buttonBar = document.createElement("div");
      buttonBar.id = "ide-top-btns";
      buttonBar.style.cssText =
        "display: flex; align-items: center; gap: 8px; padding: 8px;";
      parentContainer.insertBefore(buttonBar, parentContainer.firstChild);
      console.log("ThinkDSA AI: Created button bar");
    } else {
      console.log("ThinkDSA AI: Could not find suitable parent container");
      return;
    }
  }

  // Hide Run/Submit buttons if they exist (will be shown back if score >= 80)
  const originalRunBtn =
    document.querySelector('button[data-e2e-locator="console-run-button"]') ||
    document.querySelector('button:contains("Run")') ||
    document.querySelector('button[class*="run"]') ||
    document.querySelector('button:has(svg[data-icon*="play"])');

  console.log("ThinkDSA AI: originalRunBtn found:", !!originalRunBtn);

  if (originalRunBtn) {
    const originalBtnGroupContainer =
      originalRunBtn.closest(".relative.flex.overflow-hidden.rounded") ||
      originalRunBtn.closest(".flex") ||
      originalRunBtn.parentElement;

    if (originalBtnGroupContainer) {
      // Store reference for later use when score >= 80
      window.thinkDSAOriginalButtons = originalBtnGroupContainer;
      originalBtnGroupContainer.style.display = "none";
      console.log("ThinkDSA AI: Hidden original run/submit buttons");
    }
  }

  const aiButton = document.createElement("button");
  aiButton.setAttribute("data-e2e-locator", "thinkdsa-ai-button");
  aiButton.textContent = "Ask Sudo";
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

        // Update score if provided
        if (response.score && response.score.overall !== undefined) {
          updateUserScore(response.score.overall, response.score.breakdown);
        }
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

        // Update score if provided
        if (response.score && response.score.overall !== undefined) {
          updateUserScore(response.score.overall, response.score.breakdown);
        }
      }
      button.disabled = false;
      button.textContent = "Ask Sudo";
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
    
    /* Score button styles */
    #thinkdsa-score-button .flex.cursor-pointer {
      transition: background-color 0.2s ease, color 0.2s ease;
    }
    
    #thinkdsa-score-button .flex.cursor-pointer:hover {
      background-color: rgba(255, 255, 255, 0.1) !important;
    }
    
    #thinkdsa-score-text {
      font-weight: 600;
      font-size: 14px;
    }
    
    /* AI Response tab styles */
    .flexlayout__tab_button--selected #ai_response_tab .text-sd-blue-500 {
      color: #3B82F6 !important;
    }
    
    .flexlayout__tab_button--unselected #ai_response_tab .text-sd-blue-500 {
      color: #6B7280 !important;
    }
    
    /* Ensure AI Response panel is properly styled */
    div[data-layout-path="/c1/ts1/t2"] {
      background: var(--fill-primary, #ffffff);
      color: var(--text-primary, #000000);
    }
  `;
  document.head.appendChild(style);
}
function displayResultInPanel(message, isError = false) {
  console.log("ThinkDSA AI: displayResultInPanel called with:", message);

  // Debug DOM structure
  debugDOMStructure();

  // Wait for the bottom panel to be available
  waitForBottomPanel(() => {
    // Add AI Response button and panel if they don't exist
    addAIResponseButton();

    // Update the AI response content
    const responseContent = document.getElementById("ai-response-content");
    if (responseContent) {
      responseContent.innerHTML = "";

      const responseParagraph = document.createElement("pre");
      responseParagraph.textContent = message;
      Object.assign(responseParagraph.style, {
        whiteSpace: "pre-wrap",
        wordWrap: "break-word",
        fontSize: "14px",
        fontFamily: "monospace",
        lineHeight: "1.6",
        color: isError ? "#EF4444" : "inherit",
        padding: "16px",
        backgroundColor: isError ? "rgba(239, 68, 68, 0.1)" : "var(--fill-3)",
        border: "1px solid var(--border-3)",
        borderRadius: "8px",
      });

      responseContent.appendChild(responseParagraph);
    } else {
      console.error("ThinkDSA AI: Could not find ai-response-content element");
    }

    // Show AI response by switching to the AI response tab
    showAIResponse();
    updateTabStates("ai");

    console.log("ThinkDSA AI: AI response displayed in tab panel");

    // Debug again after display
    setTimeout(() => {
      console.log("ThinkDSA AI: Post-display debug");
      debugDOMStructure();
    }, 1000);
  });
}

// =======================================================================
// Score Management Functions
// =======================================================================

function addScoreButton() {
  // Find the target container for the score button (to the left of layout manager button)
  const targetContainer = document.querySelector(
    ".relative.flex.flex-1.items-center.justify-end"
  );
  if (!targetContainer) {
    console.log(
      "ThinkDSA AI: Could not find target container for score button"
    );
    // Try alternative selectors
    const altContainer =
      document.querySelector(".flex.flex-1.items-center.justify-end") ||
      document.querySelector(
        '[class*="flex-1"][class*="items-center"][class*="justify-end"]'
      );
    if (!altContainer) {
      console.log(
        "ThinkDSA AI: Could not find alternative container for score button"
      );
      return;
    }
    return addScoreButtonToContainer(altContainer);
  }

  return addScoreButtonToContainer(targetContainer);
}

function addScoreButtonToContainer(targetContainer) {
  // Find the layout manager button container to insert score button before it
  const layoutManagerContainer =
    targetContainer.querySelector(
      ".relative.flex.items-center.justify-end.gap-2"
    ) ||
    targetContainer.querySelector(".flex.items-center.justify-end.gap-2") ||
    targetContainer.querySelector('[class*="gap-2"]');

  if (!layoutManagerContainer) {
    console.log(
      "ThinkDSA AI: Could not find layout manager container, appending to target"
    );
  }

  // Remove existing score button if it exists
  const existingScoreButton = document.getElementById("thinkdsa-score-button");
  if (existingScoreButton) {
    existingScoreButton.remove();
  }

  // Create score button container
  const scoreButtonContainer = document.createElement("div");
  scoreButtonContainer.id = "thinkdsa-score-button";
  scoreButtonContainer.className =
    "relative flex items-center justify-end gap-2 mr-2";

  // Create the score display button
  const scoreButton = document.createElement("button");
  scoreButton.type = "button";
  scoreButton.className =
    "flex cursor-pointer rounded-lg p-2 text-sd-muted-foreground hover:text-sd-foreground hover:bg-fill-tertiary dark:hover:bg-fill-tertiary transition-colors";
  scoreButton.title = "Your Understanding Score - Hover for breakdown";

  // Create the inner content
  const scoreContent = document.createElement("div");
  scoreContent.className = "flex items-center gap-2";

  // Create brain icon
  const brainIcon = document.createElement("div");
  brainIcon.className =
    "relative text-[16px] leading-[normal] before:block before:h-4 before:w-4";
  brainIcon.innerHTML = `
    <svg aria-hidden="true" focusable="false" class="svg-inline--fa absolute left-1/2 top-1/2 h-[1em] -translate-x-1/2 -translate-y-1/2 align-[-0.125em]" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
      <path d="M184 0c30.9 0 56 25.1 56 56V456c0 30.9-25.1 56-56 56c-28.9 0-52.7-21.9-55.7-50.1c-5.2 1.4-10.7 2.1-16.3 2.1c-35.3 0-64-28.7-64-64c0-7.4 1.3-14.6 3.6-21.2C21.4 367.4 0 338.2 0 304c0-31.9 18.7-59.5 45.8-72.3C37.1 220.8 32 207 32 192c0-30.7 21.6-56.3 50.4-62.6C80.8 123.9 80 118 80 112c0-29.9 20.6-55.1 48.3-62.1C131.3 21.9 155.1 0 184 0zM328 0c28.9 0 52.6 21.9 55.7 49.9c27.8 7 48.3 32.1 48.3 62.1c0 6-.8 11.9-2.4 17.4c28.8 6.2 50.4 31.9 50.4 62.6c0 15-5.1 28.8-13.8 39.7C493.3 244.5 512 272.1 512 304c0 34.2-21.4 63.4-51.6 74.8c2.3 6.6 3.6 13.8 3.6 21.2c0 35.3-28.7 64-64 64c-5.6 0-11.1-.7-16.3-2.1c-3 28.2-26.8 50.1-55.7 50.1c-30.9 0-56-25.1-56-56V56c0-30.9 25.1-56 56-56z"/>
    </svg>
  `;

  // Create score text
  const scoreText = document.createElement("span");
  scoreText.className = "text-sm font-medium";
  scoreText.id = "thinkdsa-score-text";
  scoreText.textContent = "0/100";

  // Assemble the button
  scoreContent.appendChild(brainIcon);
  scoreContent.appendChild(scoreText);
  scoreButton.appendChild(scoreContent);
  scoreButtonContainer.appendChild(scoreButton);

  // Insert the score button before the layout manager container
  if (layoutManagerContainer) {
    targetContainer.insertBefore(scoreButtonContainer, layoutManagerContainer);
  } else {
    targetContainer.appendChild(scoreButtonContainer);
  }

  // Load and display initial score
  loadUserScore();

  // Add hover handler to show score breakdown
  scoreButton.onmouseenter = () => showScoreTooltip(scoreButton);
  scoreButton.onmouseleave = () => hideScoreTooltip();

  // Add click handler to show detailed breakdown in AI Response tab
  scoreButton.onclick = () => showScoreBreakdown();

  console.log("ThinkDSA AI: Score button added successfully");
}

function loadUserScore() {
  // Get current problem identifier
  const problemTitle = getProblemTitle();
  const scoreKey = `score_${problemTitle.replace(/[^a-zA-Z0-9]/g, "_")}`;

  chrome.storage.sync.get([scoreKey], (data) => {
    const score = data[scoreKey] || 0;
    updateScoreDisplay(score);

    // Check if we should show original buttons on initial load
    toggleOriginalButtons(score);
  });
}

function updateScoreDisplay(score) {
  const scoreText = document.getElementById("thinkdsa-score-text");
  if (scoreText) {
    const colorClass = getScoreColor(score);
    scoreText.textContent = `${score}/100`;
    scoreText.style.color = colorClass;

    // Toggle original buttons based on score
    toggleOriginalButtons(score);
  }
}

function getScoreColor(score) {
  if (score >= 80) return "#10B981"; // Green
  if (score >= 60) return "#F59E0B"; // Yellow
  if (score >= 40) return "#F97316"; // Orange
  return "#EF4444"; // Red
}

function showScoreBreakdown() {
  const problemTitle = getProblemTitle();
  const scoreKey = `score_${problemTitle.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const breakdownKey = `breakdown_${problemTitle.replace(
    /[^a-zA-Z0-9]/g,
    "_"
  )}`;

  chrome.storage.sync.get([scoreKey, breakdownKey], (data) => {
    const score = data[scoreKey] || 0;
    const breakdown = data[breakdownKey] || {
      conceptual: 0,
      implementation: 0,
      optimization: 0,
      testing: 0,
    };

    const breakdownMessage = `
Understanding Score Breakdown for "${problemTitle}":

Overall Score: ${score}/100

Detailed Breakdown:
• Conceptual Understanding: ${breakdown.conceptual}/25
• Implementation Quality: ${breakdown.implementation}/25  
• Code Optimization: ${breakdown.optimization}/25
• Edge Case Handling: ${breakdown.testing}/25

Your score is determined by our AI based on:
- How well you understand the problem
- Quality of your solution approach
- Code efficiency and correctness
- Handling of edge cases

Keep practicing to improve your score!
    `;

    displayResultInPanel(breakdownMessage);
  });
}

function updateUserScore(newScore, breakdown) {
  const problemTitle = getProblemTitle();
  const scoreKey = `score_${problemTitle.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const breakdownKey = `breakdown_${problemTitle.replace(
    /[^a-zA-Z0-9]/g,
    "_"
  )}`;

  chrome.storage.sync.set(
    {
      [scoreKey]: newScore,
      [breakdownKey]: breakdown,
    },
    () => {
      updateScoreDisplay(newScore);
      console.log(
        `ThinkDSA AI: Updated score to ${newScore} for problem: ${problemTitle}`
      );
    }
  );
}

// =======================================================================
// Enhanced Initialization with Score Button
// =======================================================================

function waitForScoreButtonElements() {
  // Wait specifically for the top navigation elements to load
  const navSelectors = {
    targetContainer:
      ".relative.flex.flex-1.items-center.justify-end, .flex.flex-1.items-center.justify-end",
    anyNavElement:
      '[class*="flex"][class*="items-center"][class*="justify-end"]',
  };

  let attempts = 0;
  const maxAttempts = 20;
  const checkInterval = setInterval(() => {
    attempts++;

    const container =
      document.querySelector(navSelectors.targetContainer) ||
      document.querySelector(navSelectors.anyNavElement);

    if (container) {
      clearInterval(checkInterval);
      console.log(
        "ThinkDSA AI: Navigation container found, adding score button"
      );
      setTimeout(() => addScoreButton(), 500); // Small delay to ensure DOM is stable
    } else if (attempts >= maxAttempts) {
      clearInterval(checkInterval);
      console.log(
        "ThinkDSA AI: Could not find navigation container after maximum attempts"
      );
    }
  }, 300);
}

// Debug function to test score functionality
function testScoreSystem() {
  console.log("=== ThinkDSA AI Score System Test ===");

  // Test score update
  const testScore = 75;
  const testBreakdown = {
    conceptual: 20,
    implementation: 18,
    optimization: 19,
    testing: 18,
  };

  console.log("Testing score update...");
  updateUserScore(testScore, testBreakdown);

  // Test score loading
  setTimeout(() => {
    console.log("Testing score loading...");
    loadUserScore();
  }, 1000);

  // Test score display
  setTimeout(() => {
    console.log("Testing score breakdown display...");
    showScoreBreakdown();
  }, 2000);

  console.log("=== Score System Test Complete ===");
}

// Uncomment the line below to run the test (for debugging purposes)
// setTimeout(() => testScoreSystem(), 5000);

// Start the extension
console.log("ThinkDSA AI: Starting extension...");
main();

function toggleOriginalButtons(score) {
  if (window.thinkDSAOriginalButtons) {
    if (score >= 80) {
      window.thinkDSAOriginalButtons.style.display = "flex";
      console.log(
        "ThinkDSA AI: Showing original run/submit buttons (score >= 80)"
      );
    } else {
      window.thinkDSAOriginalButtons.style.display = "none";
      console.log(
        "ThinkDSA AI: Hiding original run/submit buttons (score < 80)"
      );
    }
  }
}

// =======================================================================
// AI Response Tab Management Functions
// =======================================================================

// Old complex tab functions removed - now using simple button approach

// Old switchToAIResponseTab function removed - now using simple opacity approach

// Also need to handle clicks on other tabs to switch away from AI Response
function setupTabSwitching() {
  // Monitor Testcase and Test Result tabs for clicks to hide AI response
  let attempts = 0;
  const maxAttempts = 10;

  const setupTabHandlers = () => {
    attempts++;

    // Find Testcase and Test Result tabs
    const tabContainer = document.querySelector(
      ".flexlayout__tabset_tabbar_inner_tab_container"
    );
    if (!tabContainer) {
      if (attempts < maxAttempts) {
        setTimeout(setupTabHandlers, 500);
      }
      return;
    }

    const allTabs = tabContainer.querySelectorAll(".flexlayout__tab_button");
    let testcaseTab = null;
    let resultTab = null;

    allTabs.forEach((tab) => {
      const content = tab.textContent || "";
      if (content.toLowerCase().includes("testcase")) {
        testcaseTab = tab;
      } else if (
        content.toLowerCase().includes("test result") ||
        content.toLowerCase().includes("result")
      ) {
        resultTab = tab;
      }
    });

    // Add click handlers to native tabs
    if (testcaseTab && !testcaseTab.hasAttribute("data-thinkdsa-handler")) {
      testcaseTab.addEventListener("click", () => {
        hideAIResponse();
        updateTabStates("testcase");
        console.log("ThinkDSA AI: Testcase tab clicked, hiding AI response");
      });
      testcaseTab.setAttribute("data-thinkdsa-handler", "true");
    }

    if (resultTab && !resultTab.hasAttribute("data-thinkdsa-handler")) {
      resultTab.addEventListener("click", () => {
        hideAIResponse();
        updateTabStates("result");
        console.log("ThinkDSA AI: Result tab clicked, hiding AI response");
      });
      resultTab.setAttribute("data-thinkdsa-handler", "true");
    }

    if (testcaseTab || resultTab || attempts >= maxAttempts) {
      console.log(
        `ThinkDSA AI: Set up tab handlers - Testcase: ${!!testcaseTab}, Result: ${!!resultTab}`
      );
      return;
    }

    // Try again after a short delay
    setTimeout(setupTabHandlers, 500);
  };

  // Start the setup process
  setTimeout(setupTabHandlers, 1000);
}

// Old switchToPanel function removed - now using simple opacity approach

// =======================================================================
// End of AI Response Tab Management Functions
// =======================================================================

// =======================================================================
// Bottom Panel Waiting Function
// =======================================================================

function waitForBottomPanel(callback, timeout = 5000) {
  const startTime = Date.now();
  const interval = setInterval(() => {
    const bottomTabset = document.querySelector("#testcase_tabbar_outer");
    const testcaseTab = document.querySelector("#testcase_tab");
    const resultTab = document.querySelector("#result_tab");

    console.log("ThinkDSA AI: Checking for bottom panel elements...", {
      bottomTabset: !!bottomTabset,
      testcaseTab: !!testcaseTab,
      resultTab: !!resultTab,
    });

    if (bottomTabset && testcaseTab && resultTab) {
      clearInterval(interval);
      console.log(
        "ThinkDSA AI: Bottom panel found, proceeding with AI Response tab"
      );
      callback();
    } else if (Date.now() - startTime > timeout) {
      clearInterval(interval);
      console.error("ThinkDSA AI: Timed out waiting for bottom panel");

      // Try alternative approach if the specific selectors don't work
      const altTabContainer = document.querySelector(
        ".flexlayout__tabset_tabbar_inner_tab_container"
      );
      const altTabsetContent = document.querySelector(
        ".flexlayout__tabset_content"
      );

      if (altTabContainer && altTabsetContent) {
        console.log(
          "ThinkDSA AI: Found alternative selectors, proceeding anyway"
        );
        callback();
      }
    }
  }, 200);
}

// =======================================================================
// Score Tooltip Functions
// =======================================================================

function showScoreTooltip(scoreButton) {
  // Remove existing tooltip if any
  hideScoreTooltip();

  const problemTitle = getProblemTitle();
  const scoreKey = `score_${problemTitle.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const breakdownKey = `breakdown_${problemTitle.replace(
    /[^a-zA-Z0-9]/g,
    "_"
  )}`;

  chrome.storage.sync.get([scoreKey, breakdownKey], (data) => {
    const score = data[scoreKey] || 0;
    const breakdown = data[breakdownKey] || {
      conceptual: 0,
      implementation: 0,
      optimization: 0,
      testing: 0,
    };

    // Create tooltip
    const tooltip = document.createElement("div");
    tooltip.id = "thinkdsa-score-tooltip";
    tooltip.innerHTML = `
      <div style="background: #1a1a1a; color: white; padding: 12px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-size: 12px; min-width: 200px; z-index: 9999; position: absolute;">
        <div style="font-weight: bold; margin-bottom: 8px; color: #FFA116;">Score Breakdown (${score}/100)</div>
        <div style="margin-bottom: 4px;">• Conceptual: ${
          breakdown.conceptual
        }/25</div>
        <div style="margin-bottom: 4px;">• Implementation: ${
          breakdown.implementation
        }/25</div>
        <div style="margin-bottom: 4px;">• Optimization: ${
          breakdown.optimization
        }/25</div>
        <div style="margin-bottom: 4px;">• Edge Cases: ${
          breakdown.testing
        }/25</div>
        ${
          score >= 80
            ? '<div style="color: #10B981; margin-top: 8px; font-weight: bold;">🎉 Run/Submit buttons unlocked!</div>'
            : ""
        }
      </div>
    `;

    // Position tooltip
    const rect = scoreButton.getBoundingClientRect();
    tooltip.style.position = "fixed";
    tooltip.style.top = rect.bottom + 8 + "px";
    tooltip.style.left = rect.left - 100 + "px";
    tooltip.style.zIndex = "10000";

    document.body.appendChild(tooltip);
  });
}

function hideScoreTooltip() {
  const existingTooltip = document.getElementById("thinkdsa-score-tooltip");
  if (existingTooltip) {
    existingTooltip.remove();
  }
}

// =======================================================================
// AI Response Button and Opacity Management Functions
// =======================================================================

function addAIResponseButton() {
  // Check if button already exists
  if (document.getElementById("ai-response-tab-button")) {
    return;
  }

  // Find the bottom panel tab container specifically
  const bottomTabset = document.querySelector(
    'div[data-layout-path="/c1/ts1"]'
  );
  let tabContainer = null;

  if (bottomTabset) {
    tabContainer = bottomTabset.querySelector(
      ".flexlayout__tabset_tabbar_inner_tab_container"
    );
  }

  // Fallback: try to find any tab container and check if it contains testcase/result tabs
  if (!tabContainer) {
    const allTabContainers = document.querySelectorAll(
      ".flexlayout__tabset_tabbar_inner_tab_container"
    );
    for (const container of allTabContainers) {
      const hasTestcaseTab = Array.from(container.children).some(
        (tab) =>
          tab.textContent && tab.textContent.toLowerCase().includes("testcase")
      );
      if (hasTestcaseTab) {
        tabContainer = container;
        break;
      }
    }
  }

  if (!tabContainer) {
    console.error("ThinkDSA AI: Could not find bottom panel tab container");
    return;
  }

  // Create AI Response tab button
  const aiTabButton = document.createElement("div");
  aiTabButton.id = "ai-response-tab-button";
  aiTabButton.className =
    "flexlayout__tab_button flexlayout__tab_button_top flexlayout__tab_button--unselected";

  const buttonContent = document.createElement("div");
  buttonContent.className = "flexlayout__tab_button_content";

  const tabInner = document.createElement("div");
  tabInner.className =
    "relative flex items-center gap-1 overflow-hidden text-sm capitalize";
  tabInner.style.maxWidth = "150px";

  // Create the icon
  const iconDiv = document.createElement("div");
  iconDiv.className =
    "relative text-[14px] leading-[normal] p-[1px] before:block before:h-3.5 before:w-3.5 text-sd-blue-500";
  iconDiv.innerHTML = `
    <svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="robot" class="svg-inline--fa fa-robot absolute left-1/2 top-1/2 h-[1em] -translate-x-1/2 -translate-y-1/2 align-[-0.125em]" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
      <path fill="currentColor" d="M320 0c17.7 0 32 14.3 32 32V96H480c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H160c-35.3 0-64-28.7-64-64V160c0-35.3 28.7-64 64-64H288V32c0-17.7 14.3-32 32-32z"/>
    </svg>
  `;

  // Create the text content
  const textDiv = document.createElement("div");
  textDiv.className = "relative";
  textDiv.innerHTML = `
    <div class="medium whitespace-nowrap font-medium">AI Response</div>
    <div class="normal absolute left-0 top-0 whitespace-nowrap font-normal">AI Response</div>
  `;

  // Assemble the tab
  tabInner.appendChild(iconDiv);
  tabInner.appendChild(textDiv);
  buttonContent.appendChild(tabInner);
  aiTabButton.appendChild(buttonContent);

  // Add click handler
  aiTabButton.addEventListener("click", () => {
    showAIResponse();
    updateTabStates("ai");
  });

  // Add divider before the new tab
  const divider = document.createElement("div");
  divider.className = "flexlayout__tabset_tab_divider";

  // Insert the tab and divider after the existing tabs
  tabContainer.appendChild(divider);
  tabContainer.appendChild(aiTabButton);

  console.log("ThinkDSA AI: Added AI Response tab button");

  // Create the AI Response tab panel
  createAIResponseTabPanel();
}

function createAIResponseTabPanel() {
  // Check if panel already exists
  if (document.getElementById("ai-response-tab-panel")) {
    console.log("ThinkDSA AI: AI Response tab panel already exists");
    return;
  }

  // Find the correct tab content container - the one in the bottom panel where testcase/result tabs are
  let tabContentContainer = null;

  // First, find the bottom tabset that contains testcase/result tabs
  const bottomTabset = document.querySelector(
    'div[data-layout-path="/c1/ts1"]'
  );
  if (bottomTabset) {
    // Look for the content container within this specific tabset
    tabContentContainer = bottomTabset.querySelector(
      ".flexlayout__tabset_content"
    );
    if (tabContentContainer) {
      console.log("ThinkDSA AI: Found bottom panel tab content container");
    }
  }

  // Fallback: try to find it relative to testcase panel
  if (!tabContentContainer) {
    const testcasePanel = document.querySelector(
      'div[data-layout-path="/c1/ts1/t0"]'
    );
    if (testcasePanel) {
      tabContentContainer = testcasePanel.parentElement;
      console.log("ThinkDSA AI: Using testcase panel parent as container");
    }
  }

  if (!tabContentContainer) {
    console.error(
      "ThinkDSA AI: Could not find bottom panel tab content container"
    );
    return;
  }

  // Create AI Response tab panel
  const aiPanel = document.createElement("div");
  aiPanel.id = "ai-response-tab-panel";
  aiPanel.className = "flexlayout__tab";
  aiPanel.setAttribute("data-layout-path", "/c1/ts1/t2"); // Give it a proper layout path
  aiPanel.style.cssText = `
    display: none;
    position: absolute;
    left: 478px;
    top: 313px;
    --width: 461px;
    --height: 237px;
    width: 461px;
    height: 237px;
    background: var(--bg-1);
    z-index: 1;
  `;

  // Create the panel content structure
  const panelContent = document.createElement("div");
  panelContent.className = "flex h-full w-full flex-col justify-between";

  const scrollableContent = document.createElement("div");
  scrollableContent.className = "flex-1 overflow-y-auto";

  const innerContent = document.createElement("div");
  innerContent.className = "mx-5 my-4 flex flex-col space-y-4";

  const responseContainer = document.createElement("div");
  responseContainer.className = "space-y-4";
  responseContainer.id = "ai-response-content";

  innerContent.appendChild(responseContainer);
  scrollableContent.appendChild(innerContent);
  panelContent.appendChild(scrollableContent);
  aiPanel.appendChild(panelContent);

  // Add the panel to the bottom tab content container
  tabContentContainer.appendChild(aiPanel);

  console.log(
    "ThinkDSA AI: Created AI Response tab panel in bottom panel container:",
    tabContentContainer
  );
}

function showAIResponse() {
  // Find the bottom panel tab content container
  const bottomTabset = document.querySelector(
    'div[data-layout-path="/c1/ts1"]'
  );
  let tabContentContainer = null;

  if (bottomTabset) {
    tabContentContainer = bottomTabset.querySelector(
      ".flexlayout__tabset_content"
    );
  }

  // Fallback to testcase panel parent
  if (!tabContentContainer) {
    const testcasePanel = document.querySelector(
      'div[data-layout-path="/c1/ts1/t0"]'
    );
    if (testcasePanel) {
      tabContentContainer = testcasePanel.parentElement;
    }
  }

  if (tabContentContainer) {
    // Hide all existing bottom panel tabs (testcase and result)
    const existingTabs = tabContentContainer.querySelectorAll(
      '.flexlayout__tab[data-layout-path^="/c1/ts1/t"]'
    );
    existingTabs.forEach((tab) => {
      if (tab.id !== "ai-response-tab-panel") {
        tab.style.display = "none";
      }
    });
  }

  // Show AI response panel
  const aiPanel = document.getElementById("ai-response-tab-panel");
  if (aiPanel) {
    aiPanel.style.display = "block";
    console.log("ThinkDSA AI: Showing AI response panel");
  } else {
    console.error("ThinkDSA AI: AI response panel not found");
  }
}

function hideAIResponse() {
  // Hide AI response panel
  const aiPanel = document.getElementById("ai-response-tab-panel");
  if (aiPanel) {
    aiPanel.style.display = "none";
  }

  // Find the bottom panel tab content container and show the active native tab
  const bottomTabset = document.querySelector(
    'div[data-layout-path="/c1/ts1"]'
  );
  let tabContentContainer = null;

  if (bottomTabset) {
    tabContentContainer = bottomTabset.querySelector(
      ".flexlayout__tabset_content"
    );
  }

  // Fallback to testcase panel parent
  if (!tabContentContainer) {
    const testcasePanel = document.querySelector(
      'div[data-layout-path="/c1/ts1/t0"]'
    );
    if (testcasePanel) {
      tabContentContainer = testcasePanel.parentElement;
    }
  }

  if (tabContentContainer) {
    // Show the testcase tab by default (since it's usually the active one)
    const testcaseTab = document.querySelector(
      'div[data-layout-path="/c1/ts1/t0"]'
    );
    if (testcaseTab) {
      testcaseTab.style.display = "block";
    }
  }
  console.log("ThinkDSA AI: Hiding AI response panel");
}

function updateTabStates(activeTab) {
  // Find all tabs in the tab container
  const tabContainer = document.querySelector(
    ".flexlayout__tabset_tabbar_inner_tab_container"
  );
  if (!tabContainer) return;

  const allTabs = tabContainer.querySelectorAll(".flexlayout__tab_button");
  const aiTab = document.getElementById("ai-response-tab-button");

  allTabs.forEach((tab) => {
    if (activeTab === "ai") {
      // Make all other tabs inactive when AI is selected
      if (tab !== aiTab) {
        tab.classList.remove("flexlayout__tab_button--selected");
        tab.classList.add("flexlayout__tab_button--unselected");
      }
    }
    // For non-AI tabs, let LeetCode handle the native tab states
  });

  if (aiTab) {
    if (activeTab === "ai") {
      // Make AI tab active
      aiTab.classList.remove("flexlayout__tab_button--unselected");
      aiTab.classList.add("flexlayout__tab_button--selected");
    } else {
      // Make AI tab inactive
      aiTab.classList.remove("flexlayout__tab_button--selected");
      aiTab.classList.add("flexlayout__tab_button--unselected");
    }
  }
}

// =======================================================================
// Debug Functions
// =======================================================================

function debugDOMStructure() {
  console.group("ThinkDSA AI: DOM Structure Debug");

  // Check for various tab-related containers
  const selectors = [
    ".flexlayout__tabset",
    ".flexlayout__tabset_content",
    ".flexlayout__tabset_content_container",
    ".flexlayout__tabset_tabbar",
    ".flexlayout__tabset_tabbar_inner",
    ".flexlayout__tabset_tabbar_inner_tab_container",
    'div[data-layout-path="/c1/ts1"]',
    'div[data-layout-path="/c1/ts1/t0"]',
    'div[data-layout-path="/c1/ts1/t1"]',
  ];

  selectors.forEach((selector) => {
    const element = document.querySelector(selector);
    console.log(`${selector}:`, element ? "FOUND" : "NOT FOUND", element);
  });

  // Check AI response panel
  const aiPanel = document.getElementById("ai-response-tab-panel");
  console.log("AI Response Panel:", aiPanel ? "EXISTS" : "NOT FOUND", aiPanel);

  if (aiPanel) {
    console.log("AI Panel Parent:", aiPanel.parentElement);
    console.log("AI Panel Display:", aiPanel.style.display);
  }

  console.groupEnd();
}

// For debugging: call debugDOMStructure() in the console after loading a problem
