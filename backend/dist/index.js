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
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
        apiKeyConfigured: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here')
    });
});
app.post('/api/chat', async (req, res) => {
    console.log('=== CHAT ENDPOINT HIT ===');
    try {
        const { message, history } = req.body;
        console.log('Received message:', message);
        console.log('History length:', history?.length || 0);
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
            console.error('API Key not configured properly');
            return res.status(500).json({
                error: 'OpenAI API key not configured. Please check server configuration.'
            });
        }
        const messages = [
            { role: 'system', content: 'You are a helpful AI assistant.' },
            ...history,
            { role: 'user', content: message }
        ];
        console.log('Calling OpenAI API...');
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
        });
        const assistantMessage = completion.choices[0].message.content;
        console.log('OpenAI response received, length:', assistantMessage?.length);
        res.json({ message: assistantMessage });
    }
    catch (error) {
        console.error('=== ERROR IN CHAT ENDPOINT ===');
        console.error('Error type:', error?.constructor?.name);
        console.error('Error message:', error?.message);
        console.error('Error details:', error);
        if (error?.status === 401) {
            res.status(500).json({ error: 'Invalid API key. Please check your OpenAI API key.' });
        }
        else if (error?.status === 429) {
            res.status(500).json({ error: 'Rate limit exceeded. Please try again later.' });
        }
        else if (error?.status === 404) {
            res.status(500).json({ error: 'Model not found. The gpt-4o model may not be available.' });
        }
        else {
            res.status(500).json({ error: `Server error: ${error?.message || 'Unknown error'}` });
        }
    }
});
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📡 Health check available at http://localhost:${port}/api/health`);
});
