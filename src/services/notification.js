class NotificationService {
  constructor() {
    this.supervisorPhone = process.env.SUPERVISOR_PHONE;
    this.supervisorName = process.env.SUPERVISOR_NAME || 'Supervisor';
  }

  async notifySupervisor(helpRequest) {
    try {
      const message = this._formatSupervisorMessage(helpRequest);
      
      console.log('\n📱 === SIMULATED SMS TO SUPERVISOR ===');
      console.log(`To: ${this.supervisorPhone} (${this.supervisorName})`);
      console.log(`Message: ${message}`);
      console.log(`Request ID: ${helpRequest.id}`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log('=====================================\n');

      return {
        success: true,
        requestId: helpRequest.id,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error notifying supervisor:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async callbackCustomer(helpRequest, answer) {
    try {
      const message = this._formatCustomerCallback(helpRequest, answer);
      
      console.log('\n📞 === SIMULATED CALLBACK TO CUSTOMER ===');
      console.log(`To: ${helpRequest.callerPhone} (${helpRequest.callerName})`);
      console.log(`Message: ${message}`);
      console.log(`Original Question: ${helpRequest.question}`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log('=========================================\n');

      return {
        success: true,
        requestId: helpRequest.id,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error calling back customer:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendWebhook(event, data) {
    try {
      console.log('\n🔔 === WEBHOOK NOTIFICATION ===');
      console.log(`Event: ${event}`);
      console.log(`Data:`, JSON.stringify(data, null, 2));
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log('===============================\n');

      return { success: true };
    } catch (error) {
      console.error('Error sending webhook:', error);
      return { success: false, error: error.message };
    }
  }

  _formatSupervisorMessage(helpRequest) {
    const caller = helpRequest.callerName || 'A customer';
    return `🚨 Help needed!\n\n${caller} asked: "${helpRequest.question}"\n\nPlease respond in the supervisor dashboard.\n\nRequest ID: ${helpRequest.id.substring(0, 8)}`;
  }

  _formatCustomerCallback(helpRequest, answer) {
    return `Hi ${helpRequest.callerName}, this is ${process.env.BUSINESS_NAME}. ` +
           `You asked about: "${helpRequest.question}"\n\n` +
           `Here's the answer: ${answer}\n\n` +
           `Thank you for your patience!`;
  }

  logActivity(type, details) {
    console.log(`📋 [${type.toUpperCase()}]`, details);
  }
}

module.exports = new NotificationService();
