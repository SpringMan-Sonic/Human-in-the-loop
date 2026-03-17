const { GoogleGenerativeAI } = require('@google/generative-ai');
const knowledgeBase = require('./knowledgeBase');
const helpRequest = require('./helpRequest');
const notification = require('./notification');
require('dotenv').config();

class AIAgentService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); 
    this.confidenceThreshold = 0.7;
    this.conversationHistory = new Map();
  }

  async initialize() {
    try {
      const context = await knowledgeBase.getContextString();
      this.businessContext = context;
      console.log(' AI Agent initialized with knowledge base');
    } catch (error) {
      console.error('Error initializing AI agent:', error);
      throw error;
    }
  }

  _getSystemPrompt() {
    return `You are a helpful AI assistant for ${process.env.BUSINESS_NAME}.

BUSINESS INFORMATION:
${this.businessContext}

YOUR ROLE:
- Answer customer questions about the business using ONLY the information provided above
- Be friendly, professional, and concise
- If you're not confident about an answer, say exactly: "Let me check with my supervisor and get back to you"
- Never make up information or guess
- Always be polite and helpful

RESPONSE FORMAT:
- If you can answer confidently from the business information: Answer directly
- If the question is outside the business information: Say "Let me check with my supervisor and get back to you"

Remember: You're on a phone call, so keep responses natural and conversational.`;
  }

  async processMessage(message, sessionId, callerInfo = {}) {
    try {
      const knowledge = await knowledgeBase.search(message);

      if (knowledge && knowledge.relevanceScore > this.confidenceThreshold) {
        console.log(` Found answer in knowledge base (score: ${knowledge.relevanceScore.toFixed(2)})`);
        return {
          answer: knowledge.answer,
          needsHelp: false,
          confidence: knowledge.relevanceScore,
          source: 'knowledge_base'
        };
      }

     
      console.log(' Not in knowledge base, asking Gemini...');
      const history = this.conversationHistory.get(sessionId) || [];
      const prompt = this._buildPrompt(message, history);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      history.push(
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      );
      this.conversationHistory.set(sessionId, history);

      // Step 3: Check if Gemini itself said it needs help
      // ✅ Fixed: only check the AI response text, not knowledge score
      const needsHelp = this._shouldEscalate(response);

      if (needsHelp) {
        console.log(' AI needs help - escalating to supervisor');

        const request = await helpRequest.create({
          question: message,
          callerPhone: callerInfo.phone || 'unknown',
          callerName: callerInfo.name || 'Unknown Caller',
          sessionId: sessionId,
          context: this._formatContext(history),
          priority: 'normal'
        });

        await notification.notifySupervisor(request);
        await helpRequest.incrementNotifications(request.id);

        return {
          answer: "Let me check with my supervisor and get back to you shortly. We'll call you back with the information you need.",
          needsHelp: true,
          requestId: request.id,
          confidence: 0,
          source: 'escalation'
        };
      }

      return {
        answer: response,
        needsHelp: false,
        confidence: 0.8,
        source: 'ai_generated'
      };

    } catch (error) {
      console.error('Error processing message:', error);

      try {
        const request = await helpRequest.create({
          question: message,
          callerPhone: callerInfo.phone || 'unknown',
          callerName: callerInfo.name || 'Unknown Caller',
          sessionId: sessionId,
          context: 'AI error during processing',
          priority: 'high'
        });
        await notification.notifySupervisor(request);

        return {
          answer: "I apologize, but I'm having trouble right now. Let me connect you with my supervisor.",
          needsHelp: true,
          requestId: request.id,
          error: error.message
        };
      } catch (reqError) {
        console.error('Error creating fallback help request:', reqError);
        return {
          answer: "I apologize, but I'm having trouble right now. Let me connect you with my supervisor.",
          needsHelp: true,
          error: error.message
        };
      }
    }
  }

  _buildPrompt(message, history) {
    let prompt = this._getSystemPrompt() + '\n\n';

    if (history.length > 0) {
      prompt += 'CONVERSATION HISTORY:\n';
      history.slice(-6).forEach(msg => {
        prompt += `${msg.role === 'user' ? 'Customer' : 'You'}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    prompt += `Customer: ${message}\nYou:`;
    return prompt;
  }

  _shouldEscalate(response) {
    const escalationPhrases = [
      'let me check',
      'check with my supervisor',
      "i don't know",
      "i'm not sure",
      "i don't have that information",
      "i cannot answer",
      "not available in my information"
    ];

    const responseLower = response.toLowerCase();
    return escalationPhrases.some(phrase => responseLower.includes(phrase));
  }

  _formatContext(history) {
    if (history.length === 0) return 'No previous conversation';
    return history.slice(-4).map(msg =>
      `${msg.role === 'user' ? 'Customer' : 'AI'}: ${msg.content}`
    ).join('\n');
  }

  async handleSupervisorResponse(requestId, answer) {
    try {
      const request = await helpRequest.get(requestId);
      if (!request) throw new Error('Help request not found');

      await helpRequest.resolve(requestId, answer);

      await knowledgeBase.add({
        question: request.question,
        answer: answer,
        category: 'learned',
        confidence: 0.9,
        source: 'supervisor',
        requestId: requestId
      });

      await notification.callbackCustomer(request, answer);
      await this.initialize();

      console.log('Supervisor response processed and knowledge base updated');
      return { success: true, requestId };
    } catch (error) {
      console.error('Error handling supervisor response:', error);
      throw error;
    }
  }

  clearSession(sessionId) {
    this.conversationHistory.delete(sessionId);
  }

  getActiveSessionsCount() {
    return this.conversationHistory.size;
  }
}

module.exports = new AIAgentService();
