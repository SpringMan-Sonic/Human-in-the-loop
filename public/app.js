const API_BASE = window.location.origin + '/api';

class DashboardApp {
  constructor() {
    this.currentRequestId = null;
    this.refreshInterval = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadPendingRequests();
    this.loadKnowledge();
    this.loadStats();
    this.updateHeaderStats();

    this.refreshInterval = setInterval(() => {
      if (document.querySelector('#pending-tab').classList.contains('active')) {
        this.loadPendingRequests();
      }
      this.updateHeaderStats();
    }, 30000);
  }

  setupEventListeners() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });

    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
          this.closeAddKnowledgeModal();
        }
      });
    });
  }

  switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.tab === tabName) tab.classList.add('active');
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    switch(tabName) {
      case 'pending':
        this.loadPendingRequests();
        break;
      case 'history':
        this.loadHistory();
        break;
      case 'knowledge':
        this.loadKnowledge();
        break;
      case 'stats':
        this.loadStats();
        break;
    }
  }

  async loadPendingRequests() {
    try {
      const response = await fetch(`${API_BASE}/help-requests/pending`);
      const requests = await response.json();

      const container = document.getElementById('pendingList');
      const badge = document.getElementById('pendingBadge');
      const headerBadge = document.querySelector('#pendingRequests .stat-value');

      badge.textContent = requests.length;
      headerBadge.textContent = requests.length;

      if (requests.length === 0) {
        container.innerHTML = '<p class="empty-state">🎉 No pending requests</p>';
        return;
      }

      container.innerHTML = requests.map(req => this.renderRequestCard(req, true)).join('');
    } catch (error) {
      console.error('Error loading pending requests:', error);
      this.showToast('Failed to load pending requests', 'error');
    }
  }

  async loadHistory() {
    try {
      const statusFilter = document.getElementById('statusFilter').value;
      let url = `${API_BASE}/help-requests?limit=50`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const response = await fetch(url);
      const requests = await response.json();

      const container = document.getElementById('historyList');
      const history = requests.filter(r => r.status !== 'pending');

      if (history.length === 0) {
        container.innerHTML = '<p class="empty-state">No history available</p>';
        return;
      }

      container.innerHTML = history.map(req => this.renderRequestCard(req, false)).join('');
    } catch (error) {
      console.error('Error loading history:', error);
      this.showToast('Failed to load history', 'error');
    }
  }

  async loadKnowledge() {
    try {
      const response = await fetch(`${API_BASE}/knowledge`);
      const knowledge = await response.json();

      const container = document.getElementById('knowledgeList');
      if (knowledge.length === 0) {
        container.innerHTML = '<p class="empty-state">No knowledge entries</p>';
        return;
      }

      container.innerHTML = knowledge.map(k => this.renderKnowledgeCard(k)).join('');
    } catch (error) {
      console.error('Error loading knowledge:', error);
      this.showToast('Failed to load knowledge base', 'error');
    }
  }

  async loadStats() {
    try {
      const response = await fetch(`${API_BASE}/help-requests/stats/summary`);
      const stats = await response.json();

      document.getElementById('totalRequests').textContent = stats.total || 0;
      document.getElementById('resolvedCount').textContent = stats.resolved || 0;
      document.getElementById('timeoutCount').textContent = stats.timeout || 0;
      document.getElementById('avgResolutionTime').textContent = 
        stats.avgResolutionTime ? `${stats.avgResolutionTime} min` : '-';
    } catch (error) {
      console.error('Error loading stats:', error);
      this.showToast('Failed to load statistics', 'error');
    }
  }

  async updateHeaderStats() {
    try {
      const [healthRes, pendingRes] = await Promise.all([
        fetch(`${API_BASE}/health`),
        fetch(`${API_BASE}/help-requests/pending`)
      ]);

      const health = await healthRes.json();
      const pending = await pendingRes.json();

      document.querySelector('#activeSessions .stat-value').textContent = health.activeSessions || 0;
      document.querySelector('#pendingRequests .stat-value').textContent = pending.length || 0;
    } catch (error) {
      console.error('Error updating header stats:', error);
    }
  }

  renderRequestCard(request, showActions) {
    const createdAt = new Date(request.createdAt._seconds * 1000);
    const timeAgo = this.formatTimeAgo(createdAt);

    let resolvedInfo = '';
    if (request.status === 'resolved' && request.supervisorResponse) {
      const respondedBy = request.supervisorResponse.respondedBy || 'Supervisor';
      resolvedInfo = `
        <div class="supervisor-response">
          <strong>✅ Response by ${respondedBy}:</strong>
          <div class="response-text">${this.escapeHtml(request.supervisorResponse.answer)}</div>
        </div>
      `;
    }

    return `
      <div class="request-card">
        <div class="request-header">
          <div class="request-info">
            <div class="caller-name">${this.escapeHtml(request.callerName)}</div>
            <div class="caller-phone">${this.escapeHtml(request.callerPhone)}</div>
          </div>
          <span class="request-status status-${request.status}">${request.status}</span>
        </div>
        <div class="question-text">"${this.escapeHtml(request.question)}"</div>
        ${resolvedInfo}
        <div class="request-meta">
          <div class="meta-item">⏰ ${timeAgo}</div>
          <div class="meta-item">🎫 ${request.id.substring(0, 8)}</div>
          ${request.priority !== 'normal' ? `<div class="meta-item">⚡ ${request.priority}</div>` : ''}
        </div>
        ${showActions ? `<div class="request-actions">
            <button class="btn-primary" onclick="app.openResponseModal('${request.id}')">📝 Respond</button>
        </div>` : ''}
      </div>
    `;
  }

  renderKnowledgeCard(knowledge) {
    const useCount = knowledge.useCount || 0;
    const source = knowledge.source || 'unknown';

    return `
      <div class="knowledge-card">
        <span class="knowledge-category">${knowledge.category || 'general'}</span>
        <div class="knowledge-question">${this.escapeHtml(knowledge.question)}</div>
        <div class="knowledge-answer">${this.escapeHtml(knowledge.answer)}</div>
        <div class="knowledge-meta">
          <span>📊 Used ${useCount} times</span>
          <span>📁 ${source}</span>
        </div>
      </div>
    `;
  }

  async openResponseModal(requestId) {
    try {
      const response = await fetch(`${API_BASE}/help-requests/${requestId}`);
      const request = await response.json();

      this.currentRequestId = requestId;
      document.getElementById('modalCaller').textContent = `${request.callerName} (${request.callerPhone})`;
      document.getElementById('modalQuestion').textContent = request.question;
      document.getElementById('modalContext').textContent = request.context || 'No context available';
      document.getElementById('answerText').value = '';
      document.getElementById('supervisorName').value = 'Supervisor';
      document.getElementById('responseModal').classList.add('active');
    } catch (error) {
      console.error('Error opening modal:', error);
      this.showToast('Failed to load request details', 'error');
    }
  }

  closeModal() {
    document.getElementById('responseModal').classList.remove('active');
    this.currentRequestId = null;
  }

  async submitResponse() {
    const answer = document.getElementById('answerText').value.trim();
    const supervisorName = document.getElementById('supervisorName').value.trim();

    if (!answer) {
      this.showToast('Please enter an answer', 'error');
      return;
    }

    if (!this.currentRequestId) {
      this.showToast('Invalid request ID', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/help-requests/${this.currentRequestId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer, supervisorName })
      });

      if (!response.ok) throw new Error('Failed to submit response');

      this.showToast('✅ Response submitted successfully!', 'success');
      this.closeModal();
      this.loadPendingRequests();
      this.loadKnowledge();
      this.updateHeaderStats();
    } catch (error) {
      console.error('Error submitting response:', error);
      this.showToast('Failed to submit response', 'error');
    }
  }

  showAddKnowledgeModal() {
    document.getElementById('knowledgeQuestion').value = '';
    document.getElementById('knowledgeAnswer').value = '';
    document.getElementById('knowledgeCategory').value = 'general';
    document.getElementById('addKnowledgeModal').classList.add('active');
  }

  closeAddKnowledgeModal() {
    document.getElementById('addKnowledgeModal').classList.remove('active');
  }

  async submitKnowledge() {
    const question = document.getElementById('knowledgeQuestion').value.trim();
    const answer = document.getElementById('knowledgeAnswer').value.trim();
    const category = document.getElementById('knowledgeCategory').value;

    if (!question || !answer) {
      this.showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer, category })
      });

      if (!response.ok) throw new Error('Failed to add knowledge');

      this.showToast('✅ Knowledge added successfully!', 'success');
      this.closeAddKnowledgeModal();
      this.loadKnowledge();
    } catch (error) {
      console.error('Error adding knowledge:', error);
      this.showToast('Failed to add knowledge', 'error');
    }
  }

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

const app = new DashboardApp();
