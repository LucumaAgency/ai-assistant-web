"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const openai_1 = __importDefault(require("openai"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        const messages = [
            { role: 'system', content: 'You are a helpful AI assistant.' },
            ...history,
            { role: 'user', content: message }
        ];
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
        });
        const assistantMessage = completion.choices[0].message.content;
        res.json({ message: assistantMessage });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
