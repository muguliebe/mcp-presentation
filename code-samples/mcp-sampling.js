// MCP Sampling 구현 예제
// AI 모델과의 상호작용을 위한 샘플링 기능

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SamplingRequestSchema } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Sampling Provider
 * AI 모델과의 상호작용을 통한 에러 분석 및 해결책 제안
 */
class MCPSamplingProvider {
  constructor(options = {}) {
    this.apiKey = options.apiKey;
    this.modelName = options.modelName || 'claude-3-5-sonnet-20241022';
    this.baseUrl = options.baseUrl || 'https://api.anthropic.com';
    this.maxTokens = options.maxTokens || 2000;
    this.temperature = options.temperature || 0.1;
    
    this.conversationHistory = [];
    this.analysisCache = new Map();
    this.errorPatterns = new Map();
  }

  /**
   * 에러 분석을 위한 AI 샘플링
   */
  async analyzeError(errorData) {
    const prompt = this.buildErrorAnalysisPrompt(errorData);
    
    try {
      const response = await this.callAI({
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt('error_analysis')
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        maxTokens: this.maxTokens,
        temperature: this.temperature
      });

      const analysis = this.parseAnalysisResponse(response);
      
      // 분석 결과 캐싱
      this.cacheAnalysis(errorData, analysis);
      
      // 에러 패턴 학습
      this.updateErrorPatterns(errorData, analysis);
      
      return analysis;
    } catch (error) {
      console.error('Error in AI analysis:', error);
      return this.getFallbackAnalysis(errorData);
    }
  }

  /**
   * 에러 분석 프롬프트 생성
   */
  buildErrorAnalysisPrompt(errorData) {
    return `
## 에러 정보 분석 요청

### 기본 정보
- **에러 메시지**: ${errorData.message}
- **발생 시간**: ${errorData.timestamp}
- **에러 유형**: ${errorData.type}
- **우선순위**: ${errorData.priority}

### 스택 트레이스
\`\`\`
${errorData.stack || 'No stack trace available'}
\`\`\`

### 컨텍스트 정보
- **URL**: ${errorData.context?.url || 'N/A'}
- **사용자 에이전트**: ${errorData.context?.userAgent || 'N/A'}
- **세션 ID**: ${errorData.context?.sessionId || 'N/A'}

### 브라우저 정보
- **브라우저**: ${errorData.browser?.userAgent || 'N/A'}
- **화면 크기**: ${errorData.browser?.screenWidth || 0}x${errorData.browser?.screenHeight || 0}
- **언어**: ${errorData.browser?.language || 'N/A'}

### 성능 정보
- **메모리 사용량**: ${errorData.performance?.memoryUsage ? JSON.stringify(errorData.performance.memoryUsage) : 'N/A'}
- **로드 시간**: ${errorData.performance?.loadTime || 'N/A'}ms

### 추가 세부사항
${errorData.details ? JSON.stringify(errorData.details, null, 2) : 'No additional details'}

### 유사 에러 패턴
${this.getSimilarErrorPatterns(errorData)}

## 분석 요청사항
1. 에러의 근본 원인 분석
2. 즉시 해결할 수 있는 방법
3. 장기적인 해결 방안
4. 재발 방지 전략
5. 코드 개선 제안
6. 모니터링 강화 방안
`;
  }

  /**
   * 시스템 프롬프트 가져오기
   */
  getSystemPrompt(type) {
    const prompts = {
      error_analysis: `
당신은 웹 애플리케이션 에러 분석 전문가입니다. 다음 역할을 수행해주세요:

## 역할
- 에러의 근본 원인을 정확히 파악
- 실용적이고 구체적인 해결책 제시
- 개발자가 이해하기 쉬운 설명 제공
- 우선순위별 대응 방안 제안

## 분석 형식
다음 구조로 응답해주세요:

### 🔍 에러 분석
- **에러 유형**: 
- **심각도**: 
- **영향 범위**: 
- **근본 원인**: 

### 💡 해결 방안
#### 즉시 조치 (Priority: High)
1. 
2. 
3. 

#### 근본 해결 (Priority: Medium)
1. 
2. 
3. 

#### 재발 방지 (Priority: Low)
1. 
2. 
3. 

### 📝 코드 개선 제안
\`\`\`javascript
// 개선된 코드 예시
\`\`\`

### 📊 모니터링 강화
- 추가 모니터링 포인트
- 알림 설정 권장사항
- 성능 메트릭 추적

### 🎯 학습 포인트
- 유사 에러 예방 방법
- 베스트 프랙티스
- 참고 자료

## 응답 원칙
- 구체적이고 실행 가능한 해결책 제시
- 개발자의 기술 수준을 고려한 설명
- 비즈니스 임팩트 최소화 방안 고려
- 한국어로 명확하게 응답
`,
      code_review: `
당신은 코드 리뷰 전문가입니다. 에러와 관련된 코드를 분석하고 개선 방안을 제시해주세요.

## 리뷰 관점
- 에러 처리 로직의 적절성
- 코드 품질 및 가독성
- 성능 최적화 가능성
- 보안 취약점 여부
- 테스트 코드 필요성

## 응답 형식
### 코드 분석 결과
### 개선 사항
### 제안 코드
### 추가 고려사항
`,
      pattern_analysis: `
당신은 에러 패턴 분석 전문가입니다. 다양한 에러 데이터를 분석하여 패턴을 찾고 예측 모델을 구축해주세요.

## 분석 영역
- 에러 발생 빈도 패턴
- 시간대별 에러 트렌드
- 사용자 행동과 에러 상관관계
- 시스템 리소스와 에러 발생 관계

## 응답 형식
### 패턴 분석 결과
### 예측 모델
### 예방 전략
### 모니터링 권장사항
`
    };

    return prompts[type] || prompts.error_analysis;
  }

  /**
   * AI 호출
   */
  async callAI(request) {
    const cacheKey = this.generateCacheKey(request);
    
    // 캐시 확인
    if (this.analysisCache.has(cacheKey)) {
      console.log('Using cached analysis result');
      return this.analysisCache.get(cacheKey);
    }

    try {
      // 실제 구현에서는 Claude API 호출
      const response = await this.anthropicAPICall(request);
      
      // 캐시에 저장
      this.analysisCache.set(cacheKey, response);
      
      return response;
    } catch (error) {
      console.error('AI API call failed:', error);
      throw error;
    }
  }

  /**
   * Anthropic API 호출 (시뮬레이션)
   */
  async anthropicAPICall(request) {
    // 실제 구현에서는 Anthropic API 호출
    // 여기서는 시뮬레이션 응답 반환
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // API 호출 시뮬레이션
    
    return {
      content: this.generateAnalysisResponse(request),
      usage: {
        input_tokens: 500,
        output_tokens: 800
      }
    };
  }

  /**
   * 분석 응답 생성 (시뮬레이션)
   */
  generateAnalysisResponse(request) {
    const userMessage = request.messages.find(m => m.role === 'user')?.content || '';
    
    // 에러 유형별 맞춤 응답 생성
    if (userMessage.includes('database') || userMessage.includes('connection')) {
      return this.getDatabaseErrorAnalysis();
    } else if (userMessage.includes('network') || userMessage.includes('timeout')) {
      return this.getNetworkErrorAnalysis();
    } else if (userMessage.includes('memory') || userMessage.includes('performance')) {
      return this.getPerformanceErrorAnalysis();
    } else {
      return this.getGenericErrorAnalysis();
    }
  }

  /**
   * 데이터베이스 에러 분석
   */
  getDatabaseErrorAnalysis() {
    return `
### 🔍 에러 분석
- **에러 유형**: Database Connection Error
- **심각도**: High
- **영향 범위**: 전체 애플리케이션
- **근본 원인**: 데이터베이스 연결 풀 고갈 또는 네트워크 이슈

### 💡 해결 방안
#### 즉시 조치 (Priority: High)
1. 데이터베이스 서버 상태 확인
2. 연결 풀 현황 모니터링
3. 네트워크 연결 상태 점검

#### 근본 해결 (Priority: Medium)
1. 연결 풀 크기 최적화
2. 연결 타임아웃 설정 조정
3. 재시도 로직 구현

#### 재발 방지 (Priority: Low)
1. 데이터베이스 모니터링 대시보드 구축
2. 연결 풀 메트릭 추적
3. 장애 복구 자동화

### 📝 코드 개선 제안
\`\`\`javascript
// 개선된 데이터베이스 연결 관리
const pool = new Pool({
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  reconnectDelay: 2000
});

// 연결 재시도 로직
async function connectWithRetry(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      return connection;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
\`\`\`

### 📊 모니터링 강화
- 연결 풀 사용률 추적
- 쿼리 실행 시간 모니터링
- 데이터베이스 응답 시간 알림

### 🎯 학습 포인트
- 연결 풀 최적화 방법
- 데이터베이스 성능 튜닝
- 장애 복구 전략 수립
`;
  }

  /**
   * 네트워크 에러 분석
   */
  getNetworkErrorAnalysis() {
    return `
### 🔍 에러 분석
- **에러 유형**: Network Request Error
- **심각도**: Medium
- **영향 범위**: 특정 기능
- **근본 원인**: API 서버 과부하 또는 네트워크 불안정

### 💡 해결 방안
#### 즉시 조치 (Priority: High)
1. API 서버 상태 확인
2. 네트워크 연결 상태 점검
3. 사용자에게 임시 오류 메시지 표시

#### 근본 해결 (Priority: Medium)
1. 재시도 메커니즘 구현
2. 서킷 브레이커 패턴 적용
3. 캐싱 전략 도입

#### 재발 방지 (Priority: Low)
1. API 응답 시간 모니터링
2. 네트워크 상태 대시보드
3. 로드 밸런싱 검토

### 📝 코드 개선 제안
\`\`\`javascript
// 재시도 로직을 포함한 API 호출
async function apiCallWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}\`);
      }
      
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}

// 서킷 브레이커 패턴
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
\`\`\`

### 📊 모니터링 강화
- API 응답 시간 추적
- 네트워크 에러율 모니터링
- 서킷 브레이커 상태 알림

### 🎯 학습 포인트
- 네트워크 장애 대응 패턴
- API 호출 최적화
- 사용자 경험 개선 방안
`;
  }

  /**
   * 성능 에러 분석
   */
  getPerformanceErrorAnalysis() {
    return `
### 🔍 에러 분석
- **에러 유형**: Performance/Memory Error
- **심각도**: High
- **영향 범위**: 사용자 경험
- **근본 원인**: 메모리 누수 또는 비효율적인 코드

### 💡 해결 방안
#### 즉시 조치 (Priority: High)
1. 메모리 사용량 모니터링
2. 성능 프로파일링 실행
3. 리소스 집약적 작업 식별

#### 근본 해결 (Priority: Medium)
1. 메모리 누수 수정
2. 코드 최적화 수행
3. 가비지 컬렉션 튜닝

#### 재발 방지 (Priority: Low)
1. 성능 테스트 자동화
2. 메모리 사용량 알림
3. 코드 품질 검사 강화

### 📝 코드 개선 제안
\`\`\`javascript
// 메모리 효율적인 코드 패턴
class MemoryEfficientHandler {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 1000;
  }

  addToCache(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  cleanup() {
    this.cache.clear();
  }
}

// 이벤트 리스너 정리
class ComponentManager {
  constructor() {
    this.listeners = [];
  }

  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  }

  cleanup() {
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
  }
}
\`\`\`

### 📊 모니터링 강화
- 메모리 사용량 실시간 추적
- CPU 사용률 모니터링
- 렌더링 성능 메트릭

### 🎯 학습 포인트
- 메모리 관리 베스트 프랙티스
- 성능 최적화 기법
- 프로파일링 도구 활용법
`;
  }

  /**
   * 일반 에러 분석
   */
  getGenericErrorAnalysis() {
    return `
### 🔍 에러 분석
- **에러 유형**: Application Error
- **심각도**: Medium
- **영향 범위**: 특정 기능
- **근본 원인**: 코드 로직 오류 또는 예외 처리 부족

### 💡 해결 방안
#### 즉시 조치 (Priority: High)
1. 에러 로그 상세 분석
2. 관련 코드 리뷰
3. 임시 패치 적용

#### 근본 해결 (Priority: Medium)
1. 코드 리팩토링
2. 예외 처리 강화
3. 테스트 케이스 추가

#### 재발 방지 (Priority: Low)
1. 코드 품질 검사
2. 자동 테스트 확장
3. 에러 모니터링 강화

### 📝 코드 개선 제안
\`\`\`javascript
// 개선된 에러 처리
async function handleUserAction(data) {
  try {
    // 입력 유효성 검사
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid input data');
    }

    // 비즈니스 로직 실행
    const result = await processUserData(data);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    // 에러 로깅
    console.error('Error in handleUserAction:', error);
    
    // 사용자 친화적 에러 메시지
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}
\`\`\`

### 📊 모니터링 강화
- 에러 발생 빈도 추적
- 사용자 행동 패턴 분석
- 코드 품질 메트릭

### 🎯 학습 포인트
- 방어적 프로그래밍 기법
- 에러 처리 베스트 프랙티스
- 테스트 주도 개발
`;
  }

  /**
   * 분석 응답 파싱
   */
  parseAnalysisResponse(response) {
    return {
      content: response.content,
      usage: response.usage,
      confidence: this.calculateConfidence(response),
      actionItems: this.extractActionItems(response.content),
      priority: this.extractPriority(response.content)
    };
  }

  /**
   * 신뢰도 계산
   */
  calculateConfidence(response) {
    // 실제 구현에서는 더 정교한 신뢰도 계산
    const contentLength = response.content.length;
    const hasCodeSamples = response.content.includes('```');
    const hasStructure = response.content.includes('###');
    
    let confidence = 0.5;
    
    if (contentLength > 500) confidence += 0.2;
    if (hasCodeSamples) confidence += 0.2;
    if (hasStructure) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * 액션 아이템 추출
   */
  extractActionItems(content) {
    const actionRegex = /\d+\.\s+(.+)/g;
    const matches = content.match(actionRegex) || [];
    
    return matches.map(match => {
      const text = match.replace(/\d+\.\s+/, '').trim();
      return {
        text,
        priority: this.inferActionPriority(text),
        estimated_time: this.estimateTime(text)
      };
    });
  }

  /**
   * 우선순위 추출
   */
  extractPriority(content) {
    if (content.includes('Critical') || content.includes('긴급')) {
      return 'critical';
    } else if (content.includes('High') || content.includes('높음')) {
      return 'high';
    } else if (content.includes('Medium') || content.includes('중간')) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 액션 우선순위 추론
   */
  inferActionPriority(text) {
    const highPriorityKeywords = ['즉시', '긴급', '확인', '재시작'];
    const mediumPriorityKeywords = ['최적화', '개선', '검토'];
    const lowPriorityKeywords = ['문서화', '모니터링', '교육'];
    
    if (highPriorityKeywords.some(keyword => text.includes(keyword))) {
      return 'high';
    } else if (mediumPriorityKeywords.some(keyword => text.includes(keyword))) {
      return 'medium';
    } else if (lowPriorityKeywords.some(keyword => text.includes(keyword))) {
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * 소요 시간 추정
   */
  estimateTime(text) {
    const quickTasks = ['확인', '체크', '점검'];
    const mediumTasks = ['수정', '개선', '최적화'];
    const longTasks = ['리팩토링', '재구축', '마이그레이션'];
    
    if (quickTasks.some(task => text.includes(task))) {
      return '15-30분';
    } else if (mediumTasks.some(task => text.includes(task))) {
      return '1-2시간';
    } else if (longTasks.some(task => text.includes(task))) {
      return '1-3일';
    }
    
    return '30분-1시간';
  }

  /**
   * 유사 에러 패턴 조회
   */
  getSimilarErrorPatterns(errorData) {
    const patterns = [];
    
    for (const [pattern, info] of this.errorPatterns) {
      if (errorData.message.includes(pattern)) {
        patterns.push(`- ${pattern}: ${info.frequency}회 발생, 평균 해결 시간: ${info.averageResolutionTime}`);
      }
    }
    
    return patterns.length > 0 ? patterns.join('\n') : '유사한 에러 패턴이 없습니다.';
  }

  /**
   * 분석 결과 캐싱
   */
  cacheAnalysis(errorData, analysis) {
    const cacheKey = this.generateCacheKey(errorData);
    this.analysisCache.set(cacheKey, analysis);
    
    // 캐시 크기 제한
    if (this.analysisCache.size > 100) {
      const firstKey = this.analysisCache.keys().next().value;
      this.analysisCache.delete(firstKey);
    }
  }

  /**
   * 캐시 키 생성
   */
  generateCacheKey(data) {
    const key = typeof data === 'string' ? data : JSON.stringify(data);
    return require('crypto').createHash('md5').update(key).digest('hex');
  }

  /**
   * 에러 패턴 업데이트
   */
  updateErrorPatterns(errorData, analysis) {
    const pattern = this.extractErrorPattern(errorData);
    
    if (this.errorPatterns.has(pattern)) {
      const info = this.errorPatterns.get(pattern);
      info.frequency++;
      info.lastSeen = new Date();
      info.resolutionStrategies.push(analysis.actionItems);
    } else {
      this.errorPatterns.set(pattern, {
        frequency: 1,
        firstSeen: new Date(),
        lastSeen: new Date(),
        averageResolutionTime: '미확인',
        resolutionStrategies: [analysis.actionItems]
      });
    }
  }

  /**
   * 에러 패턴 추출
   */
  extractErrorPattern(errorData) {
    // 에러 메시지에서 패턴 추출
    const message = errorData.message.toLowerCase();
    
    // 일반적인 패턴들
    const patterns = [
      'database.*connection',
      'network.*timeout',
      'memory.*leak',
      'permission.*denied',
      'file.*not.*found',
      'undefined.*property',
      'null.*reference'
    ];
    
    for (const pattern of patterns) {
      if (new RegExp(pattern).test(message)) {
        return pattern;
      }
    }
    
    // 패턴이 없으면 첫 번째 단어 사용
    return message.split(' ')[0];
  }

  /**
   * 폴백 분석 결과
   */
  getFallbackAnalysis(errorData) {
    return {
      content: `
### 🔍 에러 분석 (기본 분석)
- **에러 유형**: ${errorData.type || 'Unknown'}
- **심각도**: ${errorData.priority || 'Medium'}
- **메시지**: ${errorData.message}

### 💡 기본 해결 방안
1. 에러 로그 상세 확인
2. 관련 코드 리뷰
3. 시스템 상태 점검
4. 필요시 서비스 재시작

### 📞 추가 지원
AI 분석이 일시적으로 불가능합니다. 
수동 분석이 필요한 경우 개발팀에 문의하세요.
      `,
      usage: { input_tokens: 0, output_tokens: 0 },
      confidence: 0.3,
      actionItems: [
        { text: '에러 로그 확인', priority: 'high', estimated_time: '15분' },
        { text: '코드 리뷰', priority: 'medium', estimated_time: '30분' },
        { text: '시스템 상태 점검', priority: 'medium', estimated_time: '15분' }
      ],
      priority: errorData.priority || 'medium'
    };
  }

  /**
   * 분석 통계 조회
   */
  getAnalysisStats() {
    return {
      totalAnalyses: this.analysisCache.size,
      errorPatterns: this.errorPatterns.size,
      commonPatterns: Array.from(this.errorPatterns.entries())
        .sort((a, b) => b[1].frequency - a[1].frequency)
        .slice(0, 5)
        .map(([pattern, info]) => ({ pattern, frequency: info.frequency }))
    };
  }

  /**
   * 캐시 정리
   */
  clearCache() {
    this.analysisCache.clear();
    this.conversationHistory = [];
  }
}

export default MCPSamplingProvider;