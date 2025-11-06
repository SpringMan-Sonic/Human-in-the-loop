# 🎙️ AI Voice Agent with Human-in-the-Loop Supervisor System

A production-ready AI voice agent system that handles customer calls, escalates unknown questions to human supervisors, and automatically learns from their responses.





### Core Capabilities
- 🎤 **Real-Time Voice Conversations** - Natural phone calls via LiveKit
- 🤖 **AI-Powered Responses** - Instant answers using Google Gemini AI
- 📞 **Smart Escalation** - Auto-escalates unknown questions to supervisors
- 🧠 **Automatic Learning** - Updates knowledge base from supervisor responses
- 📊 **Live Dashboard** - Manage requests, view history, track metrics
- 🔄 **Complete Workflow** - End-to-end from customer question to AI learning
- 🌍 **Production Ready** - Scalable architecture with error handling



## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Customer Interface                        │
│  Phone Call → LiveKit → Voice Agent → Backend API → AI Response │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Processing Pipeline                         │
│                                                                  │
│  1. Speech-to-Text (OpenAI Whisper)                            │
│  2. Knowledge Base Search (Firebase)                            │
│  3. AI Processing (Gemini AI)                                   │
│  4. Escalation Detection (Pattern Matching)                     │
│  5. Text-to-Speech (OpenAI TTS)                                 │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Human-in-the-Loop                           │
│                                                                  │
│  Unknown Question → Help Request → Supervisor Dashboard          │
│                        ↓                                         │
│  Supervisor Responds → Knowledge Base Update → Customer Callback │
│                        ↓                                         │
│              Future Calls: AI Knows Answer                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        Data Flow Diagram                         │
│                                                                  │
│   Customer → LiveKit → Python Agent → Node.js Backend            │
│                              ↓              ↓                    │
│                         OpenAI API    Firebase Firestore         │
│                              ↓              ↓                    │
│                         Gemini AI    Knowledge Base              │
│                              ↓              ↓                    │
│                      Supervisor Dashboard                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Backend (Node.js)
- **Express.js** - REST API server
- **Firebase Admin SDK** - Firestore database
- **Google Gemini AI** - Natural language processing
- **LiveKit Server SDK** - Token generation (optional)
- **UUID** - Unique identifiers

### Voice Agent (Python)
- **LiveKit Agents** - Voice call handling
- **OpenAI Whisper** - Speech-to-text
- **OpenAI TTS** - Text-to-speech
- **OpenAI GPT-4o-mini** - Language model
- **Aiohttp** - Async HTTP client

### Frontend
- **Vanilla JavaScript** - No framework overhead
- **Modern CSS** - Responsive design
- **Fetch API** - REST communication

### Infrastructure
- **Firebase Firestore** - NoSQL database
- **LiveKit Cloud** - Voice infrastructure
- **Google Cloud** - AI services

---

## 📋 Prerequisites

### Required Software
- **Node.js** 18.0.0 or higher
- **Python** 3.11 or higher
- **npm** (comes with Node.js)
- **pip** (comes with Python)

### Required Accounts (All have free tiers)
1. **Firebase** - Database
2. **Google AI Studio** - Gemini API
3. **LiveKit** - Voice infrastructure
4. **OpenAI** - Voice processing (STT/TTS/LLM)

---

## 🚀 Installation

### Step 1: Clone Repository

```bash
# Create project directory
mkdir FRONTDESK
cd FRONTDESK
```

### Step 2: Setup Backend (Node.js)

```bash
# Create backend structure
mkdir -p src/{config,services}
mkdir -p public


# Create package.json
cat > package.json << 'EOF'
{
  "name": "Frontdesk",
  "version": "1.0.0",
  "description": "Backend API for AI Agent Supervisor System",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "firebase-admin": "^12.0.0",
    "body-parser": "^1.20.2",
    "uuid": "^9.0.1",
    "livekit-server-sdk": "^2.8.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
EOF

# Install dependencies
npm install
```

### Step 3: Setup Voice Agent (Python)

```bash
# Create voice agent directory
cd ./
mkdir voice-agent
cd voice-agent

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Create requirements.txt
cat > requirements.txt << 'EOF'
livekit~=1.0.17         
livekit-agents==1.2.15
livekit-plugins-silero==1.2.15
python-dotenv==1.0.0
aiohttp~=3.10
google-generativeai

EOF

# Install dependencies
pip install -r requirements.txt
```



## ⚙️ Configuration

### Step 1: Get API Keys

#### A. Firebase Setup
#### B. Google Gemini API
#### C. LiveKit Credentials
#### D. OpenAI API Key
#### E. DEEPGRAM API Key
#### F. CARTESIA API Key

### Step 2: Configure Backend

Create `backend/.env`:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Google Gemini Configuration
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxx

# Server Configuration
PORT=3000
NODE_ENV=development

# Business Information
BUSINESS_NAME=Luxury Salon & Spa
BUSINESS_PHONE=+919876543210
SUPERVISOR_PHONE=+919876543210
SUPERVISOR_NAME=Your Name
```

### Step 3: Configure Voice Agent

Create `voice-agent/.env`:

```env
# LiveKit Configuration
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxx

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxx

# Backend API
BACKEND_API=http://localhost:3000/api

# Business Information
BUSINESS_NAME=Luxury Salon & Spa
```

### Step 4: Initialize Firestore

1. Go to Firebase Console → Firestore Database
2. Click "Create Database" (if not done already)
3. Choose "Start in test mode"
4. Select region (e.g., asia-south1 for India)
5. Click "Enable"
6. Wait 2-3 minutes for activation

---

## 🎬 Running the System

### Terminal 1: Start Backend

```bash
cd backend
npm start
```

**Expected Output:**
```

✅ Firebase initialized successfully
🚀 Initializing services...
✅ Knowledge base initialized
✅ AI Agent initialized with knowledge base
✅ All services initialized

═══════════════════════════════════════
🚀 Backend API: http://localhost:3000
📊 Dashboard: http://localhost:3000
🏢 Business: Luxury Salon & Spa
═══════════════════════════════════════

💡 Next: Start Python voice agent
   cd voice-agent
   python agent.py dev

Then open this url and select the LiveKit room : https://agents-playground.livekit.io/
```

### Terminal 2: Start Voice Agent

```bash
cd voice-agent

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Start agent
python agent.py dev
```

**Expected Output:**
```
INFO:voice-agent:🚀 Starting LiveKit Voice Agent
INFO:voice-agent:📡 Backend API: http://localhost:3000/api
INFO:voice-agent:🏢 Business: Luxury Salon & Spa
DEBUG:asyncio:Using proactor: IocpProactor
2025-10-26 21:41:13,657 - DEBUG asyncio - Using proactor: IocpProactor 
DEV:livekit.agents:Watching C:\Users\shyam\OneDrive\Documents\frontdesk\voice-agent
2025-10-26 21:41:13,660 - DEV  livekit.agents - Watching C:\Users\shyam\OneDrive\Documents\frontdesk\voice-agent 
DEBUG:asyncio:Using proactor: IocpProactor
2025-10-26 21:41:14,952 - DEBUG asyncio - Using proactor: IocpProactor 
INFO:livekit.agents:starting worker
2025-10-26 21:41:14,961 - INFO livekit.agents - starting worker {"version": "1.2.15", "rtc-version": "1.0.17"}
INFO:livekit.agents:registered worker
2025-10-26 21:41:16,136 - INFO livekit.agents - registered worker {"id": "AW_DeQfMgyjNmhw", "url": "wss://frontdesk-qkg8ebu3.livekit.cloud", "region": "India South", "protocol": 16}
INFO:livekit.agents:received job request
2025-10-26 21:41:39,253 - INFO livekit.agents - received job request {"job_id": "AJ_6rRd9JMenj3Q", "dispatch_id": "", "room_name": "playground-C4rq-BcEf", "agent_name": "", "resuming": false}
INFO:livekit.agents:initializing job runner
2025-10-26 21:41:39,835 - INFO livekit.agents - initializing job runner {"tid": 7308}
INFO:voice-agent:🔥 Prewarming voice agent...
2025-10-26 21:41:39,835 - INFO voice-agent - 🔥 Prewarming voice agent...
INFO:voice-agent:✅ Prewarm complete
2025-10-26 21:41:39,835 - INFO voice-agent - ✅ Prewarm complete
INFO:voice-agent:============================================================
2025-10-26 21:41:39,836 - INFO voice-agent - ============================================================
INFO:voice-agent:🎙️  Voice agent is ready!
2025-10-26 21:41:39,836 - INFO voice-agent - 🎙️  Voice agent is ready!
INFO:voice-agent:💡 Using manual audio pipeline
2025-10-26 21:41:39,836 - INFO voice-agent - 💡 Using manual audio pipeline
INFO:voice-agent:💡 Backend integration: Active
2025-10-26 21:41:39,837 - INFO voice-agent - 💡 Backend integration: Active
INFO:voice-agent:💡 Dashboard: http://localhost:3000
2025-10-26 21:41:39,837 - INFO voice-agent - 💡 Dashboard: http://localhost:3000
INFO:voice-agent:============================================================
2025-10-26 21:41:39,837 - INFO voice-agent - ============================================================
INFO:livekit.agents:job runner initialized
2025-10-26 21:41:39,838 - INFO livekit.agents - job runner initialized {"tid": 7308, "elapsed_time": 0.0}
DEBUG:asyncio:Using proactor: IocpProactor
2025-10-26 21:41:39,839 - DEBUG asyncio - Using proactor: IocpProactor
INFO:voice-agent:🎙️ Voice agent starting - Room: playground-C4rq-BcEf
2025-10-26 21:41:39,841 - INFO voice-agent - 🎙️ Voice agent starting - Room: playground-C4rq-BcEf
INFO:voice-agent:✅ Loaded 8 knowledge entries
2025-10-26 21:41:40,425 - INFO voice-agent - ✅ Loaded 8 knowledge entries 
INFO:voice-agent:✅ Connected to room
2025-10-26 21:41:48,638 - INFO voice-agent - ✅ Connected to room 
INFO:voice-agent:⏳ Waiting for participant to join...
2025-10-26 21:41:48,639 - INFO voice-agent - ⏳ Waiting for participant to join...
INFO:voice-agent:👤 Caller joined: identity-81sa (unknown)
2025-10-26 21:41:48,639 - INFO voice-agent - 👤 Caller joined: identity-81sa (unknown)
INFO:voice-agent:🔊 Setting up Text-to-Speech...
2025-10-26 21:41:48,640 - INFO voice-agent - 🔊 Setting up Text-to-Speech...
INFO:voice-agent:🔊 Using Cartesia TTS
2025-10-26 21:41:48,641 - INFO voice-agent - 🔊 Using Cartesia TTS
INFO:voice-agent:🎤 Setting up Speech-to-Text...
2025-10-26 21:41:48,641 - INFO voice-agent - 🎤 Setting up Speech-to-Text...
INFO:voice-agent:🎤 Using Deepgram STT
2025-10-26 21:41:48,642 - INFO voice-agent - 🎤 Using Deepgram STT
INFO:voice-agent:✅ Audio output track published
2025-10-26 21:41:48,857 - INFO voice-agent - ✅ Audio output track published 
INFO:voice-agent:🗣️ Speaking: Hello! Thank you for calling Luxury Salon & Spa. H...
2025-10-26 21:41:48,858 - INFO voice-agent - 🗣️ Speaking: Hello! Thank you for calling Luxury Salon & Spa. H...
DEBUG:livekit.agents:http_session(): creating a new httpclient ctx
2025-10-26 21:41:48,858 - DEBUG livekit.agents - http_session(): creating a new httpclient ctx
INFO:voice-agent:✅ Greeting spoken!
2025-10-26 21:41:54,383 - INFO voice-agent - ✅ Greeting spoken! 
INFO:voice-agent:✅ Voice agent fully active!
2025-10-26 21:41:54,383 - INFO voice-agent - ✅ Voice agent fully active!
INFO:voice-agent:💡 Speak now - the agent is listening...
2025-10-26 21:41:54,384 - INFO voice-agent - 💡 Speak now - the agent is listening...
INFO:voice-agent:🎧 Listening for caller's voice...
2025-10-26 21:41:54,384 - INFO voice-agent - 🎧 Listening for caller's voice...
INFO:voice-agent:✅ Audio track found, starting STT stream...
2025-10-26 21:41:54,384 - INFO voice-agent - ✅ Audio track found, starting STT stream...
INFO:voice-agent:🎤 Starting audio processing and STT event handling...
2025-10-26 21:41:54,385 - INFO voice-agent - 🎤 Starting audio processing and STT event handling...
INFO:voice-agent:👂 Hearing: What are your...
2025-10-26 21:41:59,981 - INFO voice-agent - 👂 Hearing: What are your... 
INFO:voice-agent:👤 User said: What are your hours?
2025-10-26 21:42:00,599 - INFO voice-agent - 👤 User said: What are your hours? 
INFO:voice-agent:🤖 Backend response: We are open Monday through Saturday from 9am to 7pm, and Sunday from 10am to 5pm....
2025-10-26 21:42:01,331 - INFO voice-agent - 🤖 Backend response: We are open Monday through Saturday from 9am to 7pm, and Sunday from 10am to 5pm....
INFO:voice-agent:🗣️ Speaking: We are open Monday through Saturday from 9am to 7p...
2025-10-26 21:42:01,332 - INFO voice-agent - 🗣️ Speaking: We are open Monday through Saturday from 9am to 7p...
INFO:voice-agent:👂 Hearing: Was there any offers...
2025-10-26 21:42:14,263 - INFO voice-agent - 👂 Hearing: Was there any offers... 
INFO:voice-agent:👤 User said: Was there any offers?
2025-10-26 21:42:14,770 - INFO voice-agent - 👤 User said: Was there any offers? 
INFO:voice-agent:🤖 Backend response: Let me check with my supervisor and get back to you shortly. We'll call you back with the informatio...
2025-10-26 21:42:17,783 - INFO voice-agent - 🤖 Backend response: Let me check with my supervisor and get back to you shortly. We'll call you back with the informatio...
INFO:voice-agent:✅ Help request created: f92949b8
2025-10-26 21:42:17,784 - INFO voice-agent - ✅ Help request created: f92949b8
INFO:voice-agent:🗣️ Speaking: Let me check with my supervisor and get back to yo...
2025-10-26 21:42:17,786 - INFO voice-agent - 🗣️ Speaking: Let me check with my supervisor and get back to yo...
INFO:voice-agent:👂 Hearing: Was there any...
2025-10-26 21:44:14,375 - INFO voice-agent - 👂 Hearing: Was there any... 
INFO:voice-agent:👂 Hearing: Was there any...
2025-10-26 21:44:14,566 - INFO voice-agent - 👂 Hearing: Was there any... 
INFO:voice-agent:👤 User said: Was there any offers?
2025-10-26 21:44:15,076 - INFO voice-agent - 👤 User said: Was there any offers? 
INFO:voice-agent:🤖 Backend response: yes , there are offers on some facewashes...
2025-10-26 21:44:15,454 - INFO voice-agent - 🤖 Backend response: yes , there are offers on some facewashes... 
INFO:voice-agent:🗣️ Speaking: yes , there are offers on some facewashes...
2025-10-26 21:44:15,454 - INFO voice-agent - 🗣️ Speaking: yes , there are offers on some facewashes...
INFO:voice-agent:📴 Participant disconnected
2025-10-26 21:44:35,833 - INFO voice-agent - 📴 Participant disconnected 
INFO:voice-agent:🔚 Agent session complete
2025-10-26 21:44:38,180 - INFO voice-agent - 🔚 Agent session complete 
DEBUG:livekit.agents:shutting down job task
```

### Browser: Open Dashboard

```
http://localhost:3000
```

You should see the Supervisor Dashboard with tabs for:
- ⏳ Pending Requests
- 📜 History
- 📚 Knowledge Base
- 📊 Statistics

---

## 🧪 Testing

### Test 1: API Testing (No Voice Needed)

```bash
# Test known question
curl -X POST http://localhost:3000/api/process-message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are your hours?",
    "sessionId": "test-123",
    "callerInfo": {"name": "Test User", "phone": "+919999999999"}
  }'
```

**Expected Response:**
```json
{
  "answer": "We are open Monday through Saturday from 9am to 7pm, and Sunday from 10am to 5pm.",
  "needsHelp": false,
  "confidence": 0.85,
  "source": "knowledge_base"
}
```

### Test 2: Escalation Flow

```bash
# Test unknown question
curl -X POST http://localhost:3000/api/process-message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Do you offer bridal packages?",
    "sessionId": "test-123",
    "callerInfo": {"name": "Priya Sharma", "phone": "+919876543210"}
  }'
```

**Expected Response:**
```json
{
  "answer": "Let me check with my supervisor and get back to you shortly.",
  "needsHelp": true,
  "requestId": "abc-123-def-456",
  "confidence": 0,
  "source": "escalation"
}
```

**Check Terminal 1:**
```
📞 === SIMULATED CALL ===
Caller: Priya Sharma (+919876543210)
Question: Do you offer bridal packages?
❓ AI needs help - escalating to supervisor
📱 === SIMULATED SMS TO SUPERVISOR ===
To: +919876543210
Message: 🚨 Help needed! Priya Sharma asked: "Do you offer bridal packages?"
```

**Check Dashboard:**
- Open http://localhost:3000
- Go to "Pending Requests" tab
- See the new request

### Test 3: Supervisor Response

1. **In Dashboard:**
   z- Click "Respond" on the pending request
   - Enter answer: "Yes! We offer bridal packages starting at ₹15,000. Includes makeup, hair styling, and draping."
   - Click "Submit Response"

2. **Check Terminal 1:**
```
POST /api/help-requests/abc-123.../resolve 200
✅ Resolved help request
✅ Added new knowledge: Do you offer bridal packages?
📞 === SIMULATED CALLBACK TO CUSTOMER ===
To: +919876543210 (Priya Sharma)
Message: Hi Priya, this is Luxury Salon & Spa...
```

3. **Test AI Learned:**
```bash
curl -X POST http://localhost:3000/api/process-message \
  -H "Content-Type: application/json" \
  -d '{"message": "Do you have bridal packages?"}'
```

**Expected:** AI now answers immediately without escalation!

#   f r o n t d e s k  
 #   f r o n t d e s k  
 