import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import pool from './config/database';
import foldersRouter from './routes/folders';
import chatsRouter from './routes/chats';
import authRouter from './routes/auth';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Debug logging
console.log('=== SERVER STARTUP DEBUG ===');
console.log('PORT:', port);
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...` : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('===========================');

if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
  console.error('⚠️  WARNING: OPENAI_API_KEY is not properly configured!');
  console.error('Please set a valid OpenAI API key in the .env file');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.method === 'POST') {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here'),
    databaseConnected: true
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api', foldersRouter);
app.use('/api', chatsRouter);

app.post('/api/chat', async (req, res) => {
  console.log('=== CHAT ENDPOINT HIT ===');
  
  try {
    const { message, history, chatId, folderId } = req.body;
    console.log('Received message:', message);
    console.log('History length:', history?.length || 0);
    console.log('Chat ID:', chatId);
    console.log('Folder ID:', folderId);

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      console.error('API Key not configured properly');
      return res.status(500).json({ 
        error: 'OpenAI API key not configured. Please check server configuration.' 
      });
    }

    // Get system prompt from folder if folderId is provided
    let systemPrompt = 'You are a helpful AI assistant.';
    if (folderId) {
      try {
        const [folderRows] = await pool.execute(
          'SELECT system_prompt FROM folders WHERE id = ?',
          [folderId]
        );
        const folder = (folderRows as any[])[0];
        if (folder && folder.system_prompt) {
          systemPrompt = folder.system_prompt;
          console.log('Using custom system prompt from folder:', systemPrompt);
        }
      } catch (err) {
        console.error('Error fetching folder system prompt:', err);
      }
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ];

    console.log('Calling OpenAI API with system prompt:', systemPrompt.substring(0, 50) + '...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages as any,
    });

    const assistantMessage = completion.choices[0].message.content;
    console.log('OpenAI response received, length:', assistantMessage?.length);

    // Save messages to database if chatId is provided
    if (chatId) {
      try {
        // Save user message
        await pool.execute(
          'INSERT INTO messages (chat_id, role, content, timestamp) VALUES (?, ?, ?, NOW())',
          [chatId, 'user', message]
        );
        
        // Save assistant message
        await pool.execute(
          'INSERT INTO messages (chat_id, role, content, timestamp) VALUES (?, ?, ?, NOW())',
          [chatId, 'assistant', assistantMessage]
        );
        
        // Update chat's updated_at and title if it's the first message
        const [chatRows] = await pool.execute(
          'SELECT title FROM chats WHERE id = ?',
          [chatId]
        );
        const chat = (chatRows as any[])[0];
        
        if (chat && (chat.title === 'Nueva conversación' || !chat.title)) {
          // Update title with first message (truncated to 50 chars)
          const newTitle = message.substring(0, 50);
          await pool.execute(
            'UPDATE chats SET title = ?, updated_at = NOW() WHERE id = ?',
            [newTitle, chatId]
          );
        } else {
          // Just update the timestamp
          await pool.execute(
            'UPDATE chats SET updated_at = NOW() WHERE id = ?',
            [chatId]
          );
        }
        
        console.log('Messages saved to database');
      } catch (err) {
        console.error('Error saving messages to database:', err);
      }
    }

    res.json({ message: assistantMessage });
  } catch (error: any) {
    console.error('=== ERROR IN CHAT ENDPOINT ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error details:', error);
    
    if (error?.status === 401) {
      res.status(500).json({ error: 'Invalid API key. Please check your OpenAI API key.' });
    } else if (error?.status === 429) {
      res.status(500).json({ error: 'Rate limit exceeded. Please try again later.' });
    } else if (error?.status === 404) {
      res.status(500).json({ error: 'Model not found. The gpt-4o model may not be available.' });
    } else {
      res.status(500).json({ error: `Server error: ${error?.message || 'Unknown error'}` });
    }
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📡 Health check available at http://localhost:${port}/api/health`);
});