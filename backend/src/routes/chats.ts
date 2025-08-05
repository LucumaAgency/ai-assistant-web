import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// Get all chats for a user
router.get('/users/:userId/chats', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const [rows] = await pool.execute(
      'SELECT * FROM chats WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Error fetching chats' });
  }
});

// Get messages for a chat
router.get('/chats/:chatId/messages', async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const [rows] = await pool.execute(
      'SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp',
      [chatId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// Create a new chat
router.post('/chats', async (req: Request, res: Response) => {
  try {
    const { user_id, folder_id, title } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO chats (user_id, folder_id, title, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [user_id, folder_id || null, title || 'Nueva conversación']
    );
    const insertId = (result as any).insertId;
    res.json({ 
      id: insertId, 
      user_id, 
      folder_id, 
      title: title || 'Nueva conversación',
      messages: []
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Error creating chat' });
  }
});

// Update a chat
router.put('/chats/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { folder_id, title } = req.body;
    await pool.execute(
      'UPDATE chats SET folder_id = ?, title = ?, updated_at = NOW() WHERE id = ?',
      [folder_id || null, title, id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating chat:', error);
    res.status(500).json({ error: 'Error updating chat' });
  }
});

// Delete a chat
router.delete('/chats/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // First delete all messages
    await pool.execute('DELETE FROM messages WHERE chat_id = ?', [id]);
    // Then delete the chat
    await pool.execute('DELETE FROM chats WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: 'Error deleting chat' });
  }
});

// Add a message to a chat
router.post('/chats/:chatId/messages', async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { role, content } = req.body;
    
    const [result] = await pool.execute(
      'INSERT INTO messages (chat_id, role, content, timestamp) VALUES (?, ?, ?, NOW())',
      [chatId, role, content]
    );
    
    // Update chat's updated_at timestamp
    await pool.execute(
      'UPDATE chats SET updated_at = NOW() WHERE id = ?',
      [chatId]
    );
    
    const insertId = (result as any).insertId;
    res.json({ 
      id: insertId, 
      chat_id: chatId, 
      role, 
      content,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Error adding message' });
  }
});

export default router;