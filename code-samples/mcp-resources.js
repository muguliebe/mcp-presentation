// MCP Resources 구현 예제
// 워크스페이스 파일 및 리소스 관리

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  ListResourcesRequestSchema, 
  ReadResourceRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

/**
 * MCP Resources Provider
 * 워크스페이스 파일과 리소스에 대한 접근을 제공
 */
class MCPResourcesProvider {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.resourceCache = new Map();
    this.watchedFiles = new Set();
  }

  /**
   * 리소스 목록 제공
   */
  async listResources() {
    const resources = [];

    try {
      // 1. 로그 파일 리소스
      const logFiles = await this.findLogFiles();
      logFiles.forEach(file => {
        resources.push({
          uri: `workspace://logs/${path.basename(file)}`,
          name: `Log: ${path.basename(file)}`,
          description: `Application log file: ${file}`,
          mimeType: 'text/plain'
        });
      });

      // 2. 설정 파일 리소스
      const configFiles = await this.findConfigFiles();
      configFiles.forEach(file => {
        resources.push({
          uri: `workspace://config/${path.basename(file)}`,
          name: `Config: ${path.basename(file)}`,
          description: `Configuration file: ${file}`,
          mimeType: this.getMimeType(file)
        });
      });

      // 3. 소스 코드 리소스
      const sourceFiles = await this.findSourceFiles();
      sourceFiles.slice(0, 20).forEach(file => { // 최대 20개로 제한
        const relativePath = path.relative(this.workspaceRoot, file);
        resources.push({
          uri: `workspace://source/${relativePath}`,
          name: `Source: ${relativePath}`,
          description: `Source code file: ${file}`,
          mimeType: this.getMimeType(file)
        });
      });

      // 4. 패키지 정보 리소스
      resources.push({
        uri: 'workspace://package',
        name: 'Package Information',
        description: 'Package.json and dependency information',
        mimeType: 'application/json'
      });

      // 5. 에러 히스토리 리소스
      resources.push({
        uri: 'workspace://errors',
        name: 'Error History',
        description: 'Recent error history and patterns',
        mimeType: 'application/json'
      });

      // 6. 시스템 정보 리소스
      resources.push({
        uri: 'workspace://system',
        name: 'System Information',
        description: 'Runtime system information',
        mimeType: 'application/json'
      });

      // 7. 환경 변수 리소스
      resources.push({
        uri: 'workspace://env',
        name: 'Environment Variables',
        description: 'Environment configuration (sanitized)',
        mimeType: 'application/json'
      });

      // 8. 데이터베이스 스키마 리소스
      resources.push({
        uri: 'workspace://database',
        name: 'Database Schema',
        description: 'Database schema and migration information',
        mimeType: 'application/json'
      });

      return { resources };
    } catch (error) {
      console.error('Error listing resources:', error);
      return { resources: [] };
    }
  }

  /**
   * 리소스 읽기
   */
  async readResource(uri) {
    try {
      const [scheme, resourcePath] = uri.split('://');
      
      if (scheme !== 'workspace') {
        throw new Error(`Unsupported URI scheme: ${scheme}`);
      }

      const [resourceType, ...pathParts] = resourcePath.split('/');
      const resourceId = pathParts.join('/');

      let content = '';
      let mimeType = 'text/plain';

      switch (resourceType) {
        case 'logs':
          ({ content, mimeType } = await this.readLogResource(resourceId));
          break;
        case 'config':
          ({ content, mimeType } = await this.readConfigResource(resourceId));
          break;
        case 'source':
          ({ content, mimeType } = await this.readSourceResource(resourceId));
          break;
        case 'package':
          ({ content, mimeType } = await this.readPackageResource());
          break;
        case 'errors':
          ({ content, mimeType } = await this.readErrorsResource());
          break;
        case 'system':
          ({ content, mimeType } = await this.readSystemResource());
          break;
        case 'env':
          ({ content, mimeType } = await this.readEnvResource());
          break;
        case 'database':
          ({ content, mimeType } = await this.readDatabaseResource());
          break;
        default:
          throw new Error(`Unknown resource type: ${resourceType}`);
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
  }

  /**
   * 로그 파일 찾기
   */
  async findLogFiles() {
    const patterns = [
      'logs/*.log',
      'logs/*.txt',
      '*.log',
      'log/**/*.log'
    ];

    const files = [];
    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, { cwd: this.workspaceRoot });
        files.push(...matches.map(f => path.join(this.workspaceRoot, f)));
      } catch (error) {
        console.warn(`Error finding files with pattern ${pattern}:`, error);
      }
    }

    return [...new Set(files)]; // 중복 제거
  }

  /**
   * 설정 파일 찾기
   */
  async findConfigFiles() {
    const patterns = [
      'package.json',
      'tsconfig.json',
      'webpack.config.js',
      'babel.config.js',
      '.env',
      '.env.local',
      'config/*.json',
      'config/*.js',
      'config/*.yaml',
      'config/*.yml'
    ];

    const files = [];
    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, { cwd: this.workspaceRoot });
        files.push(...matches.map(f => path.join(this.workspaceRoot, f)));
      } catch (error) {
        console.warn(`Error finding config files with pattern ${pattern}:`, error);
      }
    }

    return [...new Set(files)];
  }

  /**
   * 소스 파일 찾기
   */
  async findSourceFiles() {
    const patterns = [
      'src/**/*.js',
      'src/**/*.ts',
      'src/**/*.jsx',
      'src/**/*.tsx',
      'lib/**/*.js',
      'lib/**/*.ts',
      'index.js',
      'index.ts',
      'server.js',
      'app.js'
    ];

    const files = [];
    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, { cwd: this.workspaceRoot });
        files.push(...matches.map(f => path.join(this.workspaceRoot, f)));
      } catch (error) {
        console.warn(`Error finding source files with pattern ${pattern}:`, error);
      }
    }

    return [...new Set(files)];
  }

  /**
   * 로그 리소스 읽기
   */
  async readLogResource(resourceId) {
    const logPath = path.join(this.workspaceRoot, 'logs', resourceId);
    
    try {
      const content = await fs.readFile(logPath, 'utf8');
      return {
        content: this.sanitizeLogContent(content),
        mimeType: 'text/plain'
      };
    } catch (error) {
      return {
        content: `Error reading log file: ${error.message}`,
        mimeType: 'text/plain'
      };
    }
  }

  /**
   * 설정 리소스 읽기
   */
  async readConfigResource(resourceId) {
    const configPath = path.join(this.workspaceRoot, resourceId);
    
    try {
      const content = await fs.readFile(configPath, 'utf8');
      return {
        content: this.sanitizeConfigContent(content, resourceId),
        mimeType: this.getMimeType(configPath)
      };
    } catch (error) {
      return {
        content: `Error reading config file: ${error.message}`,
        mimeType: 'text/plain'
      };
    }
  }

  /**
   * 소스 리소스 읽기
   */
  async readSourceResource(resourceId) {
    const sourcePath = path.join(this.workspaceRoot, resourceId);
    
    try {
      const content = await fs.readFile(sourcePath, 'utf8');
      return {
        content,
        mimeType: this.getMimeType(sourcePath)
      };
    } catch (error) {
      return {
        content: `Error reading source file: ${error.message}`,
        mimeType: 'text/plain'
      };
    }
  }

  /**
   * 패키지 정보 읽기
   */
  async readPackageResource() {
    try {
      const packagePath = path.join(this.workspaceRoot, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageData = JSON.parse(packageContent);

      // 패키지 정보 정리
      const packageInfo = {
        name: packageData.name,
        version: packageData.version,
        description: packageData.description,
        main: packageData.main,
        scripts: packageData.scripts,
        dependencies: packageData.dependencies,
        devDependencies: packageData.devDependencies,
        engines: packageData.engines
      };

      return {
        content: JSON.stringify(packageInfo, null, 2),
        mimeType: 'application/json'
      };
    } catch (error) {
      return {
        content: JSON.stringify({ error: error.message }),
        mimeType: 'application/json'
      };
    }
  }

  /**
   * 에러 히스토리 읽기
   */
  async readErrorsResource() {
    try {
      // 실제 구현에서는 에러 데이터베이스나 로그에서 읽어옴
      const errorHistory = {
        recentErrors: [
          {
            timestamp: '2024-01-15T10:30:00Z',
            type: 'database_error',
            message: 'Connection timeout',
            count: 5,
            resolved: false
          },
          {
            timestamp: '2024-01-15T09:45:00Z',
            type: 'validation_error',
            message: 'Invalid user input',
            count: 12,
            resolved: true
          }
        ],
        errorPatterns: [
          {
            pattern: 'database.*timeout',
            frequency: 15,
            trend: 'increasing'
          },
          {
            pattern: 'network.*error',
            frequency: 8,
            trend: 'stable'
          }
        ],
        statistics: {
          totalErrors: 127,
          resolvedErrors: 98,
          criticalErrors: 3,
          averageResolutionTime: '2.5 hours'
        }
      };

      return {
        content: JSON.stringify(errorHistory, null, 2),
        mimeType: 'application/json'
      };
    } catch (error) {
      return {
        content: JSON.stringify({ error: error.message }),
        mimeType: 'application/json'
      };
    }
  }

  /**
   * 시스템 정보 읽기
   */
  async readSystemResource() {
    try {
      const systemInfo = {
        nodejs: {
          version: process.version,
          platform: process.platform,
          arch: process.arch,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: Intl.DateTimeFormat().resolvedOptions().locale
        },
        runtime: {
          startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
          currentTime: new Date().toISOString(),
          pid: process.pid,
          ppid: process.ppid
        }
      };

      return {
        content: JSON.stringify(systemInfo, null, 2),
        mimeType: 'application/json'
      };
    } catch (error) {
      return {
        content: JSON.stringify({ error: error.message }),
        mimeType: 'application/json'
      };
    }
  }

  /**
   * 환경 변수 읽기 (보안 처리)
   */
  async readEnvResource() {
    try {
      const sensitiveKeys = [
        'password', 'secret', 'key', 'token', 'api_key', 
        'database_url', 'db_password', 'auth_token'
      ];

      const sanitizedEnv = {};
      
      Object.entries(process.env).forEach(([key, value]) => {
        const isSensitive = sensitiveKeys.some(sensitive => 
          key.toLowerCase().includes(sensitive)
        );
        
        if (isSensitive) {
          sanitizedEnv[key] = '***REDACTED***';
        } else {
          sanitizedEnv[key] = value;
        }
      });

      return {
        content: JSON.stringify(sanitizedEnv, null, 2),
        mimeType: 'application/json'
      };
    } catch (error) {
      return {
        content: JSON.stringify({ error: error.message }),
        mimeType: 'application/json'
      };
    }
  }

  /**
   * 데이터베이스 스키마 읽기
   */
  async readDatabaseResource() {
    try {
      // 실제 구현에서는 데이터베이스 연결하여 스키마 정보 조회
      const databaseInfo = {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'INTEGER', primary: true },
              { name: 'email', type: 'VARCHAR(255)', unique: true },
              { name: 'created_at', type: 'TIMESTAMP' }
            ]
          },
          {
            name: 'errors',
            columns: [
              { name: 'id', type: 'INTEGER', primary: true },
              { name: 'message', type: 'TEXT' },
              { name: 'stack_trace', type: 'TEXT' },
              { name: 'created_at', type: 'TIMESTAMP' }
            ]
          }
        ],
        indexes: [
          { table: 'users', columns: ['email'] },
          { table: 'errors', columns: ['created_at'] }
        ],
        constraints: [
          { table: 'users', type: 'UNIQUE', columns: ['email'] }
        ]
      };

      return {
        content: JSON.stringify(databaseInfo, null, 2),
        mimeType: 'application/json'
      };
    } catch (error) {
      return {
        content: JSON.stringify({ error: error.message }),
        mimeType: 'application/json'
      };
    }
  }

  /**
   * MIME 타입 결정
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.jsx': 'application/javascript',
      '.tsx': 'application/typescript',
      '.json': 'application/json',
      '.yaml': 'application/yaml',
      '.yml': 'application/yaml',
      '.xml': 'application/xml',
      '.html': 'text/html',
      '.css': 'text/css',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.log': 'text/plain'
    };

    return mimeTypes[ext] || 'text/plain';
  }

  /**
   * 로그 내용 정리 (민감한 정보 제거)
   */
  sanitizeLogContent(content) {
    // 민감한 정보 패턴 정의
    const sensitivePatterns = [
      /password[=:]\s*[^\s]+/gi,
      /token[=:]\s*[^\s]+/gi,
      /api[_-]?key[=:]\s*[^\s]+/gi,
      /secret[=:]\s*[^\s]+/gi,
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // 신용카드 번호
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // 이메일 (선택적)
    ];

    let sanitizedContent = content;
    
    sensitivePatterns.forEach(pattern => {
      sanitizedContent = sanitizedContent.replace(pattern, '***REDACTED***');
    });

    return sanitizedContent;
  }

  /**
   * 설정 내용 정리
   */
  sanitizeConfigContent(content, filename) {
    if (filename === '.env' || filename.includes('.env')) {
      return this.sanitizeEnvContent(content);
    }

    if (filename.endsWith('.json')) {
      try {
        const config = JSON.parse(content);
        const sanitized = this.sanitizeJsonConfig(config);
        return JSON.stringify(sanitized, null, 2);
      } catch (error) {
        return content; // JSON 파싱 실패시 원본 반환
      }
    }

    return content;
  }

  /**
   * .env 파일 내용 정리
   */
  sanitizeEnvContent(content) {
    const lines = content.split('\n');
    const sanitizedLines = lines.map(line => {
      if (line.includes('=') && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        const sensitiveKeys = ['password', 'secret', 'key', 'token', 'api_key'];
        
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          return `${key}=***REDACTED***`;
        }
      }
      return line;
    });

    return sanitizedLines.join('\n');
  }

  /**
   * JSON 설정 정리
   */
  sanitizeJsonConfig(config) {
    const sanitized = JSON.parse(JSON.stringify(config));
    
    const sanitizeObject = (obj) => {
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        } else if (typeof obj[key] === 'string') {
          const sensitiveKeys = ['password', 'secret', 'key', 'token', 'api_key'];
          if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
            obj[key] = '***REDACTED***';
          }
        }
      });
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * 파일 변경 감지 설정
   */
  watchFiles(callback) {
    const chokidar = require('chokidar');
    
    const watcher = chokidar.watch([
      path.join(this.workspaceRoot, 'logs/**/*.log'),
      path.join(this.workspaceRoot, 'config/**/*'),
      path.join(this.workspaceRoot, 'src/**/*')
    ], {
      ignored: /node_modules/,
      persistent: true
    });

    watcher.on('change', (filePath) => {
      console.log(`File changed: ${filePath}`);
      this.resourceCache.clear(); // 캐시 초기화
      callback && callback('change', filePath);
    });

    watcher.on('add', (filePath) => {
      console.log(`File added: ${filePath}`);
      this.resourceCache.clear();
      callback && callback('add', filePath);
    });

    watcher.on('unlink', (filePath) => {
      console.log(`File removed: ${filePath}`);
      this.resourceCache.clear();
      callback && callback('unlink', filePath);
    });

    return watcher;
  }
}

export default MCPResourcesProvider;