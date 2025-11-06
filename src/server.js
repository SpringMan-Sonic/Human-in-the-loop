require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const knowledgeBase = require('./services/knowledgeBase');
const helpRequest = require('./services/helpRequest');
const aiAgent = require('./services/aiAgent');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

async function initializeServices() {
  console.log('🚀 Initializing services...');
  await knowledgeBase.initialize();
  await aiAgent.initialize();
  console.log('✅ All services initialized\n');
}

app.get('/api/help-requests', async (req, res) => {
  try {
    const { status, limit } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (limit) filters.limit = parseInt(limit);
    const requests = await helpRequest.getAll(filters);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch help requests' });
  }
});

app.get('/api/help-requests/pending', async (req, res) => {
  try {
    const requests = await helpRequest.getPending();
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

app.get('/api/help-requests/:id', async (req, res) => {
  try {
    const request = await helpRequest.get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

app.post('/api/help-requests/:id/resolve', async (req, res) => {
  try {
    const { answer, supervisorName } = req.body;
    if (!answer) return res.status(400).json({ error: 'Answer is required' });
    
    const result = await aiAgent.handleSupervisorResponse(
      req.params.id, 
      answer,
      supervisorName
    );
    res.json({ success: true, requestId: result.requestId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/help-requests/stats/summary', async (req, res) => {
  try {
    const stats = await helpRequest.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/knowledge', async (req, res) => {
  try {
    const knowledge = await knowledgeBase.getAll();
    res.json(knowledge);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch knowledge' });
  }
});

app.post('/api/knowledge', async (req, res) => {
  try {
    const { question, answer, category } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer required' });
    }
    const knowledge = await knowledgeBase.add({ question, answer, category: category || 'manual', source: 'manual' });
    await aiAgent.initialize();
    res.json(knowledge);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add knowledge' });
  }
});

app.post('/api/process-message', async (req, res) => {
  try {
    const { message, sessionId, callerInfo } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    
    const response = await aiAgent.processMessage(
      message, 
      sessionId || require('uuid').v4(),
      callerInfo || {}
    );
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process message' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeSessions: aiAgent.getActiveSessionsCount()
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

async function startServer() {
  await initializeServices();
  
  setInterval(async () => {
    await helpRequest.handleTimeouts();
  }, 5 * 60 * 1000);

  app.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log(`🚀 Backend API: http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🏢 Business: ${process.env.BUSINESS_NAME}`);
    console.log('═══════════════════════════════════════\n');
    console.log('💡 Next: Start Python voice agent');
    console.log('   cd voice-agent');
    console.log('   python agent.py dev\n');
    console.log('Then open this url and select the LiveKit room : https://agents-playground.livekit.io/')
  });
}

startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
