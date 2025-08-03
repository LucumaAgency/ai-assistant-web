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
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setInputText('');

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
      setError('Error al conectar con el servidor. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      handleUserMessage(inputText.trim());
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="App">
      {hasMessages ? (
        <>
          <div className="chat-view">
            <div className="messages-container">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  <div className="message-content">
                    {message.role === 'user' ? (
                      <span className="message-label">Tú</span>
                    ) : (
                      <span className="message-label">AI</span>
                    )}
                    <p>{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message assistant">
                  <div className="message-content">
                    <span className="message-label">AI</span>
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          <div className="input-container bottom">
            <form onSubmit={handleSubmit} className="input-form">
              <div className="input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  className="text-input"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`mic-button ${isRecording ? 'recording' : ''}`}
                  disabled={isLoading}
                  aria-label="Grabar mensaje"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </>
      ) : (
        <div className="landing-view">
          <div className="landing-content">
            <h1 className="landing-title">AI Voice Assistant</h1>
            <p className="landing-subtitle">¿En qué puedo ayudarte hoy?</p>
            
            <div className="input-container centered">
              <form onSubmit={handleSubmit} className="input-form">
                <div className="input-wrapper">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Escribe tu mensaje..."
                    className="text-input"
                    disabled={isLoading}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`mic-button ${isRecording ? 'recording' : ''}`}
                    disabled={isLoading}
                    aria-label="Grabar mensaje"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                      <line x1="12" y1="19" x2="12" y2="23"></line>
                      <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="error-toast">
          {error}
        </div>
      )}
    </div>
  );
}

export default App