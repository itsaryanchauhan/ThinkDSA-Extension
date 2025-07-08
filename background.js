const SYSTEM_PROMPT = `
You are "Sudo", an expert programming tutor who helps users solve LeetCode problems. 
Your personality is encouraging and wise. You specialize in the Socratic method.
You will be provided with the user's selected programming language. Use this to tailor your feedback.

Your primary goal is to guide the user to the correct solution. You must follow these rules strictly:

1.  **ADAPTIVE FEEDBACK:** Your response must adapt based on whether the user has provided code.
    *   **Initial Hint (No User Code):** If no code is provided, give a single, high-level, conceptual starting point. Suggest a general approach, data structure, or algorithm. This hint should be language-agnostic. Example: "This problem can be efficiently solved by keeping track of numbers you've already seen. What data structure is good for fast lookups?"
    *   **Code Feedback (User Code Provided):** If code is provided, analyze it within the context of the specified language. You can now offer language-specific advice.
        - Point out syntax errors.
        - Address logical bugs.
        - Suggest improvements using language-specific features (e.g., "In Python, you could use a 'set' for O(1) lookups instead of checking for inclusion in a 'list' which is O(n).").
        - Discuss edge cases (e.g., "What happens if the input array is empty?").
        - Analyze time/space complexity.

2.  **NEVER GIVE THE FULL SOLUTION (UNLESS ASKED):** Do not provide a complete, final, copy-pasteable solution unless the user is completely stuck and explicitly asks for it. Your role is to provide *snippets* to fix or demonstrate a concept, not to write the whole function for them. The goal is to make the user think.

3.  **LAST RESORT - EXPLICIT REQUESTS:** Only if the user explicitly and repeatedly asks for the full code (e.g., "I give up, just show me the answer"), you may provide a complete, well-commented solution *in the user's specified language*. Preface this with a clear warning: "Warning: Looking at the solution will not help you learn. The real growth comes from the struggle. As requested, here is the complete solution in {language}:"

4.  **SCORING SYSTEM:** Internally evaluate the user's understanding on a scale of 0-100 based on:
   - Conceptual Understanding (0-25): How well they grasp the problem and approach
   - Implementation Quality (0-25): Code correctness, syntax, and structure  
   - Code Optimization (0-25): Efficiency, time/space complexity awareness
   - Edge Case Handling (0-25): Consideration of corner cases and robustness

   At the end of your response, add this score assessment in a specific JSON format (this will be parsed and not shown to the user):
   SCORE_ASSESSMENT: {"overall": X, "breakdown": {"conceptual": Y, "implementation": Z, "optimization": W, "testing": V}}
   Where X is 0-100 (sum of Y+Z+W+V) and Y,Z,W,V are each 0-25.

5.  **FORMATTING:** Keep responses concise. Use Markdown for readability. Use triple backticks with the language name for code blocks (e.g., \`\`\`python ... \`\`\`). Use single backticks for \`variable_names\` or short \`code_snippets\`.
`;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("ThinkDSA AI Background: Received message:", request.action);

  if (request.action === "getAIHelp") {
    chrome.storage.sync.get("geminiApiKey", (data) => {
      const apiKey = data.geminiApiKey;
      console.log("ThinkDSA AI Background: API key present:", !!apiKey);

      if (!apiKey) {
        sendResponse({
          error: "API Key not found. Please set it in the extension popup.",
        });
        return;
      }

      let userPrompt;
      const { title, description, language, userCode } = request.problemDetails;
      const hasUserCode = userCode && userCode.trim() !== "";
      const hasLanguage = language && language !== "N/A";

      if (hasUserCode) {
        userPrompt = `
          Problem Title: ${title}
          Selected Language: ${language}
          Problem Description: ${description}
          My Code (in ${language}):
          \`\`\`${language.toLowerCase()}
          ${userCode}
          \`\`\`
          Please analyze my code based on your rules. Give me a specific, language-aware hint to help me improve it or fix bugs. Remember to include the SCORE_ASSESSMENT at the end.`;
      } else {
        // REFINED PROMPT: More explicit instructions for the initial hint.
        userPrompt = `
          Problem Title: ${title}
          Selected Language: ${language}
          Problem Description: ${description}
          I haven't written any code yet. 
          **Instruction:** Based on the problem description, provide an initial, high-level, language-agnostic hint to get me started. Do not mention the language even if it is provided. Focus on algorithms or data structures. Remember to include the SCORE_ASSESSMENT at the end (for no code, give a baseline score focusing on conceptual understanding potential).`;
      }

      const finalPrompt = `${SYSTEM_PROMPT}\n\n---\n\n${userPrompt}`;
      callGeminiAPI(apiKey, finalPrompt, request.problemDetails, sendResponse);
    });
    return true;
  }
});

// The callGeminiAPI function remains exactly the same as before.
async function callGeminiAPI(apiKey, prompt, problemDetails, sendResponse) {
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
  };
  console.group("ThinkDSA AI: Preparing to call Gemini API");
  console.log("API Key Found:", !!apiKey);
  console.log("Problem Details Received:", problemDetails);
  console.log("--- Full Prompt Sent to Gemini ---");
  console.log(prompt);
  console.groupEnd();
  let lastError = null;
  const maxRetries = 2;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const errorBody = await response.json();
        if (
          response.status === 429 ||
          errorBody.error?.message.includes("overloaded")
        ) {
          lastError = new Error(
            `API Error: ${errorBody.error.message} (attempt ${i + 1})`
          );
          if (i < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
            continue;
          }
        }
        throw new Error(`API Error: ${errorBody.error.message}`);
      }
      const data = await response.json();
      if (
        data.candidates &&
        data.candidates[0].content &&
        data.candidates[0].content.parts
      ) {
        const fullResponse = data.candidates[0].content.parts[0].text;

        // Extract score assessment if present
        const scoreMatch = fullResponse.match(/SCORE_ASSESSMENT:\s*(\{.*?\})/s);
        let scoreData = null;
        let hint = fullResponse;

        if (scoreMatch) {
          try {
            scoreData = JSON.parse(scoreMatch[1]);
            // Remove the score assessment from the hint text
            hint = fullResponse
              .replace(/SCORE_ASSESSMENT:\s*\{.*?\}/s, "")
              .trim();
          } catch (e) {
            console.error("Failed to parse score assessment:", e);
          }
        }

        sendResponse({
          hint: hint,
          score: scoreData,
        });
        return;
      } else {
        const blockReason = data.promptFeedback?.blockReason;
        const finishReason = data.candidates?.[0]?.finishReason;
        throw new Error(
          `Unexpected response format. Block Reason: ${
            blockReason || "N/A"
          }. Finish Reason: ${finishReason || "N/A"}.`
        );
      }
    } catch (error) {
      lastError = error;
    }
  }
  console.error("Gemini API call failed after all retries:", lastError);
  sendResponse({
    error: `Failed to get response from AI. ${lastError.message}`,
  });
}
