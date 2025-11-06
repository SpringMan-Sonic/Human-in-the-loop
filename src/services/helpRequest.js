const { db, collections } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

class HelpRequestService {
  constructor() {
    this.collection = db.collection(collections.HELP_REQUESTS);
    this.TIMEOUT_MINUTES = 30;
  }

  async create(data) {
    try {
      const requestId = uuidv4();
      const request = {
        id: requestId,
        question: data.question,
        callerPhone: data.callerPhone || 'unknown',
        callerName: data.callerName || 'Unknown Caller',
        sessionId: data.sessionId || null,
        context: data.context || '',
        status: 'pending',
        priority: data.priority || 'normal',
        createdAt: new Date(),
        updatedAt: new Date(),
        resolvedAt: null,
        timeoutAt: new Date(Date.now() + this.TIMEOUT_MINUTES * 60 * 1000),
        supervisorResponse: null,
        notificationsSent: 0,
        metadata: data.metadata || {}
      };

      await this.collection.doc(requestId).set(request);
      console.log(`📞 Created help request: ${requestId} - "${data.question}"`);
      return request;
    } catch (error) {
      console.error('Error creating help request:', error);
      throw error;
    }
  }

  async get(id) {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting help request:', error);
      return null;
    }
  }

  async getPending() {
    try {
      const snapshot = await this.collection
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting pending requests:', error);
      return [];
    }
  }

  async getAll(filters = {}) {
    try {
      let query = this.collection;

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      query = query.orderBy('createdAt', 'desc');

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting all requests:', error);
      return [];
    }
  }

  async resolve(id, answer, supervisorName = 'Supervisor') {
    try {
      const request = await this.get(id);
      if (!request) {
        throw new Error('Request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Request is not pending');
      }

      await this.collection.doc(id).update({
        status: 'resolved',
        supervisorResponse: {
          answer,
          respondedBy: supervisorName,
          respondedAt: new Date()
        },
        resolvedAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`✅ Resolved help request: ${id}`);
      return await this.get(id);
    } catch (error) {
      console.error('Error resolving help request:', error);
      throw error;
    }
  }

  async markTimeout(id) {
    try {
      await this.collection.doc(id).update({
        status: 'timeout',
        updatedAt: new Date()
      });

      console.log(`⏱️ Help request timed out: ${id}`);
    } catch (error) {
      console.error('Error marking timeout:', error);
      throw error;
    }
  }

  async handleTimeouts() {
    try {
      const now = new Date();
      const snapshot = await this.collection
        .where('status', '==', 'pending')
        .where('timeoutAt', '<=', now)
        .get();

      const timeoutPromises = snapshot.docs.map(doc => 
        this.markTimeout(doc.id)
      );

      await Promise.all(timeoutPromises);
      
      if (snapshot.size > 0) {
        console.log(`⏱️ Handled ${snapshot.size} timeouts`);
      }
    } catch (error) {
      console.error('Error handling timeouts:', error);
    }
  }

  async getStats() {
    try {
      const all = await this.collection.get();
      const stats = {
        total: all.size,
        pending: 0,
        resolved: 0,
        timeout: 0,
        avgResolutionTime: 0
      };

      let totalResolutionTime = 0;
      let resolvedCount = 0;

      all.forEach(doc => {
        const data = doc.data();
        stats[data.status]++;

        if (data.status === 'resolved' && data.resolvedAt && data.createdAt) {
          const resolutionTime = data.resolvedAt.toMillis() - data.createdAt.toMillis();
          totalResolutionTime += resolutionTime;
          resolvedCount++;
        }
      });

      if (resolvedCount > 0) {
        stats.avgResolutionTime = Math.round(totalResolutionTime / resolvedCount / 1000 / 60);
      }

      return stats;
    } catch (error) {
      console.error('Error getting stats:', error);
      return { total: 0, pending: 0, resolved: 0, timeout: 0, avgResolutionTime: 0 };
    }
  }

  async incrementNotifications(id) {
    try {
      const doc = await this.collection.doc(id).get();
      if (doc.exists) {
        const current = doc.data().notificationsSent || 0;
        await this.collection.doc(id).update({
          notificationsSent: current + 1,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error incrementing notifications:', error);
    }
  }
}

module.exports = new HelpRequestService();
