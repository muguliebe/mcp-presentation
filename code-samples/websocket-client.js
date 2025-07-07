// WebSocket 클라이언트 - 에러 감지 및 전송
// 실시간 에러 모니터링을 위한 클라이언트 구현

class ErrorMonitoringClient {
  constructor(wsUrl = 'ws://localhost:8080') {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.isConnected = false;
    
    this.errorQueue = [];
    this.listeners = new Map();
    
    this.init();
  }

  /**
   * 클라이언트 초기화
   */
  init() {
    this.setupErrorHandlers();
    this.connect();
  }

  /**
   * WebSocket 연결
   */
  connect() {
    try {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        console.log('Connected to MCP Error Monitoring Server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // 대기 중인 에러 전송
        this.flushErrorQueue();
        
        // 연결 성공 이벤트 발생
        this.emit('connected');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (error) {
          console.error('Error parsing server message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('Disconnected from MCP Error Monitoring Server');
        this.isConnected = false;
        this.emit('disconnected');
        
        // 자동 재연결 시도
        this.attemptReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  /**
   * 재연결 시도
   */
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
    }
  }

  /**
   * 서버 메시지 처리
   */
  handleServerMessage(data) {
    switch (data.type) {
      case 'analysis_result':
        console.log('Received analysis result:', data.data);
        this.emit('analysisResult', data.data);
        break;
      case 'notification_sent':
        console.log('Notification sent:', data.data);
        this.emit('notificationSent', data.data);
        break;
      case 'error':
        console.error('Server error:', data.message);
        this.emit('serverError', data.message);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  /**
   * 에러 핸들러 설정
   */
  setupErrorHandlers() {
    // JavaScript 에러 감지
    window.addEventListener('error', (event) => {
      this.captureError({
        type: 'javascript_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });

    // Unhandled Promise 에러 감지
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        type: 'unhandled_promise_rejection',
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        promise: event.reason
      });
    });

    // 네트워크 에러 감지 (fetch 오버라이드)
    this.interceptFetch();
    
    // XMLHttpRequest 에러 감지
    this.interceptXHR();
  }

  /**
   * Fetch API 인터셉트
   */
  interceptFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // HTTP 에러 상태 감지
        if (!response.ok) {
          this.captureError({
            type: 'http_error',
            message: `HTTP ${response.status}: ${response.statusText}`,
            url: response.url,
            status: response.status,
            statusText: response.statusText,
            timestamp: new Date().toISOString(),
            request: {
              method: args[1]?.method || 'GET',
              url: args[0]
            }
          });
        }
        
        return response;
      } catch (error) {
        this.captureError({
          type: 'network_error',
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          request: {
            method: args[1]?.method || 'GET',
            url: args[0]
          }
        });
        
        throw error;
      }
    };
  }

  /**
   * XMLHttpRequest 인터셉트
   */
  interceptXHR() {
    const originalXHR = window.XMLHttpRequest;
    
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
      const originalOpen = xhr.open;
      const originalSend = xhr.send;
      
      let requestData = {};
      
      xhr.open = function(method, url, ...args) {
        requestData = { method, url };
        return originalOpen.apply(this, [method, url, ...args]);
      };
      
      xhr.send = function(data) {
        requestData.data = data;
        
        xhr.addEventListener('error', () => {
          this.captureError({
            type: 'xhr_error',
            message: 'XMLHttpRequest failed',
            timestamp: new Date().toISOString(),
            request: requestData,
            status: xhr.status,
            statusText: xhr.statusText
          });
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 400) {
            this.captureError({
              type: 'xhr_http_error',
              message: `HTTP ${xhr.status}: ${xhr.statusText}`,
              timestamp: new Date().toISOString(),
              request: requestData,
              status: xhr.status,
              statusText: xhr.statusText,
              responseText: xhr.responseText
            });
          }
        });
        
        return originalSend.apply(this, [data]);
      }.bind(this);
      
      return xhr;
    }.bind(this);
  }

  /**
   * 에러 캡처 및 전송
   */
  captureError(errorData) {
    // 에러 분류 및 우선순위 설정
    const enrichedError = this.enrichErrorData(errorData);
    
    console.log('Error captured:', enrichedError);
    
    if (this.isConnected) {
      this.sendError(enrichedError);
    } else {
      // 연결되지 않은 경우 큐에 저장
      this.errorQueue.push(enrichedError);
    }
    
    // 에러 캡처 이벤트 발생
    this.emit('errorCaptured', enrichedError);
  }

  /**
   * 에러 데이터 보강
   */
  enrichErrorData(errorData) {
    return {
      ...errorData,
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      priority: this.calculatePriority(errorData),
      context: this.getContextInfo(),
      browser: this.getBrowserInfo(),
      performance: this.getPerformanceInfo()
    };
  }

  /**
   * 에러 우선순위 계산
   */
  calculatePriority(errorData) {
    const message = errorData.message?.toLowerCase() || '';
    
    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical';
    } else if (message.includes('network') || message.includes('timeout') || errorData.status >= 500) {
      return 'high';
    } else if (message.includes('warning') || errorData.status >= 400) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 컨텍스트 정보 수집
   */
  getContextInfo() {
    return {
      url: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      referrer: document.referrer,
      title: document.title,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      userId: this.getUserId()
    };
  }

  /**
   * 브라우저 정보 수집
   */
  getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      screenWidth: screen.width,
      screenHeight: screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * 성능 정보 수집
   */
  getPerformanceInfo() {
    if (window.performance) {
      return {
        loadTime: window.performance.timing.loadEventEnd - window.performance.timing.navigationStart,
        domContentLoaded: window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart,
        firstPaint: window.performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime,
        firstContentfulPaint: window.performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime,
        memoryUsage: window.performance.memory ? {
          usedJSHeapSize: window.performance.memory.usedJSHeapSize,
          totalJSHeapSize: window.performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
        } : null
      };
    }
    return null;
  }

  /**
   * 세션 ID 가져오기
   */
  getSessionId() {
    let sessionId = localStorage.getItem('error_monitoring_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('error_monitoring_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * 사용자 ID 가져오기 (구현에 따라 수정)
   */
  getUserId() {
    // 실제 구현에서는 인증 시스템에서 사용자 ID를 가져옴
    return localStorage.getItem('user_id') || 'anonymous';
  }

  /**
   * 에러 전송
   */
  sendError(errorData) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'error_report',
        data: errorData
      }));
    }
  }

  /**
   * 에러 큐 플러시
   */
  flushErrorQueue() {
    while (this.errorQueue.length > 0) {
      const error = this.errorQueue.shift();
      this.sendError(error);
    }
  }

  /**
   * 수동 에러 보고
   */
  reportError(message, details = {}) {
    this.captureError({
      type: 'manual_report',
      message,
      timestamp: new Date().toISOString(),
      details,
      stack: new Error().stack
    });
  }

  /**
   * 이벤트 리스너
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * 이벤트 발생
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * 연결 해제
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * 연결 상태 확인
   */
  isConnected() {
    return this.isConnected;
  }

  /**
   * 에러 통계 가져오기
   */
  getErrorStats() {
    const stats = {
      totalErrors: this.errorQueue.length,
      errorsByType: {},
      errorsByPriority: {}
    };

    this.errorQueue.forEach(error => {
      // 타입별 집계
      if (stats.errorsByType[error.type]) {
        stats.errorsByType[error.type]++;
      } else {
        stats.errorsByType[error.type] = 1;
      }

      // 우선순위별 집계
      if (stats.errorsByPriority[error.priority]) {
        stats.errorsByPriority[error.priority]++;
      } else {
        stats.errorsByPriority[error.priority] = 1;
      }
    });

    return stats;
  }
}

// 사용 예제
const errorMonitor = new ErrorMonitoringClient();

// 이벤트 리스너 등록
errorMonitor.on('connected', () => {
  console.log('에러 모니터링 시스템에 연결되었습니다.');
});

errorMonitor.on('errorCaptured', (error) => {
  console.log('에러가 캡처되었습니다:', error);
});

errorMonitor.on('analysisResult', (result) => {
  console.log('AI 분석 결과:', result);
  
  // 분석 결과를 사용자에게 표시
  if (result.content && result.content[0]) {
    showAnalysisResult(result.content[0].text);
  }
});

// 분석 결과 표시 함수
function showAnalysisResult(analysisText) {
  // 실제 구현에서는 UI에 분석 결과 표시
  console.log('분석 결과:', analysisText);
  
  // 모달이나 토스트로 표시
  if (window.showToast) {
    window.showToast('에러 분석 완료', analysisText, 'info');
  }
}

// 전역 에러 모니터링 객체로 등록
window.errorMonitor = errorMonitor;

// 수동 에러 보고를 위한 전역 함수
window.reportError = (message, details) => {
  errorMonitor.reportError(message, details);
};

export default ErrorMonitoringClient;