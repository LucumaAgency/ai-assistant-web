# AI Assistant Web MVP

A web-based AI voice assistant using React, Node.js, Google Web Speech API, and OpenAI GPT-4o.

## Features

- Voice input using Google Web Speech API
- AI responses powered by OpenAI GPT-4o
- Text-to-speech for AI responses
- Conversation history stored in browser localStorage
- Clean and responsive UI

## Setup

### Prerequisites

- Node.js (v14 or higher)
- OpenAI API key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Add your OpenAI API key to the `.env` file:
   ```
   OPENAI_API_KEY=your_actual_api_key_here
   PORT=3001
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. In a new terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```

4. Open your browser and go to `http://localhost:5173`

## Usage

1. Click and hold the "Hold to Talk" button to record your voice
2. Release the button to send your message to the AI
3. The AI will respond with both text and speech
4. Your conversation history is automatically saved in the browser
5. Click "Clear History" to start a new conversation

## Notes

- The app uses the Web Speech API, which works best in Chrome/Edge browsers
- Make sure to allow microphone permissions when prompted
- The language is set to Spanish (es-ES) by default. To change to English, modify the `lang` property in `App.tsx`

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **AI**: OpenAI GPT-4o
- **Voice**: Web Speech API (Speech Recognition & Synthesis)
- **Storage**: Browser localStorage