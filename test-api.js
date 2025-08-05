#!/usr/bin/env node

// Test script to verify API setup
const axios = require('axios');

console.log('=== API TEST SCRIPT ===\n');

async function testHealth() {
  try {
    console.log('1. Testing health endpoint...');
    const response = await axios.get('http://localhost:3001/api/health');
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
}

async function testChat() {
  try {
    console.log('\n2. Testing chat endpoint...');
    const response = await axios.post('http://localhost:3001/api/chat', {
      message: 'Hello, this is a test',
      history: []
    });
    console.log('✅ Chat endpoint response received');
    console.log('   Message length:', response.data.message?.length || 0);
    return true;
  } catch (error) {
    console.log('❌ Chat endpoint failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function runTests() {
  const healthOk = await testHealth();
  
  if (healthOk) {
    await testChat();
  } else {
    console.log('\n⚠️  Backend server is not running or not accessible');
    console.log('Make sure to run: cd backend && npm start');
  }
  
  console.log('\n=== DIAGNOSIS ===');
  console.log('If chat endpoint fails with "OpenAI API key not configured":');
  console.log('  1. Get your API key from https://platform.openai.com/api-keys');
  console.log('  2. Edit backend/.env file');
  console.log('  3. Replace "your-openai-api-key-here" with your actual key');
  console.log('  4. Restart the backend server');
}

runTests();