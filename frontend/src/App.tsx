import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Chat {
  id: string;
  messages: Message[];
  folderId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  color: string;
}

const DEFAULT_FOLDERS: Folder[] = [
  { id: 'trabajo', name: 'Trabajo', color: '#407bff' },
  { id: 'fitness', name: 'Fitness', color: '#00c896' },
  { id: 'personal', name: 'Personal', color: '#ff6b6b' },
  { id: 'ideas', name: 'Ideas', color: '#9c27b0' },
];

function App() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [folders, setFolders] = useState<Folder[]>(DEFAULT_FOLDERS);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);

  const currentChat = chats.find(chat => chat.id === currentChatId);
  const messages = currentChat?.messages || [];

  useEffect(() => {
    // Load data from localStorage
    const savedChats = localStorage.getItem('chats');
    const savedFolders = localStorage.getItem('folders');
    const savedCurrentChatId = localStorage.getItem('currentChatId');
    
    if (savedChats) {
      setChats(JSON.parse(savedChats));
    }
    if (savedFolders) {
      setFolders(JSON.parse(savedFolders));
    }
    if (savedCurrentChatId) {
      setCurrentChatId(savedCurrentChatId);
    }

    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'es-ES';

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
    // Save data to localStorage
    localStorage.setItem('chats', JSON.stringify(chats));
    localStorage.setItem('folders', JSON.stringify(folders));
    if (currentChatId) {
      localStorage.setItem('currentChatId', currentChatId);
    }
  }, [chats, folders, currentChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close chat menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chatMenuOpen && !(e.target as HTMLElement).closest('.chat-menu-wrapper')) {
        setChatMenuOpen(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [chatMenuOpen]);

  // Handle swipe to close sidebar on mobile
  useEffect(() => {
    if (!showSidebar || !sidebarRef.current) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchEndX = e.touches[0].clientX;
      const diff = touchStartX.current - touchEndX;
      
      // If swiped left more than 50px, close sidebar
      if (diff > 50) {
        setShowSidebar(false);
      }
    };

    const sidebar = sidebarRef.current;
    sidebar.addEventListener('touchstart', handleTouchStart);
    sidebar.addEventListener('touchmove', handleTouchMove);

    return () => {
      sidebar.removeEventListener('touchstart', handleTouchStart);
      sidebar.removeEventListener('touchmove', handleTouchMove);
    };
  }, [showSidebar]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createNewChat = (folderId: string | null = null) => {
    const newChat: Chat = {
      id: Date.now().toString(),
      messages: [],
      folderId: folderId || selectedFolderId,
      title: 'Nueva conversación',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setChats([...chats, newChat]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  };

  const handleUserMessage = async (text: string) => {
    let chatId = currentChatId;
    
    // Create new chat if none exists
    if (!chatId) {
      chatId = createNewChat();
    }
    
    console.log('Handling message for chat:', chatId);
    console.log('Current chats:', chats);

    const newMessage: Message = { 
      role: 'user', 
      content: text,
      timestamp: new Date().toISOString()
    };

    // Update chat with new message
    // Find the current chat first, or create it if it doesn't exist
    let workingChats = [...chats];
    let workingChat = workingChats.find(chat => chat.id === chatId);
    
    if (!workingChat) {
      // This shouldn't happen, but just in case
      const newChat: Chat = {
        id: chatId,
        messages: [],
        folderId: selectedFolderId,
        title: text.substring(0, 50),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      workingChats.push(newChat);
      workingChat = newChat;
    }

    // Update chat with new message
    const updatedChats = workingChats.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          messages: [...chat.messages, newMessage],
          updatedAt: new Date().toISOString(),
          title: chat.messages.length === 0 ? text.substring(0, 50) : chat.title
        };
      }
      return chat;
    });

    setChats(updatedChats);
    setIsLoading(true);
    setInputText('');

    try {
      const chatForApi = updatedChats.find(chat => chat.id === chatId);
      const response = await axios.post('/api/chat', {
        message: text,
        history: chatForApi?.messages.slice(-10) || []
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date().toISOString()
      };

      // Update chat with assistant response
      const finalChatId = chatId; // Capture the chatId in a const to avoid closure issues
      setChats(prevChats => {
        console.log('Updating chats with assistant response for chat:', finalChatId);
        return prevChats.map(chat => {
          if (chat.id === finalChatId) {
            const updatedChat = {
              ...chat,
              messages: [...chat.messages, assistantMessage],
              updatedAt: new Date().toISOString()
            };
            console.log('Updated chat messages:', updatedChat.messages);
            return updatedChat;
          }
          return chat;
        });
      });
      
      // Text to speech removed per user request
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

  const selectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setShowSidebar(false);
  };

  const deleteChat = (chatId: string) => {
    setChats(chats.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
  };

  const assignChatToFolder = (chatId: string, folderId: string | null) => {
    setChats(chats.map(chat => 
      chat.id === chatId ? { ...chat, folderId } : chat
    ));
  };

  const filteredChats = selectedFolderId 
    ? chats.filter(chat => chat.folderId === selectedFolderId)
    : chats;

  const hasMessages = messages.length > 0;

  return (
    <div className="App">
      <button 
        className="menu-button"
        onClick={() => setShowSidebar(!showSidebar)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      {showSidebar && (
        <div className="sidebar" ref={sidebarRef}>
          <div className="sidebar-header">
            <h2>Chats</h2>
            <div className="sidebar-header-buttons">
              <button 
                className="new-chat-button"
                onClick={() => {
                  createNewChat();
                  setShowSidebar(false);
                }}
              >
                Nueva
              </button>
              <button 
                className="close-sidebar-button"
                onClick={() => setShowSidebar(false)}
                aria-label="Cerrar sidebar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <div className="folders-section">
            <div className="folders-header">
              <h3>Carpetas</h3>
              <button 
                className="add-folder-button"
                onClick={() => setShowFolderModal(true)}
              >
                +
              </button>
            </div>
            <div className="folders-list">
              <button
                className={`folder-item ${selectedFolderId === null ? 'active' : ''}`}
                onClick={() => setSelectedFolderId(null)}
              >
                <span className="folder-icon" style={{ backgroundColor: '#606060' }}>📁</span>
                Todas
              </button>
              {folders.map(folder => (
                <button
                  key={folder.id}
                  className={`folder-item ${selectedFolderId === folder.id ? 'active' : ''}`}
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  <span className="folder-icon" style={{ backgroundColor: folder.color }}>📁</span>
                  {folder.name}
                </button>
              ))}
            </div>
          </div>

          <div className="chats-list">
            {filteredChats.length === 0 ? (
              <div className="empty-chats">No hay conversaciones</div>
            ) : (
              filteredChats.map(chat => (
                <div 
                  key={chat.id} 
                  className={`chat-item ${chat.id === currentChatId ? 'active' : ''}`}
                  onClick={() => selectChat(chat.id)}
                >
                  <div className="chat-item-content">
                    <div className="chat-title">{chat.title}</div>
                    <div className="chat-date">
                      {new Date(chat.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="chat-menu-wrapper">
                    <button 
                      className="chat-menu-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatMenuOpen(chatMenuOpen === chat.id ? null : chat.id);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2"></circle>
                        <circle cx="12" cy="12" r="2"></circle>
                        <circle cx="12" cy="19" r="2"></circle>
                      </svg>
                    </button>
                    {chatMenuOpen === chat.id && (
                      <div className="chat-menu-dropdown">
                        <button
                          className="chat-menu-option"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentChatId(chat.id);
                            setShowFolderModal(true);
                            setChatMenuOpen(null);
                          }}
                        >
                          📁 Asignar carpeta
                        </button>
                        <button
                          className="chat-menu-option delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChat(chat.id);
                            setChatMenuOpen(null);
                          }}
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {currentChat && showFolderModal && (
        <div className="modal-overlay" onClick={() => setShowFolderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Asignar a carpeta</h3>
            <div className="folder-options">
              <button
                className="folder-option"
                onClick={() => {
                  assignChatToFolder(currentChat.id, null);
                  setShowFolderModal(false);
                }}
              >
                Sin carpeta
              </button>
              {folders.map(folder => (
                <button
                  key={folder.id}
                  className="folder-option"
                  onClick={() => {
                    assignChatToFolder(currentChat.id, folder.id);
                    setShowFolderModal(false);
                  }}
                >
                  <span style={{ color: folder.color }}>●</span> {folder.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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