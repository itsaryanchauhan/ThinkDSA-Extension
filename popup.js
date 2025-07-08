// popup.js (Updated for the new UI)

document.addEventListener("DOMContentLoaded", () => {
  // Select all the elements we'll be working with
  const toggle = document.getElementById("toggle");
  const apiKeyInput = document.getElementById("api-key");
  const saveBtn = document.getElementById("save-btn");
  const statusMessage = document.getElementById("status-message");

  // --- 1. Load saved settings from Chrome storage when the popup opens ---
  chrome.storage.sync.get(["enabled", "geminiApiKey"], (data) => {
    // Set the toggle switch state. Defaults to false if not set.
    toggle.checked = !!data.enabled;

    // Set the API key input value if it exists
    if (data.geminiApiKey) {
      apiKeyInput.value = data.geminiApiKey;
    }
  });

  // --- 2. Save settings when the button is clicked ---
  saveBtn.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    const isEnabled = toggle.checked;

    // --- Replaced alert() with a modern status message for validation ---
    if (!apiKey) {
      // Show an error message
      statusMessage.textContent = "Please enter your Gemini API Key.";
      statusMessage.style.color = "#f87171"; // A reddish color for errors
      statusMessage.classList.add("show");

      // Hide the message after 3 seconds
      setTimeout(() => {
        statusMessage.classList.remove("show");
      }, 3000);
      return; // Stop the function here
    }

    // Save the settings to Chrome's synchronized storage
    chrome.storage.sync.set(
      { geminiApiKey: apiKey, enabled: isEnabled },
      () => {
        // --- Replaced alert() with a modern status message for success ---
        // Show a success message
        statusMessage.textContent = "Settings Saved!";
        statusMessage.style.color = "#4ade80"; // A nice green for success
        statusMessage.classList.add("show");

        // Hide the message after 2 seconds
        setTimeout(() => {
          statusMessage.classList.remove("show");
        }, 2000);

        // --- Keep your original logic to reload the LeetCode tab ---
        // This is great for applying changes immediately.
        chrome.tabs.query(
          { active: true, url: "https://leetcode.com/problems/*" },
          (tabs) => {
            if (tabs.length > 0) {
              chrome.tabs.reload(tabs[0].id);
            }
          }
        );
      }
    );
  });
});
