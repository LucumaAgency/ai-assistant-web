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
  const [error, setError] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [showTextInput, setShowTextInput] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        console.log('Speech recognized:', transcript);
        await handleUserMessage(transcript);
        setError('');
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setIsRecording(false);
        let errorMessage = 'Error de reconocimiento de voz';
        if (event.error === 'not-allowed') {
          errorMessage = 'Permiso de micrófono denegado. Por favor, permite el acceso al micrófono.';
        } else if (event.error === 'no-speech') {
          errorMessage = 'No se detectó voz. Intenta de nuevo.';
        } else if (event.error === 'network') {
          errorMessage = 'Error de red. Verifica tu conexión.';
        }
        setError(errorMessage);
      };

      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        setError('');
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  useEffect(() => {
    // Save messages to localStorage whenever they change
    localStorage.setItem('chatHistory', JSON.stringify(messages));
    // Scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setError('El reconocimiento de voz no está disponible en este navegador.');
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Error starting recognition:', err);
        setError('No se pudo iniciar el reconocimiento de voz. Verifica los permisos.');
      }
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem('chatHistory');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI Voice Assistant - v1.2</h1>
      </header>
      
      <div className="chat-container">
        <div className="messages">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <strong>{message.role === 'user' ? 'You' : 'AI'}:</strong> {message.content}
            </div>
          ))}
          {isLoading && <div className="message loading">AI is thinking...</div>}
          <div ref={messagesEndRef} />
        </div>
        
        {error && (
          <div style={{
            backgroundColor: 'rgba(255, 71, 87, 0.1)',
            color: '#ff4757',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '10px',
            textAlign: 'center',
            fontSize: '14px',
            fontFamily: 'Montserrat, sans-serif',
            border: '1px solid rgba(255, 71, 87, 0.3)'
          }}>
            {error}
          </div>
        )}
        
        <div className="controls">
          <button
            className={`voice-button ${isRecording ? 'recording' : ''}`}
            onClick={toggleRecording}
            disabled={isLoading}
          >
            {isRecording ? '🔴 Stop Recording' : '🎤 Start Recording'}
          </button>
          
          <button onClick={clearHistory} className="clear-button">
            Clear History
          </button>
          
          <button 
            onClick={() => setShowTextInput(!showTextInput)} 
            className="clear-button"
            style={{ marginLeft: '10px' }}
          >
            {showTextInput ? 'Hide Text' : 'Text Input'}
          </button>
        </div>
        
        {showTextInput && (
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && inputText.trim()) {
                  handleUserMessage(inputText.trim());
                  setInputText('');
                }
              }}
              placeholder="Escribe tu mensaje aquí..."
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '25px',
                border: '1px solid #2a2d30',
                backgroundColor: '#1a1c1e',
                color: '#e0e0e0',
                fontSize: '15px',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: '400',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#407bff'}
              onBlur={(e) => e.target.style.borderColor = '#2a2d30'}
            />
            <button
              onClick={() => {
                if (inputText.trim()) {
                  handleUserMessage(inputText.trim());
                  setInputText('');
                }
              }}
              disabled={isLoading || !inputText.trim()}
              className="voice-button"
              style={{ width: 'auto' }}
            >
              Enviar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App
