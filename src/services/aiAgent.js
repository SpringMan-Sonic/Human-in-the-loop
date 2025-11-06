const { GoogleGenerativeAI } = require('@google/generative-ai');
const knowledgeBase = require('./knowledgeBase');
const helpRequest = require('./helpRequest');
const notification = require('./notification');
require('dotenv').config();

class AIAgentService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    this.confidenceThreshold = 0.7;
    this.conversationHistory = new Map();
  }

  async initialize() {
    try {
      const context = await knowledgeBase.getContextString();
      this.businessContext = context;
      console.log('✅ AI Agent initialized with knowledge base');
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
- If you're not confident about an answer (confidence < 70%), say: "Let me check with my supervisor and get back to you"
- Never make up information or guess
- Always be polite and helpful

RESPONSE FORMAT:
For each response, you must evaluate your confidence:
- If confidence >= 70%: Answer the question directly
- If confidence < 70%: Say "Let me check with my supervisor and get back to you"

Remember: You're on a phone call, so keep responses natural and conversational.`;
  }

  async processMessage(message, sessionId, callerInfo = {}) {
    try {
      const knowledge = await knowledgeBase.search(message);
      
      if (knowledge && knowledge.relevanceScore > this.confidenceThreshold) {
        console.log(`✅ Found answer in knowledge base (score: ${knowledge.relevanceScore.toFixed(2)})`);
        return {
          answer: knowledge.answer,
          needsHelp: false,
          confidence: knowledge.relevanceScore,
          source: 'knowledge_base'
        };
      }

      const history = this.conversationHistory.get(sessionId) || [];
      const prompt = this._buildPrompt(message, history);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      history.push(
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      );
      this.conversationHistory.set(sessionId, history);

      const needsHelp = this._shouldEscalate(response, knowledge);

      if (needsHelp) {
        console.log('❓ AI needs help - escalating to supervisor');
        
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
        confidence: knowledge ? knowledge.relevanceScore : 0.5,
        source: 'ai_generated'
      };
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        answer: "I apologize, but I'm having trouble right now. Let me connect you with my supervisor.",
        needsHelp: true,
        error: error.message
      };
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

  _shouldEscalate(response, knowledge) {
    const escalationPhrases = [
      'let me check',
      'check with my supervisor',
      "i don't know",
      "i'm not sure",
      "i don't have that information"
    ];

    const responseLower = response.toLowerCase();
    const hasEscalationPhrase = escalationPhrases.some(phrase => 
      responseLower.includes(phrase)
    );

    const lowConfidence = !knowledge || knowledge.relevanceScore < this.confidenceThreshold;

    return hasEscalationPhrase || lowConfidence;
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
      if (!request) {
        throw new Error('Help request not found');
      }

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

      console.log('✅ Supervisor response processed and knowledge base updated');

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
