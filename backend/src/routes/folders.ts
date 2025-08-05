import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// Get all folders for a user
router.get('/users/:userId/folders', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const [rows] = await pool.execute(
      'SELECT * FROM folders WHERE user_id = ? ORDER BY created_at',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Error fetching folders' });
  }
});

// Create a new folder
router.post('/folders', async (req: Request, res: Response) => {
  try {
    const { user_id, name, color, system_prompt } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO folders (user_id, name, color, system_prompt, created_at) VALUES (?, ?, ?, ?, NOW())',
      [user_id, name, color, system_prompt]
    );
    const insertId = (result as any).insertId;
    res.json({ id: insertId, user_id, name, color, system_prompt });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Error creating folder' });
  }
});

// Update a folder
router.put('/folders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, system_prompt } = req.body;
    await pool.execute(
      'UPDATE folders SET name = ?, color = ?, system_prompt = ? WHERE id = ?',
      [name, color, system_prompt, id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({ error: 'Error updating folder' });
  }
});

// Delete a folder
router.delete('/folders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM folders WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Error deleting folder' });
  }
});

export default router;