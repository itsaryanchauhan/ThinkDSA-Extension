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
      // Store reference for later use when score >= 80
      window.thinkDSAOriginalButtons = originalBtnGroupContainer;
      originalBtnGroupContainer.style.display = "none";
      console.log("ThinkDSA AI: Hidden original run/submit buttons");
    }
  }

  // Create AI button
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

  // Add score button
  addScoreButton();

  // Clear any old score data to start fresh
  clearOldScoreData();

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
        // Parse score from response text if it contains SCORE_ASSESSMENT
        let scoreData = null;
        if (response.hint.includes("SCORE_ASSESSMENT:")) {
          try {
            // More robust regex to handle multiline JSON - find the complete JSON block
            const scoreMatch = response.hint.match(
              /SCORE_ASSESSMENT:\s*({[\s\S]*?}(?:\s*\n|$))/
            );
            if (scoreMatch) {
              // Clean up the JSON string more carefully
              let jsonStr = scoreMatch[1];

              // Remove any trailing text after the closing brace
              const lastBraceIndex = jsonStr.lastIndexOf("}");
              if (lastBraceIndex !== -1) {
                jsonStr = jsonStr.substring(0, lastBraceIndex + 1);
              }

              // Clean up whitespace but preserve structure
              jsonStr = jsonStr.replace(/\s+/g, " ").trim();

              console.log("ThinkDSA AI: Attempting to parse JSON:", jsonStr);
              scoreData = JSON.parse(jsonStr);
              console.log(
                "ThinkDSA AI: ✅ Parsed score from response text:",
                scoreData
              );

              // Remove the score assessment from the displayed hint
              response.hint = response.hint
                .replace(/SCORE_ASSESSMENT:[\s\S]*$/m, "")
                .trim();
            } else {
              console.log(
                "ThinkDSA AI: No valid SCORE_ASSESSMENT JSON block found"
              );
            }
          } catch (e) {
            console.error("ThinkDSA AI: ❌ Error parsing score assessment:", e);
            console.log("ThinkDSA AI: Raw response for debugging:");
            console.log(response.hint);

            // Try to extract score manually if JSON parsing fails
            const manualScoreMatch = response.hint.match(
              /overall["\s]*:\s*(\d+)/i
            );
            if (manualScoreMatch) {
              const overallScore = parseInt(manualScoreMatch[1]);
              console.log(
                "ThinkDSA AI: 🔧 Extracted score manually:",
                overallScore
              );
              scoreData = { overall: overallScore };
            }
          }
        }

        displayResultInPanel(response.hint);

        // Update score if provided in response object or parsed from text
        if (response.score && response.score.overall !== undefined) {
          console.log(
            "ThinkDSA AI: ✅ Updating score from initial hint response object:",
            response.score
          );
          updateUserScore(response.score.overall, response.score.breakdown);
        } else if (scoreData && scoreData.overall !== undefined) {
          console.log(
            "ThinkDSA AI: ✅ Updating score from parsed text:",
            scoreData
          );
          updateUserScore(scoreData.overall, scoreData.breakdown);
        } else {
          console.log(
            "ThinkDSA AI: ⚠️ No score data found in initial hint response"
          );
          // Try one more fallback - look for any number that could be a score
          const fallbackScoreMatch = response.hint.match(
            /(\d+)\/100|score.*?(\d+)|(\d+)%/i
          );
          if (fallbackScoreMatch) {
            const fallbackScore = parseInt(
              fallbackScoreMatch[1] ||
                fallbackScoreMatch[2] ||
                fallbackScoreMatch[3]
            );
            if (fallbackScore >= 0 && fallbackScore <= 100) {
              console.log(
                "ThinkDSA AI: 🔧 Using fallback score:",
                fallbackScore
              );
              updateUserScore(fallbackScore, {});
            }
          }
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
        // Parse score from response text if it contains SCORE_ASSESSMENT
        let scoreData = null;
        if (response.hint.includes("SCORE_ASSESSMENT:")) {
          try {
            // More robust regex to handle multiline JSON - find the complete JSON block
            const scoreMatch = response.hint.match(
              /SCORE_ASSESSMENT:\s*({[\s\S]*?}(?:\s*\n|$))/
            );
            if (scoreMatch) {
              // Clean up the JSON string more carefully
              let jsonStr = scoreMatch[1];

              // Remove any trailing text after the closing brace
              const lastBraceIndex = jsonStr.lastIndexOf("}");
              if (lastBraceIndex !== -1) {
                jsonStr = jsonStr.substring(0, lastBraceIndex + 1);
              }

              // Clean up whitespace but preserve structure
              jsonStr = jsonStr.replace(/\s+/g, " ").trim();

              console.log("ThinkDSA AI: Attempting to parse JSON:", jsonStr);
              scoreData = JSON.parse(jsonStr);
              console.log(
                "ThinkDSA AI: ✅ Parsed score from hint response text:",
                scoreData
              );

              // Remove the score assessment from the displayed hint
              response.hint = response.hint
                .replace(/SCORE_ASSESSMENT:[\s\S]*$/m, "")
                .trim();
            } else {
              console.log(
                "ThinkDSA AI: No valid SCORE_ASSESSMENT JSON block found"
              );
            }
          } catch (e) {
            console.error("ThinkDSA AI: ❌ Error parsing score assessment:", e);
            console.log("ThinkDSA AI: Raw response for debugging:");
            console.log(response.hint);

            // Try to extract score manually if JSON parsing fails
            const manualScoreMatch = response.hint.match(
              /overall["\s]*:\s*(\d+)/i
            );
            if (manualScoreMatch) {
              const overallScore = parseInt(manualScoreMatch[1]);
              console.log(
                "ThinkDSA AI: 🔧 Extracted score manually:",
                overallScore
              );
              scoreData = { overall: overallScore };
            }
          }
        }

        displayResultInPanel(response.hint);

        // Update score if provided in response object or parsed from text
        if (response.score && response.score.overall !== undefined) {
          console.log(
            "ThinkDSA AI: ✅ Updating score from hint click response object:",
            response.score
          );
          updateUserScore(response.score.overall, response.score.breakdown);
        } else if (scoreData && scoreData.overall !== undefined) {
          console.log(
            "ThinkDSA AI: ✅ Updating score from parsed hint text:",
            scoreData
          );
          updateUserScore(scoreData.overall, scoreData.breakdown);
        } else {
          console.log(
            "ThinkDSA AI: ⚠️ No score data in hint response, keeping current score"
          );
          // Try one more fallback - look for any number that could be a score
          const fallbackScoreMatch = response.hint.match(
            /(\d+)\/100|score.*?(\d+)|(\d+)%/i
          );
          if (fallbackScoreMatch) {
            const fallbackScore = parseInt(
              fallbackScoreMatch[1] ||
                fallbackScoreMatch[2] ||
                fallbackScoreMatch[3]
            );
            if (fallbackScore >= 0 && fallbackScore <= 100) {
              console.log(
                "ThinkDSA AI: 🔧 Using fallback score from hint:",
                fallbackScore
              );
              updateUserScore(fallbackScore, {});
            }
          }
        }
      }
      button.disabled = false;
      button.textContent = "Ask Sudo";
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
    
    #thinkdsa-score-button:hover {
      background-color: rgba(255, 255, 255, 0.1) !important;
      border-color: var(--border-2) !important;
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
  console.log("ThinkDSA AI: Starting enhanced code extraction...");

  // Method 1: Extract from the MAIN view-lines element (avoid duplicates)
  try {
    // Find the main Monaco editor container first
    const monacoEditor = document.querySelector(".monaco-editor[data-uri]");
    if (monacoEditor) {
      console.log("ThinkDSA AI: Found main Monaco editor container");

      // Look for view-lines specifically within this editor
      const viewLinesElement = monacoEditor.querySelector(".view-lines");
      if (viewLinesElement) {
        console.log(
          "ThinkDSA AI: Found main view-lines element, extracting code..."
        );

        // Force scroll to top to ensure all lines are rendered
        const scrollableElement = monacoEditor.querySelector(
          ".monaco-scrollable-element"
        );
        if (scrollableElement) {
          const originalScrollTop = scrollableElement.scrollTop;
          scrollableElement.scrollTop = 0;
          // Force a reflow to trigger rendering
          scrollableElement.offsetHeight;
          // Restore scroll position
          scrollableElement.scrollTop = originalScrollTop;
        }

        // Get all view-line elements and deduplicate by content
        const viewLineElements =
          viewLinesElement.querySelectorAll(".view-line");
        console.log(
          "ThinkDSA AI: Found",
          viewLineElements.length,
          "view-line elements"
        );

        if (viewLineElements.length > 0) {
          // Use a Set to track unique line content and avoid duplicates
          const uniqueLineContent = new Set();
          const lines = [];

          Array.from(viewLineElements).forEach((line, index) => {
            // Extract text from the line
            let lineText = "";

            // Try multiple methods to get the line text
            if (line.textContent) {
              lineText = line.textContent;
            } else if (line.innerText) {
              lineText = line.innerText;
            } else {
              // Fallback: collect text from all text nodes
              const textNodes = [];
              const walker = document.createTreeWalker(
                line,
                NodeFilter.SHOW_TEXT,
                null,
                false
              );

              let node;
              while ((node = walker.nextNode())) {
                if (node.textContent.trim()) {
                  textNodes.push(node.textContent);
                }
              }
              lineText = textNodes.join("");
            }

            // Only add line if we haven't seen this exact content before
            if (!uniqueLineContent.has(lineText)) {
              uniqueLineContent.add(lineText);
              lines.push(lineText);
              console.log(
                `ThinkDSA AI: Added line ${lines.length}: "${lineText}"`
              );
            } else {
              console.log(
                `ThinkDSA AI: Skipping duplicate line: "${lineText}"`
              );
            }
          });

          const code = lines.join("\n");
          if (code && code.trim()) {
            console.log(
              "ThinkDSA AI: ✅ SUCCESS via main view-lines:",
              code.length,
              "chars"
            );
            console.log("ThinkDSA AI: Complete extracted code:\n", code);
            return code;
          }
        }
      }
    }
  } catch (e) {
    console.log("ThinkDSA AI: Main view-lines extraction failed:", e);
  }

  // Method 2: Direct Monaco Editor API fallback
  if (window.monaco && window.monaco.editor) {
    const editors = window.monaco.editor.getEditors();
    console.log("ThinkDSA AI: Found", editors.length, "Monaco editors");

    if (editors.length > 0) {
      try {
        const code = editors[0].getValue();
        if (code && code.trim()) {
          console.log(
            "ThinkDSA AI: ✅ SUCCESS via Monaco API:",
            code.length,
            "chars"
          );
          console.log("ThinkDSA AI: Complete code:\n", code);
          return code;
        }
      } catch (e) {
        console.log("ThinkDSA AI: Monaco API failed:", e);
      }
    }
  }

  // Method 3: Access Monaco models directly
  try {
    if (window.monaco && window.monaco.editor) {
      const models = window.monaco.editor.getModels();
      console.log("ThinkDSA AI: Found", models.length, "Monaco models");

      for (const model of models) {
        const uri = model.uri.toString();
        console.log("ThinkDSA AI: Checking model URI:", uri);
        if (
          !uri.includes("vscode") &&
          !uri.includes("lib.") &&
          !uri.includes("node_modules")
        ) {
          const code = model.getValue();
          if (code && code.trim()) {
            console.log(
              "ThinkDSA AI: ✅ SUCCESS via Monaco model:",
              code.length,
              "chars"
            );
            console.log("ThinkDSA AI: Complete code:\n", code);
            return code;
          }
        }
      }
    }
  } catch (e) {
    console.log("ThinkDSA AI: Monaco models failed:", e);
  }

  // Method 4: Force complete viewport rendering and extract
  try {
    const monacoEditor = document.querySelector(".monaco-editor");
    if (monacoEditor) {
      const scrollableElement = monacoEditor.querySelector(
        ".monaco-scrollable-element"
      );
      const viewLinesElement = monacoEditor.querySelector(".view-lines");

      if (scrollableElement && viewLinesElement) {
        console.log("ThinkDSA AI: Attempting forced complete rendering...");

        // Store original state
        const originalScrollTop = scrollableElement.scrollTop;
        const originalHeight = scrollableElement.style.height;

        try {
          // Temporarily set to full height to render all content
          const fullHeight = scrollableElement.scrollHeight;
          scrollableElement.style.height = fullHeight + "px";
          scrollableElement.scrollTop = 0;

          // Force reflow
          scrollableElement.offsetHeight;

          // Small delay to ensure rendering
          setTimeout(() => {
            const viewLineElements =
              viewLinesElement.querySelectorAll(".view-line");
            console.log(
              "ThinkDSA AI: After forced rendering, found",
              viewLineElements.length,
              "lines"
            );

            if (viewLineElements.length > 0) {
              const lines = Array.from(viewLineElements).map((line, index) => {
                const spans = line.querySelectorAll("span");
                let lineText = "";

                spans.forEach((span) => {
                  const text = span.textContent || span.innerText || "";
                  lineText += text;
                });

                console.log(
                  `ThinkDSA AI: Forced Line ${index + 1}: "${lineText}"`
                );
                return lineText;
              });

              const code = lines.join("\n").trim();
              if (code) {
                console.log(
                  "ThinkDSA AI: ✅ SUCCESS via forced rendering:",
                  code.length,
                  "chars"
                );
                console.log("ThinkDSA AI: Complete code:\n", code);
                return code;
              }
            }
          }, 50);
        } finally {
          // Restore original state
          scrollableElement.style.height = originalHeight;
          scrollableElement.scrollTop = originalScrollTop;
        }
      }
    }
  } catch (e) {
    console.log("ThinkDSA AI: Forced rendering failed:", e);
  }

  // Method 5: Hidden textarea fallback
  const textareas = [
    document.querySelector('textarea[data-mprt="6"]'),
    document.querySelector("textarea.inputarea"),
    document.querySelector('textarea[aria-label*="Editor"]'),
    document.querySelector(".monaco-editor textarea"),
    ...document.querySelectorAll("textarea"),
  ].filter(Boolean);

  console.log(
    "ThinkDSA AI: Found",
    textareas.length,
    "textareas as final fallback"
  );

  for (const textarea of textareas) {
    if (textarea.value && textarea.value.trim()) {
      console.log(
        "ThinkDSA AI: ⚠️ FALLBACK via textarea:",
        textarea.value.length,
        "chars"
      );
      console.log("ThinkDSA AI: Textarea content:\n", textarea.value);
      return textarea.value;
    }
  }

  console.log("ThinkDSA AI: ❌ ALL EXTRACTION METHODS FAILED");
  return "";
}

// =======================================================================
// Score Management Functions
// =======================================================================

function addScoreButton() {
  // Find the target container for the score button (next to the AI button)
  const buttonBar = document.getElementById("ide-top-btns");
  if (!buttonBar) {
    console.log("ThinkDSA AI: Could not find button bar for score button");
    return;
  }

  // Remove existing score button if it exists
  const existingScoreButton = document.getElementById("thinkdsa-score-button");
  if (existingScoreButton) {
    existingScoreButton.remove();
  }

  // Create score button container
  const scoreButton = document.createElement("button");
  scoreButton.id = "thinkdsa-score-button";
  scoreButton.type = "button";
  scoreButton.title = "Your Understanding Score - Hover for breakdown";

  Object.assign(scoreButton.style, {
    backgroundColor: "transparent",
    color: "var(--text-primary)",
    height: "34px",
    padding: "0 12px",
    border: "1px solid var(--border-3)",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    fontFamily: "sans-serif",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    marginLeft: "8px",
    transition: "all 0.2s ease",
  });

  // Create brain icon
  const brainIcon = document.createElement("span");
  brainIcon.innerHTML = "🧠";
  brainIcon.style.fontSize = "16px";

  // Create score text
  const scoreText = document.createElement("span");
  scoreText.id = "thinkdsa-score-text";
  scoreText.textContent = "0/100";

  scoreButton.appendChild(brainIcon);
  scoreButton.appendChild(scoreText);
  buttonBar.appendChild(scoreButton);

  // Load and display initial score
  loadUserScore();

  // Add hover handlers
  scoreButton.onmouseenter = () => showScoreTooltip(scoreButton);
  scoreButton.onmouseleave = () => hideScoreTooltip();

  // Add click handler to show detailed breakdown
  scoreButton.onclick = () => showScoreBreakdown();

  console.log("ThinkDSA AI: Score button added successfully");
}

function loadUserScore() {
  // Get current problem identifier
  const problemTitle = getProblemTitle();
  const scoreKey = `score_${problemTitle.replace(/[^a-zA-Z0-9]/g, "_")}`;
  console.log("ThinkDSA AI: Loading score for key:", scoreKey);

  chrome.storage.sync.get([scoreKey], (data) => {
    const score = data[scoreKey] || 0;
    console.log(
      "ThinkDSA AI: Loaded score from storage:",
      score,
      "Raw data:",
      data
    );
    updateScoreDisplay(score);
  });
}

function updateScoreDisplay(score) {
  console.log("ThinkDSA AI: updateScoreDisplay called with score:", score);
  const scoreText = document.getElementById("thinkdsa-score-text");
  console.log("ThinkDSA AI: Score text element found:", !!scoreText);

  if (scoreText) {
    const color = getScoreColor(score);
    scoreText.textContent = `${score}/100`;
    scoreText.style.color = color;
    console.log(
      `ThinkDSA AI: Updated score display to ${score}/100 with color ${color}`
    );

    // Toggle original buttons based on score
    toggleOriginalButtons(score);
  } else {
    console.error("ThinkDSA AI: Could not find score text element to update");
  }
}

function getScoreColor(score) {
  if (score >= 80) return "#10B981"; // Green
  if (score >= 60) return "#F59E0B"; // Yellow
  if (score >= 40) return "#F97316"; // Orange
  return "#EF4444"; // Red
}

function updateUserScore(newScore, breakdown) {
  console.log("ThinkDSA AI: updateUserScore called with:", newScore, breakdown);
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
      console.log("ThinkDSA AI: Score saved to storage, updating display");
      updateScoreDisplay(newScore);
      console.log(
        `ThinkDSA AI: Updated score to ${newScore} for problem: ${problemTitle}`
      );
    }
  );
}

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
    tooltip.style.left = rect.left - 50 + "px";
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

${
  score >= 80
    ? "🎉 Great job! Run/Submit buttons are now available."
    : "Keep practicing to improve your score and unlock Run/Submit buttons!"
}
    `;

    displayResultInPanel(breakdownMessage);
  });
}

function clearOldScoreData() {
  // Clear any existing score data to start fresh
  const problemTitle = getProblemTitle();
  const scoreKey = `score_${problemTitle.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const breakdownKey = `breakdown_${problemTitle.replace(
    /[^a-zA-Z0-9]/g,
    "_"
  )}`;

  console.log("ThinkDSA AI: Clearing old score data for fresh start");
  chrome.storage.sync.remove([scoreKey, breakdownKey], () => {
    console.log("ThinkDSA AI: Old score data cleared");
    updateScoreDisplay(0); // Reset to 0
  });
}

// Start the extension
console.log("ThinkDSA AI: Starting extension...");
main();
