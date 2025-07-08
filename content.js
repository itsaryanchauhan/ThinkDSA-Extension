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
  return Array.from(document.querySelectorAll(".view-line"))
    .map((line) => line.innerText)
    .join("\n");
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

  // Hide Run/Submit buttons if they exist
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
      originalBtnGroupContainer.style.display = "none";
      console.log("ThinkDSA AI: Hidden original run/submit buttons");
    }
  }

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
  `;
  document.head.appendChild(style);
}
function displayResultInPanel(message, isError = false) {
  console.log("ThinkDSA AI: displayResultInPanel called with:", message);
  const targetPanel = document.querySelector(
    'div[data-layout-path="/c1/ts1/t0"]'
  );
  console.log("ThinkDSA AI: targetPanel found:", !!targetPanel);
  if (!targetPanel) return;

  // Clear existing content
  while (targetPanel.firstChild) {
    targetPanel.removeChild(targetPanel.firstChild);
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
  scoreButton.title = "Your Understanding Score - Click for breakdown";

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

  // Add click handler to show score breakdown
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
  });
}

function updateScoreDisplay(score) {
  const scoreText = document.getElementById("thinkdsa-score-text");
  if (scoreText) {
    const colorClass = getScoreColor(score);
    scoreText.textContent = `${score}/100`;
    scoreText.style.color = colorClass;
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
