// 알림 시스템 구현
// Slack, Teams, Email을 통한 팀 알림 전송

import { WebClient } from '@slack/web-api';
import nodemailer from 'nodemailer';
import axios from 'axios';

/**
 * 멀티 채널 알림 시스템
 * 에러 분석 결과를 다양한 채널로 전송
 */
class NotificationSystem {
  constructor(config = {}) {
    this.config = {
      slack: {
        token: config.slack?.token,
        channels: config.slack?.channels || ['#errors', '#general'],
        username: config.slack?.username || 'Error Monitor Bot',
        iconEmoji: config.slack?.iconEmoji || ':warning:'
      },
      teams: {
        webhookUrl: config.teams?.webhookUrl,
        channels: config.teams?.channels || []
      },
      email: {
        smtp: config.email?.smtp || {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false
        },
        auth: config.email?.auth,
        from: config.email?.from || 'error-monitor@company.com',
        recipients: config.email?.recipients || []
      },
      sms: {
        provider: config.sms?.provider || 'twilio',
        apiKey: config.sms?.apiKey,
        apiSecret: config.sms?.apiSecret,
        fromNumber: config.sms?.fromNumber,
        recipients: config.sms?.recipients || []
      }
    };

    this.slackClient = this.config.slack.token ? new WebClient(this.config.slack.token) : null;
    this.emailTransporter = this.setupEmailTransporter();
    
    this.notificationHistory = [];
    this.retryQueue = [];
    this.rateLimits = new Map();
  }

  /**
   * 이메일 전송 설정
   */
  setupEmailTransporter() {
    if (!this.config.email.auth) {
      console.warn('Email configuration not provided');
      return null;
    }

    return nodemailer.createTransporter({
      ...this.config.email.smtp,
      auth: this.config.email.auth
    });
  }

  /**
   * 에러 알림 전송 (메인 함수)
   */
  async sendErrorNotification(errorData, analysisResult) {
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      errorData,
      analysisResult,
      priority: this.determinePriority(errorData, analysisResult),
      channels: this.selectChannels(errorData, analysisResult)
    };

    const results = {
      notification,
      deliveryResults: []
    };

    // 우선순위별 채널 선택 및 전송
    for (const channel of notification.channels) {
      try {
        const deliveryResult = await this.sendToChannel(channel, notification);
        results.deliveryResults.push(deliveryResult);
      } catch (error) {
        console.error(`Failed to send notification to ${channel.type}:`, error);
        results.deliveryResults.push({
          channel: channel.type,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        // 재시도 큐에 추가
        this.addToRetryQueue(channel, notification);
      }
    }

    // 알림 히스토리에 저장
    this.notificationHistory.push(notification);
    
    // 히스토리 크기 제한
    if (this.notificationHistory.length > 1000) {
      this.notificationHistory.shift();
    }

    return results;
  }

  /**
   * 우선순위 결정
   */
  determinePriority(errorData, analysisResult) {
    // 분석 결과의 우선순위 사용
    if (analysisResult.priority) {
      return analysisResult.priority;
    }

    // 에러 데이터의 우선순위 사용
    if (errorData.priority) {
      return errorData.priority;
    }

    // 에러 메시지 기반 우선순위 결정
    const message = errorData.message?.toLowerCase() || '';
    
    if (message.includes('critical') || message.includes('fatal') || message.includes('crash')) {
      return 'critical';
    } else if (message.includes('error') || message.includes('exception') || message.includes('failed')) {
      return 'high';
    } else if (message.includes('warning') || message.includes('timeout')) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 전송 채널 선택
   */
  selectChannels(errorData, analysisResult) {
    const priority = this.determinePriority(errorData, analysisResult);
    const channels = [];

    switch (priority) {
      case 'critical':
        // 긴급: 모든 채널 사용
        channels.push(
          { type: 'slack', target: '#critical-errors', immediate: true },
          { type: 'teams', target: 'Critical Alerts', immediate: true },
          { type: 'email', target: 'all', immediate: true },
          { type: 'sms', target: 'oncall', immediate: true }
        );
        break;
        
      case 'high':
        // 높음: Slack, Teams, Email
        channels.push(
          { type: 'slack', target: '#errors', immediate: true },
          { type: 'teams', target: 'Error Notifications', immediate: false },
          { type: 'email', target: 'dev-team', immediate: false }
        );
        break;
        
      case 'medium':
        // 중간: Slack, Email (지연 전송)
        channels.push(
          { type: 'slack', target: '#errors', immediate: false },
          { type: 'email', target: 'dev-team', immediate: false }
        );
        break;
        
      case 'low':
        // 낮음: Slack만 (배치 전송)
        channels.push(
          { type: 'slack', target: '#errors', immediate: false, batch: true }
        );
        break;
    }

    return channels;
  }

  /**
   * 채널별 전송
   */
  async sendToChannel(channel, notification) {
    // 속도 제한 확인
    if (this.isRateLimited(channel.type)) {
      throw new Error(`Rate limited for ${channel.type}`);
    }

    switch (channel.type) {
      case 'slack':
        return await this.sendSlackNotification(channel, notification);
      case 'teams':
        return await this.sendTeamsNotification(channel, notification);
      case 'email':
        return await this.sendEmailNotification(channel, notification);
      case 'sms':
        return await this.sendSMSNotification(channel, notification);
      default:
        throw new Error(`Unknown channel type: ${channel.type}`);
    }
  }

  /**
   * Slack 알림 전송
   */
  async sendSlackNotification(channel, notification) {
    if (!this.slackClient) {
      throw new Error('Slack client not configured');
    }

    const { errorData, analysisResult } = notification;
    
    // Slack 메시지 포맷팅
    const message = this.formatSlackMessage(errorData, analysisResult);
    
    try {
      const result = await this.slackClient.chat.postMessage({
        channel: channel.target,
        ...message,
        username: this.config.slack.username,
        icon_emoji: this.config.slack.iconEmoji
      });

      this.updateRateLimit('slack');

      return {
        channel: 'slack',
        target: channel.target,
        success: true,
        messageTs: result.ts,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Slack API error: ${error.message}`);
    }
  }

  /**
   * Slack 메시지 포맷팅
   */
  formatSlackMessage(errorData, analysisResult) {
    const priority = this.determinePriority(errorData, analysisResult);
    const priorityColors = {
      critical: '#FF0000',
      high: '#FF6600',
      medium: '#FFCC00',
      low: '#00FF00'
    };

    const priorityEmojis = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️'
    };

    return {
      text: `${priorityEmojis[priority]} Error Detection Alert`,
      attachments: [
        {
          color: priorityColors[priority],
          title: `${priorityEmojis[priority]} ${errorData.type || 'Application Error'}`,
          title_link: errorData.context?.url,
          fields: [
            {
              title: 'Error Message',
              value: `\`\`\`${errorData.message}\`\`\``,
              short: false
            },
            {
              title: 'Priority',
              value: priority.toUpperCase(),
              short: true
            },
            {
              title: 'Timestamp',
              value: errorData.timestamp,
              short: true
            },
            {
              title: 'User Session',
              value: errorData.context?.sessionId || 'Unknown',
              short: true
            },
            {
              title: 'Browser',
              value: errorData.browser?.userAgent?.split(' ')[0] || 'Unknown',
              short: true
            }
          ],
          footer: 'Error Monitoring System',
          footer_icon: 'https://example.com/bot-icon.png',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    // AI 분석 결과가 있는 경우 추가 첨부
    if (analysisResult && analysisResult.content) {
      message.attachments.push({
        color: '#0066CC',
        title: '🤖 AI Analysis Result',
        text: this.truncateForSlack(analysisResult.content, 1000),
        mrkdwn_in: ['text']
      });

      // 액션 아이템이 있는 경우
      if (analysisResult.actionItems && analysisResult.actionItems.length > 0) {
        const actionText = analysisResult.actionItems
          .slice(0, 5) // 최대 5개만
          .map((item, index) => `${index + 1}. ${item.text} (${item.priority})`)
          .join('\n');

        message.attachments.push({
          color: '#00AA00',
          title: '📋 Recommended Actions',
          text: actionText,
          mrkdwn_in: ['text']
        });
      }
    }

    return message;
  }

  /**
   * Teams 알림 전송
   */
  async sendTeamsNotification(channel, notification) {
    if (!this.config.teams.webhookUrl) {
      throw new Error('Teams webhook URL not configured');
    }

    const { errorData, analysisResult } = notification;
    const message = this.formatTeamsMessage(errorData, analysisResult);

    try {
      const response = await axios.post(this.config.teams.webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.updateRateLimit('teams');

      return {
        channel: 'teams',
        target: channel.target,
        success: true,
        response: response.status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Teams webhook error: ${error.message}`);
    }
  }

  /**
   * Teams 메시지 포맷팅
   */
  formatTeamsMessage(errorData, analysisResult) {
    const priority = this.determinePriority(errorData, analysisResult);
    const priorityColors = {
      critical: 'attention',
      high: 'warning',
      medium: 'accent',
      low: 'good'
    };

    const card = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: `Error Alert: ${errorData.message}`,
      themeColor: this.getTeamsColor(priority),
      sections: [
        {
          activityTitle: `🚨 Error Detection Alert - ${priority.toUpperCase()}`,
          activitySubtitle: errorData.timestamp,
          facts: [
            {
              name: 'Error Type',
              value: errorData.type || 'Application Error'
            },
            {
              name: 'Message',
              value: errorData.message
            },
            {
              name: 'URL',
              value: errorData.context?.url || 'N/A'
            },
            {
              name: 'Session ID',
              value: errorData.context?.sessionId || 'Unknown'
            }
          ],
          markdown: true
        }
      ]
    };

    // AI 분석 결과 추가
    if (analysisResult && analysisResult.content) {
      card.sections.push({
        activityTitle: '🤖 AI Analysis',
        text: this.truncateForTeams(analysisResult.content, 800)
      });
    }

    // 액션 버튼 추가
    card.potentialAction = [
      {
        '@type': 'OpenUri',
        name: 'View in Dashboard',
        targets: [
          {
            os: 'default',
            uri: `https://monitoring.company.com/errors/${notification.id}`
          }
        ]
      },
      {
        '@type': 'OpenUri',
        name: 'View Application',
        targets: [
          {
            os: 'default',
            uri: errorData.context?.url || 'https://app.company.com'
          }
        ]
      }
    ];

    return card;
  }

  /**
   * Teams 색상 조회
   */
  getTeamsColor(priority) {
    const colors = {
      critical: '#FF0000',
      high: '#FF6600',
      medium: '#FFCC00',
      low: '#00FF00'
    };
    return colors[priority] || colors.medium;
  }

  /**
   * 이메일 알림 전송
   */
  async sendEmailNotification(channel, notification) {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not configured');
    }

    const { errorData, analysisResult } = notification;
    const { subject, html, text } = this.formatEmailMessage(errorData, analysisResult);
    
    const recipients = this.getEmailRecipients(channel.target);
    
    try {
      const result = await this.emailTransporter.sendMail({
        from: this.config.email.from,
        to: recipients.join(', '),
        subject,
        html,
        text
      });

      this.updateRateLimit('email');

      return {
        channel: 'email',
        target: channel.target,
        success: true,
        messageId: result.messageId,
        recipients: recipients.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Email sending error: ${error.message}`);
    }
  }

  /**
   * 이메일 메시지 포맷팅
   */
  formatEmailMessage(errorData, analysisResult) {
    const priority = this.determinePriority(errorData, analysisResult);
    
    const subject = `[${priority.toUpperCase()}] Error Alert: ${errorData.type || 'Application Error'}`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: ${this.getEmailColor(priority)}; color: white; padding: 20px; }
    .content { padding: 20px; }
    .error-details { background-color: #f4f4f4; padding: 15px; border-left: 4px solid ${this.getEmailColor(priority)}; }
    .analysis { background-color: #e8f4f8; padding: 15px; margin-top: 20px; }
    .footer { background-color: #f8f8f8; padding: 10px; text-align: center; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚨 Error Detection Alert</h1>
    <h2>Priority: ${priority.toUpperCase()}</h2>
  </div>
  
  <div class="content">
    <div class="error-details">
      <h3>Error Details</h3>
      <table>
        <tr><th>Type</th><td>${errorData.type || 'Application Error'}</td></tr>
        <tr><th>Message</th><td>${errorData.message}</td></tr>
        <tr><th>Timestamp</th><td>${errorData.timestamp}</td></tr>
        <tr><th>URL</th><td>${errorData.context?.url || 'N/A'}</td></tr>
        <tr><th>Session ID</th><td>${errorData.context?.sessionId || 'Unknown'}</td></tr>
        <tr><th>User Agent</th><td>${errorData.browser?.userAgent || 'N/A'}</td></tr>
      </table>
      
      ${errorData.stack ? `
      <h4>Stack Trace</h4>
      <pre style="background-color: #fff; padding: 10px; overflow-x: auto;">${errorData.stack}</pre>
      ` : ''}
    </div>

    ${analysisResult ? `
    <div class="analysis">
      <h3>🤖 AI Analysis Result</h3>
      <div>${this.formatAnalysisForEmail(analysisResult.content)}</div>
      
      ${analysisResult.actionItems ? `
      <h4>📋 Recommended Actions</h4>
      <ol>
        ${analysisResult.actionItems.map(item => 
          `<li><strong>${item.text}</strong> (Priority: ${item.priority}, Estimated Time: ${item.estimated_time})</li>`
        ).join('')}
      </ol>
      ` : ''}
    </div>
    ` : ''}
  </div>
  
  <div class="footer">
    <p>This message was sent by the Error Monitoring System</p>
    <p>Generated at: ${new Date().toISOString()}</p>
  </div>
</body>
</html>
    `;

    const text = `
ERROR ALERT - ${priority.toUpperCase()}

Error Details:
- Type: ${errorData.type || 'Application Error'}
- Message: ${errorData.message}
- Timestamp: ${errorData.timestamp}
- URL: ${errorData.context?.url || 'N/A'}
- Session ID: ${errorData.context?.sessionId || 'Unknown'}

${analysisResult ? `
AI Analysis:
${analysisResult.content}

Recommended Actions:
${analysisResult.actionItems?.map((item, index) => 
  `${index + 1}. ${item.text} (${item.priority})`
).join('\n') || 'No actions available'}
` : ''}

--
Error Monitoring System
Generated at: ${new Date().toISOString()}
    `;

    return { subject, html, text };
  }

  /**
   * 이메일 색상 조회
   */
  getEmailColor(priority) {
    const colors = {
      critical: '#DC3545',
      high: '#FD7E14',
      medium: '#FFC107',
      low: '#28A745'
    };
    return colors[priority] || colors.medium;
  }

  /**
   * 분석 결과를 이메일용으로 포맷팅
   */
  formatAnalysisForEmail(content) {
    // 마크다운을 HTML로 간단 변환
    return content
      .replace(/### (.*)/g, '<h4>$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/```([\s\S]*?)```/g, '<pre style="background-color: #f8f9fa; padding: 10px; border-radius: 4px;">$1</pre>')
      .replace(/\n/g, '<br>');
  }

  /**
   * 이메일 수신자 조회
   */
  getEmailRecipients(target) {
    const recipientGroups = {
      all: this.config.email.recipients,
      'dev-team': this.config.email.recipients.filter(email => email.includes('dev')),
      'ops-team': this.config.email.recipients.filter(email => email.includes('ops')),
      'management': this.config.email.recipients.filter(email => email.includes('manager'))
    };

    return recipientGroups[target] || this.config.email.recipients;
  }

  /**
   * SMS 알림 전송
   */
  async sendSMSNotification(channel, notification) {
    const { errorData } = notification;
    const message = this.formatSMSMessage(errorData);
    const recipients = this.getSMSRecipients(channel.target);

    const results = [];
    
    for (const recipient of recipients) {
      try {
        const result = await this.sendSMS(recipient, message);
        results.push({
          recipient,
          success: true,
          messageId: result.messageId
        });
      } catch (error) {
        results.push({
          recipient,
          success: false,
          error: error.message
        });
      }
    }

    return {
      channel: 'sms',
      target: channel.target,
      success: results.some(r => r.success),
      results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * SMS 메시지 포맷팅
   */
  formatSMSMessage(errorData) {
    const priority = this.determinePriority(errorData);
    return `🚨 ${priority.toUpperCase()} Error Alert
${errorData.type || 'App Error'}: ${errorData.message.substring(0, 100)}
Time: ${new Date(errorData.timestamp).toLocaleString()}
Check dashboard for details.`;
  }

  /**
   * SMS 수신자 조회
   */
  getSMSRecipients(target) {
    const recipientGroups = {
      oncall: this.config.sms.recipients.filter(num => num.includes('oncall')),
      emergency: this.config.sms.recipients,
      leads: this.config.sms.recipients.filter(num => num.includes('lead'))
    };

    return recipientGroups[target] || [];
  }

  /**
   * SMS 전송 (Twilio 예제)
   */
  async sendSMS(to, message) {
    // 실제 구현에서는 Twilio SDK 사용
    console.log(`SMS sent to ${to}: ${message}`);
    return { messageId: `sms_${Date.now()}` };
  }

  /**
   * 속도 제한 확인
   */
  isRateLimited(channelType) {
    const limits = {
      slack: { calls: 50, window: 60000 }, // 1분에 50회
      teams: { calls: 30, window: 60000 }, // 1분에 30회
      email: { calls: 20, window: 60000 }, // 1분에 20회
      sms: { calls: 10, window: 60000 }     // 1분에 10회
    };

    const limit = limits[channelType];
    if (!limit) return false;

    const now = Date.now();
    const windowStart = now - limit.window;
    
    if (!this.rateLimits.has(channelType)) {
      this.rateLimits.set(channelType, []);
    }

    const calls = this.rateLimits.get(channelType);
    
    // 윈도우 밖의 호출 제거
    const recentCalls = calls.filter(timestamp => timestamp > windowStart);
    this.rateLimits.set(channelType, recentCalls);

    return recentCalls.length >= limit.calls;
  }

  /**
   * 속도 제한 업데이트
   */
  updateRateLimit(channelType) {
    if (!this.rateLimits.has(channelType)) {
      this.rateLimits.set(channelType, []);
    }
    
    this.rateLimits.get(channelType).push(Date.now());
  }

  /**
   * 재시도 큐에 추가
   */
  addToRetryQueue(channel, notification) {
    this.retryQueue.push({
      channel,
      notification,
      attempts: 0,
      nextRetry: Date.now() + 30000 // 30초 후 재시도
    });
  }

  /**
   * 재시도 처리
   */
  async processRetryQueue() {
    const now = Date.now();
    const readyItems = this.retryQueue.filter(item => item.nextRetry <= now);

    for (const item of readyItems) {
      if (item.attempts < 3) { // 최대 3회 재시도
        try {
          await this.sendToChannel(item.channel, item.notification);
          
          // 성공시 큐에서 제거
          const index = this.retryQueue.indexOf(item);
          this.retryQueue.splice(index, 1);
        } catch (error) {
          item.attempts++;
          item.nextRetry = now + (30000 * Math.pow(2, item.attempts)); // 지수적 백오프
        }
      } else {
        // 최대 재시도 횟수 초과시 제거
        const index = this.retryQueue.indexOf(item);
        this.retryQueue.splice(index, 1);
        console.error('Max retry attempts reached for notification:', item.notification.id);
      }
    }
  }

  /**
   * Slack용 텍스트 자르기
   */
  truncateForSlack(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Teams용 텍스트 자르기
   */
  truncateForTeams(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * 알림 통계 조회
   */
  getNotificationStats() {
    const stats = {
      total: this.notificationHistory.length,
      byChannel: {},
      byPriority: {},
      recentFailures: this.retryQueue.length
    };

    this.notificationHistory.forEach(notification => {
      // 채널별 통계
      notification.channels.forEach(channel => {
        if (!stats.byChannel[channel.type]) {
          stats.byChannel[channel.type] = 0;
        }
        stats.byChannel[channel.type]++;
      });

      // 우선순위별 통계
      if (!stats.byPriority[notification.priority]) {
        stats.byPriority[notification.priority] = 0;
      }
      stats.byPriority[notification.priority]++;
    });

    return stats;
  }

  /**
   * 주기적 작업 시작
   */
  startPeriodicTasks() {
    // 재시도 큐 처리 (30초마다)
    setInterval(() => {
      this.processRetryQueue();
    }, 30000);

    // 속도 제한 정리 (5분마다)
    setInterval(() => {
      const fiveMinutesAgo = Date.now() - 300000;
      for (const [channel, calls] of this.rateLimits) {
        const recentCalls = calls.filter(timestamp => timestamp > fiveMinutesAgo);
        this.rateLimits.set(channel, recentCalls);
      }
    }, 300000);
  }
}

export default NotificationSystem;