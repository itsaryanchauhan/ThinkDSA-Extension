// Demo script to showcase the score system functionality
console.log("=== ThinkDSA AI Score System Demo ===");

// Example AI response with score assessment
const exampleAIResponse = `Great start! I can see you're thinking about using a hash map to solve this Two Sum problem. 

Here's a hint: Instead of checking if the complement exists after adding the current number to the map, try checking for the complement first.

SCORE_ASSESSMENT: {"overall": 65, "breakdown": {"conceptual": 18, "implementation": 15, "optimization": 16, "testing": 16}}`;

// Simulate score extraction (this happens in background.js)
function extractScoreFromResponse(response) {
  const scoreMatch = response.match(/SCORE_ASSESSMENT:\s*(\{.*?\})/s);
  if (scoreMatch) {
    try {
      const jsonStr = scoreMatch[1];
      console.log("JSON to parse:", jsonStr);
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse score:", e);
      return null;
    }
  }
  return null;
}

// Demo the score extraction
const extractedScore = extractScoreFromResponse(exampleAIResponse);
console.log("Extracted Score:", extractedScore);

// Clean response (removing score assessment)
const cleanResponse = exampleAIResponse
  .replace(/SCORE_ASSESSMENT:\s*\{.*?\}/s, "")
  .trim();
console.log("Clean Response:", cleanResponse);

// Simulate score color coding
function getScoreColor(score) {
  if (score >= 80) return "#10B981"; // Green
  if (score >= 60) return "#F59E0B"; // Yellow
  if (score >= 40) return "#F97316"; // Orange
  return "#EF4444"; // Red
}

console.log("Score Color for 65:", getScoreColor(65)); // Should be Yellow
console.log("=== Demo Complete ===");
