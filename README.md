# ThinkDSA AI Extension

A Chrome extension that helps users solve LeetCode problems with AI-powered hints and real-time understanding scores.

## Features

### 🎯 AI-Powered Hints

- Get contextual hints based on your current code
- Socratic method teaching approach
- Language-specific feedback and suggestions

### 📊 Understanding Score System

- **Real-time scoring**: Your understanding is scored from 0-100 based on AI analysis
- **Score breakdown**: Detailed feedback across 4 dimensions:
  - **Conceptual Understanding** (0-25): How well you grasp the problem and approach
  - **Implementation Quality** (0-25): Code correctness, syntax, and structure
  - **Code Optimization** (0-25): Efficiency, time/space complexity awareness
  - **Edge Case Handling** (0-25): Consideration of corner cases and robustness

### 🎨 Score Display

- **Visual Score Button**: Located in the top navigation bar (left of layout manager)
- **Color-coded scoring**:
  - 🟢 Green (80-100): Excellent understanding
  - 🟡 Yellow (60-79): Good understanding
  - 🟠 Orange (40-59): Needs improvement
  - 🔴 Red (0-39): Requires more practice
- **Click for breakdown**: Click the score button to see detailed analysis

## How It Works

1. **Initial Assessment**: When you first visit a problem, the AI provides a baseline score
2. **Progressive Scoring**: As you write code and request hints, your score updates in real-time
3. **Personalized Feedback**: The AI adapts its hints based on your current understanding level
4. **Progress Tracking**: Scores are saved per problem, so you can track improvement over time

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder
5. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
6. Click the extension icon and enter your API key
7. Enable the extension and start solving LeetCode problems!

## Usage

1. Navigate to any LeetCode problem
2. The extension automatically initializes and shows your current score (0/100 initially)
3. Click "Get Hint" to receive AI-powered guidance
4. Your score updates automatically based on your code quality and understanding
5. Click the score button (🧠 icon) to see detailed breakdown

## Score Calculation

The AI evaluates your code and understanding across four key areas:

- **Conceptual Understanding**: Do you understand the problem requirements and approach?
- **Implementation Quality**: Is your code syntactically correct and well-structured?
- **Code Optimization**: Are you considering time/space complexity and efficiency?
- **Edge Case Handling**: Are you thinking about corner cases and error handling?

## Privacy & Data

- Scores are stored locally in Chrome's sync storage
- Only your code and problem details are sent to the AI for analysis
- No personal data is collected or shared

## Technical Details

- **Platform**: Chrome Extension (Manifest V3)
- **AI Model**: Google Gemini 1.5 Flash
- **Storage**: Chrome Sync Storage for cross-device score persistence
- **Injection**: Content script injection on LeetCode problem pages

## Contributing

Feel free to contribute improvements, bug fixes, or new features!

## License

MIT License - feel free to modify and distribute.
