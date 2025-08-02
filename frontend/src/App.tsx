import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Load messages from localStorage
    const savedMessages = localStorage.getItem('chatHistory');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }

    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'es-ES'; // Change to 'en-US' for English

      recognitionRef.current.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        await handleUserMessage(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  useEffect(() => {
    // Save messages to localStorage whenever they change
    localStorage.setItem('chatHistory', JSON.stringify(messages));
  }, [messages]);

  const handleUserMessage = async (text: string) => {
    const newMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await axios.post('/api/chat', {
        message: text,
        history: messages
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.message
      };

      setMessages([...updatedMessages, assistantMessage]);
      
      // Text to speech
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(response.data.message);
        utterance.lang = 'es-ES'; // Change to 'en-US' for English
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Error calling API:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem('chatHistory');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI Voice Assistant - v1.1</h1>
      </header>
      
      <div className="chat-container">
        <div className="messages">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <strong>{message.role === 'user' ? 'You' : 'AI'}:</strong> {message.content}
            </div>
          ))}
          {isLoading && <div className="message loading">AI is thinking...</div>}
        </div>
        
        <div className="controls">
          <button
            className={`voice-button ${isRecording ? 'recording' : ''}`}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isLoading}
          >
            {isRecording ? '🔴 Recording...' : '🎤 Hold to Talk'}
          </button>
          
          <button onClick={clearHistory} className="clear-button">
            Clear History
          </button>
        </div>
      </div>
    </div>
  );
}

export default App
