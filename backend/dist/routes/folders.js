"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get all folders for a user (protected)
router.get('/users/:userId/folders', auth_1.authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const [rows] = await database_1.default.execute('SELECT * FROM folders WHERE user_id = ? ORDER BY created_at', [userId]);
        res.json(rows);
    }
    catch (error) {
        console.error('Error fetching folders:', error);
        res.status(500).json({ error: 'Error fetching folders' });
    }
});
// Create a new folder (protected)
router.post('/folders', auth_1.authenticateToken, async (req, res) => {
    try {
        const { user_id, name, color, system_prompt } = req.body;
        const [result] = await database_1.default.execute('INSERT INTO folders (user_id, name, color, system_prompt, created_at) VALUES (?, ?, ?, ?, NOW())', [user_id, name, color, system_prompt]);
        const insertId = result.insertId;
        res.json({ id: insertId, user_id, name, color, system_prompt });
    }
    catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).json({ error: 'Error creating folder' });
    }
});
// Update a folder (protected)
router.put('/folders/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, color, system_prompt } = req.body;
        await database_1.default.execute('UPDATE folders SET name = ?, color = ?, system_prompt = ? WHERE id = ?', [name, color, system_prompt, id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error updating folder:', error);
        res.status(500).json({ error: 'Error updating folder' });
    }
});
// Delete a folder (protected)
router.delete('/folders/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.default.execute('DELETE FROM folders WHERE id = ?', [id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting folder:', error);
        res.status(500).json({ error: 'Error deleting folder' });
    }
});
exports.default = router;
