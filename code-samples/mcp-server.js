// MCP 에러 모니터링 서버 구현
// Model Context Protocol을 활용한 실시간 에러 분석 시스템

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  SamplingRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import WebSocket from 'ws';

/**
 * MCP 에러 모니터링 서버
 * 실시간 에러 감지, AI 분석, 팀 알림 기능 제공
 */
class ErrorMonitoringServer {
  constructor() {
    this.server = new Server({
      name: 'error-monitoring-server',
      version: '1.0.0',
      description: 'AI 기반 실시간 에러 모니터링 및 분석 시스템'
    });
    
    this.workspaceRoot = process.cwd();
    this.errorHistory = [];
    this.websocketServer = null;
    
    this.setupHandlers();
  }

  /**
   * MCP 핸들러 설정
   */
  setupHandlers() {
    // Resources 핸들러 - 워크스페이스 파일 접근
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'workspace://logs',
            name: 'Error Logs',
            description: '애플리케이션 에러 로그 파일',
            mimeType: 'text/plain'
          },
          {
            uri: 'workspace://config',
            name: 'Configuration',
            description: '애플리케이션 설정 파일',
            mimeType: 'application/json'
          },
          {
            uri: 'workspace://source',
            name: 'Source Code',
            description: '소스 코드 디렉터리',
            mimeType: 'text/plain'
          }
        ]
      };
    });

    // Resource 읽기 핸들러
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      try {
        let content = '';
        let mimeType = 'text/plain';
        
        switch (uri) {
          case 'workspace://logs':
            content = await this.readLogFiles();
            break;
          case 'workspace://config':
            content = await this.readConfigFiles();
            mimeType = 'application/json';
            break;
          case 'workspace://source':
            content = await this.readSourceFiles();
            break;
          default:
            throw new Error(`Unknown resource: ${uri}`);
        }
        
        return {
          contents: [{
            uri,
            mimeType,
            text: content
          }]
        };
      } catch (error) {
        throw new Error(`Failed to read resource ${uri}: ${error.message}`);
      }
    });

    // Tools 핸들러
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'analyze_error',
            description: '에러를 분석하고 해결책을 제안합니다',
            inputSchema: {
              type: 'object',
              properties: {
                error_message: {
                  type: 'string',
                  description: '에러 메시지'
                },
                stack_trace: {
                  type: 'string',
                  description: '스택 트레이스'
                },
                context: {
                  type: 'object',
                  description: '에러 발생 컨텍스트'
                }
              },
              required: ['error_message']
            }
          },
          {
            name: 'send_notification',
            description: '팀에게 알림을 전송합니다',
            inputSchema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: '알림 메시지'
                },
                priority: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical'],
                  description: '알림 우선순위'
                },
                channel: {
                  type: 'string',
                  description: '알림 채널 (slack, teams, email)'
                }
              },
              required: ['message', 'priority']
            }
          }
        ]
      };
    });

    // Tool 실행 핸들러
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'analyze_error':
            return await this.analyzeError(args);
          case 'send_notification':
            return await this.sendNotification(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${error.message}`
            }
          ]
        };
      }
    });

    // Prompts 핸들러
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'error_analysis',
            description: '에러 분석을 위한 프롬프트',
            arguments: [
              {
                name: 'error_data',
                description: '에러 정보',
                required: true
              }
            ]
          }
        ]
      };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (name === 'error_analysis') {
        return {
          messages: [
            {
              role: 'system',
              content: {
                type: 'text',
                text: `당신은 소프트웨어 에러 분석 전문가입니다. 
                       주어진 에러 정보를 분석하고 다음 형식으로 응답해주세요:
                       
                       ## 에러 분석
                       - 에러 유형: 
                       - 원인: 
                       - 심각도: 
                       
                       ## 해결책
                       1. 즉시 해결 방법:
                       2. 근본 원인 해결:
                       3. 재발 방지:
                       
                       ## 코드 예제
                       필요한 경우 수정 코드를 제공해주세요.`
              }
            },
            {
              role: 'user',
              content: {
                type: 'text',
                text: `에러 정보: ${JSON.stringify(args.error_data, null, 2)}`
              }
            }
          ]
        };
      }
      
      throw new Error(`Unknown prompt: ${name}`);
    });
  }

  /**
   * 에러 분석 함수
   */
  async analyzeError(args) {
    const { error_message, stack_trace, context } = args;
    
    // 에러 히스토리에 추가
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error_message,
      stack: stack_trace,
      context,
      id: Date.now()
    };
    
    this.errorHistory.push(errorEntry);
    
    // AI 분석 요청 (Sampling 사용)
    const analysisResult = await this.requestAIAnalysis(errorEntry);
    
    // 분석 결과를 포함한 응답 생성
    return {
      content: [
        {
          type: 'text',
          text: `## 에러 분석 완료

**에러 ID:** ${errorEntry.id}
**발생 시간:** ${errorEntry.timestamp}
**메시지:** ${error_message}

## AI 분석 결과
${analysisResult}

## 권장 조치
1. 즉시 로그 확인 및 서비스 상태 점검
2. 관련 코드 리뷰 및 수정 계획 수립
3. 팀 공유 및 장애 대응 프로세스 시작

## 다음 단계
- send_notification 도구를 사용하여 팀에게 알림 전송
- 관련 리소스 확인 (workspace://logs, workspace://source)
- 해결 후 피드백 수집 및 학습 데이터 업데이트`
        }
      ]
    };
  }

  /**
   * AI 분석 요청 (MCP Sampling 활용)
   */
  async requestAIAnalysis(errorData) {
    try {
      // 실제 구현에서는 MCP Sampling을 통해 AI 모델 호출
      // 여기서는 시뮬레이션
      const analysisPrompt = `
에러 정보:
- 메시지: ${errorData.message}
- 스택 트레이스: ${errorData.stack}
- 컨텍스트: ${JSON.stringify(errorData.context, null, 2)}

이 에러를 분석하고 해결책을 제안해주세요.
      `;
      
      // AI 분석 시뮬레이션 결과
      return `
**에러 유형:** ${this.classifyError(errorData.message)}
**위험도:** ${this.calculateSeverity(errorData)}
**예상 원인:** ${this.identifyPossibleCause(errorData)}
**해결책:** ${this.generateSolution(errorData)}
      `;
    } catch (error) {
      return `AI 분석 중 오류 발생: ${error.message}`;
    }
  }

  /**
   * 에러 분류
   */
  classifyError(message) {
    if (message.includes('database') || message.includes('connection')) {
      return 'Database Connection Error';
    } else if (message.includes('network') || message.includes('timeout')) {
      return 'Network Error';
    } else if (message.includes('auth') || message.includes('permission')) {
      return 'Authentication Error';
    } else if (message.includes('null') || message.includes('undefined')) {
      return 'Null Reference Error';
    } else {
      return 'Application Error';
    }
  }

  /**
   * 심각도 계산
   */
  calculateSeverity(errorData) {
    let severity = 'Medium';
    
    if (errorData.message.includes('critical') || errorData.message.includes('fatal')) {
      severity = 'Critical';
    } else if (errorData.message.includes('error') || errorData.message.includes('exception')) {
      severity = 'High';
    } else if (errorData.message.includes('warning')) {
      severity = 'Low';
    }
    
    return severity;
  }

  /**
   * 원인 분석
   */
  identifyPossibleCause(errorData) {
    const message = errorData.message.toLowerCase();
    
    if (message.includes('database')) {
      return 'DB 연결 실패 또는 쿼리 오류';
    } else if (message.includes('network')) {
      return '네트워크 연결 문제 또는 API 호출 실패';
    } else if (message.includes('memory')) {
      return '메모리 부족 또는 메모리 누수';
    } else {
      return '코드 로직 오류 또는 예상치 못한 데이터';
    }
  }

  /**
   * 해결책 생성
   */
  generateSolution(errorData) {
    const errorType = this.classifyError(errorData.message);
    
    switch (errorType) {
      case 'Database Connection Error':
        return `
1. DB 서버 상태 확인
2. 연결 문자열 검증
3. 네트워크 연결 확인
4. 연결 풀 설정 검토
5. 재시도 로직 구현 고려`;
      
      case 'Network Error':
        return `
1. 네트워크 상태 확인
2. API 엔드포인트 검증
3. 타임아웃 설정 검토
4. 재시도 메커니즘 구현
5. 서킷 브레이커 패턴 적용`;
      
      case 'Authentication Error':
        return `
1. 인증 토큰 유효성 검사
2. 권한 설정 확인
3. 세션 상태 점검
4. 로그인 플로우 검토
5. 보안 정책 검토`;
      
      default:
        return `
1. 에러 로그 상세 분석
2. 관련 코드 리뷰
3. 테스트 케이스 추가
4. 코드 리팩토링 고려
5. 모니터링 강화`;
    }
  }

  /**
   * 알림 전송
   */
  async sendNotification(args) {
    const { message, priority, channel = 'slack' } = args;
    
    try {
      // 실제 구현에서는 각 채널별 API 호출
      const notificationData = {
        timestamp: new Date().toISOString(),
        message,
        priority,
        channel,
        sent: true
      };
      
      // 알림 전송 시뮬레이션
      await this.simulateNotificationSend(notificationData);
      
      return {
        content: [
          {
            type: 'text',
            text: `## 알림 전송 완료

**채널:** ${channel}
**우선순위:** ${priority}
**메시지:** ${message}
**전송 시간:** ${notificationData.timestamp}

알림이 성공적으로 전송되었습니다.`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `알림 전송 실패: ${error.message}`
          }
        ]
      };
    }
  }

  /**
   * 알림 전송 시뮬레이션
   */
  async simulateNotificationSend(notificationData) {
    // 실제 구현에서는 Slack, Teams, Email API 호출
    console.log('Notification sent:', notificationData);
    
    // 전송 지연 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  }

  /**
   * 로그 파일 읽기
   */
  async readLogFiles() {
    try {
      const logPath = path.join(this.workspaceRoot, 'logs');
      const files = await fs.readdir(logPath);
      
      let logContent = '';
      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(logPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          logContent += `=== ${file} ===\n${content}\n\n`;
        }
      }
      
      return logContent || 'No log files found';
    } catch (error) {
      return `Error reading logs: ${error.message}`;
    }
  }

  /**
   * 설정 파일 읽기
   */
  async readConfigFiles() {
    try {
      const configFiles = ['package.json', 'config.json', '.env'];
      const configs = {};
      
      for (const file of configFiles) {
        try {
          const filePath = path.join(this.workspaceRoot, file);
          const content = await fs.readFile(filePath, 'utf8');
          
          if (file.endsWith('.json')) {
            configs[file] = JSON.parse(content);
          } else {
            configs[file] = content;
          }
        } catch (error) {
          configs[file] = `Error reading ${file}: ${error.message}`;
        }
      }
      
      return JSON.stringify(configs, null, 2);
    } catch (error) {
      return `Error reading config files: ${error.message}`;
    }
  }

  /**
   * 소스 파일 읽기
   */
  async readSourceFiles() {
    try {
      const sourceFiles = await this.findSourceFiles(this.workspaceRoot);
      let sourceContent = '';
      
      for (const file of sourceFiles.slice(0, 5)) { // 최대 5개 파일만
        const content = await fs.readFile(file, 'utf8');
        sourceContent += `=== ${path.relative(this.workspaceRoot, file)} ===\n${content}\n\n`;
      }
      
      return sourceContent || 'No source files found';
    } catch (error) {
      return `Error reading source files: ${error.message}`;
    }
  }

  /**
   * 소스 파일 찾기
   */
  async findSourceFiles(dir, extensions = ['.js', '.ts', '.jsx', '.tsx']) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subFiles = await this.findSourceFiles(fullPath, extensions);
          files.push(...subFiles);
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
    
    return files;
  }

  /**
   * WebSocket 서버 시작
   */
  startWebSocketServer(port = 8080) {
    this.websocketServer = new WebSocket.Server({ port });
    
    this.websocketServer.on('connection', (ws) => {
      console.log('New WebSocket connection established');
      
      ws.on('message', async (data) => {
        try {
          const errorData = JSON.parse(data.toString());
          console.log('Received error data:', errorData);
          
          // MCP를 통한 에러 분석
          const analysis = await this.analyzeError(errorData);
          
          // 분석 결과를 WebSocket으로 전송
          ws.send(JSON.stringify({
            type: 'analysis_result',
            data: analysis
          }));
          
          // 자동으로 알림 전송
          if (errorData.priority === 'critical' || errorData.priority === 'high') {
            await this.sendNotification({
              message: `Critical error detected: ${errorData.error_message}`,
              priority: errorData.priority || 'high',
              channel: 'slack'
            });
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: error.message
          }));
        }
      });
      
      ws.on('close', () => {
        console.log('WebSocket connection closed');
      });
    });
    
    console.log(`WebSocket server started on port ${port}`);
  }

  /**
   * 서버 시작
   */
  async start() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      // WebSocket 서버 시작
      this.startWebSocketServer();
      
      console.log('MCP Error Monitoring Server started successfully');
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// 서버 인스턴스 생성 및 시작
const server = new ErrorMonitoringServer();
server.start().catch(console.error);

export default ErrorMonitoringServer;