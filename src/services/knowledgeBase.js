const { db, collections } = require('../config/firebase');
const { FieldValue } = require('firebase-admin').firestore;

class KnowledgeBaseService {
  constructor() {
    this.collection = db.collection(collections.KNOWLEDGE_BASE);
  }

  async initialize() {
    const defaultKnowledge = [
      {
        id: 'business_info',
        category: 'general',
        question: 'business information',
        answer: `${process.env.BUSINESS_NAME} is a premium salon and spa. We offer haircuts, coloring, styling, manicures, pedicures, facials, and massage services. We're open Monday-Saturday 9am-7pm, Sunday 10am-5pm. Located at 123 Main Street.`,
        confidence: 1.0,
        source: 'initial',
        createdAt: new Date(),
        updatedAt: new Date(),
        useCount: 0
      },
      {
        id: 'hours',
        category: 'hours',
        question: 'what are your hours',
        answer: 'We are open Monday through Saturday from 9am to 7pm, and Sunday from 10am to 5pm.',
        confidence: 1.0,
        source: 'initial',
        createdAt: new Date(),
        updatedAt: new Date(),
        useCount: 0
      },
      {
        id: 'services',
        category: 'services',
        question: 'what services do you offer',
        answer: 'We offer haircuts, hair coloring, styling, manicures, pedicures, facials, massages, and waxing services.',
        confidence: 1.0,
        source: 'initial',
        createdAt: new Date(),
        updatedAt: new Date(),
        useCount: 0
      },
      {
        id: 'booking',
        category: 'booking',
        question: 'how do i book an appointment',
        answer: 'You can book an appointment by calling us at ' + process.env.BUSINESS_PHONE + ' or visiting our website. Walk-ins are also welcome based on availability.',
        confidence: 1.0,
        source: 'initial',
        createdAt: new Date(),
        updatedAt: new Date(),
        useCount: 0
      }
    ];

    for (const knowledge of defaultKnowledge) {
      const doc = await this.collection.doc(knowledge.id).get();
      if (!doc.exists) {
        await this.collection.doc(knowledge.id).set(knowledge);
      }
    }

    console.log('✅ Knowledge base initialized');
  }

  async search(query) {
    try {
      const snapshot = await this.collection.get();
      const queryLower = query.toLowerCase();
      
      let bestMatch = null;
      let highestScore = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        const questionLower = data.question.toLowerCase();
        const score = this._calculateRelevance(queryLower, questionLower);
        if (score > highestScore && score > 0.3) {
          highestScore = score;
          bestMatch = { id: doc.id, ...data, relevanceScore: score };
        }
      });

      if (bestMatch) {
        await this.collection.doc(bestMatch.id).update({
          useCount: FieldValue.increment(1),
          lastUsed: new Date()
        });
      }

      return bestMatch;
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return null;
    }
  }

  _calculateRelevance(query, knowledge) {
    const queryWords = query.split(/\s+/);
    const knowledgeWords = knowledge.split(/\s+/);
    
    let matches = 0;
    for (const word of queryWords) {
      if (word.length > 2 && knowledgeWords.some(kw => kw.includes(word) || word.includes(kw))) {
        matches++;
      }
    }
    
    return matches / queryWords.length;
  }

  async add(data) {
    try {
      const docRef = this.collection.doc();
      const knowledge = {
        id: docRef.id,
        question: data.question,
        answer: data.answer,
        category: data.category || 'learned',
        confidence: data.confidence || 0.8,
        source: data.source || 'supervisor',
        createdAt: new Date(),
        updatedAt: new Date(),
        useCount: 0,
        learnedFrom: data.requestId || null
      };

      await docRef.set(knowledge);
      console.log(`✅ Added new knowledge: ${knowledge.question}`);
      return knowledge;
    } catch (error) {
      console.error('Error adding knowledge:', error);
      throw error;
    }
  }

  async getAll() {
    try {
      const snapshot = await this.collection.orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting all knowledge:', error);
      return [];
    }
  }

  async update(id, updates) {
    try {
      await this.collection.doc(id).update({
        ...updates,
        updatedAt: new Date()
      });
      console.log(`✅ Updated knowledge: ${id}`);
    } catch (error) {
      console.error('Error updating knowledge:', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      await this.collection.doc(id).delete();
      console.log(`✅ Deleted knowledge: ${id}`);
    } catch (error) {
      console.error('Error deleting knowledge:', error);
      throw error;
    }
  }

  async getContextString() {
    try {
      const knowledge = await this.getAll();
      return knowledge
        .filter(k => k.confidence > 0.5)
        .map(k => `Q: ${k.question}\nA: ${k.answer}`)
        .join('\n\n');
    } catch (error) {
      console.error('Error getting context string:', error);
      return '';
    }
  }
}

module.exports = new KnowledgeBaseService();
