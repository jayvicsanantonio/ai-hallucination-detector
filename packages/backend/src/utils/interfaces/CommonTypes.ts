// Common utility types and interfaces

export interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(
    message: string,
    error?: Error,
    meta?: Record<string, any>
  ): void;
  debug(message: string, meta?: Record<string, any>): void;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

export interface ConfigService {
  get<T>(key: string): T;
  getRequired<T>(key: string): T;
  has(key: string): boolean;
}

export interface DatabaseConnection {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T>(sql: string, params?: any[]): Promise<T | null>;
  transaction<T>(
    callback: (trx: DatabaseTransaction) => Promise<T>
  ): Promise<T>;
  close(): Promise<void>;
}

export interface DatabaseTransaction {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T>(sql: string, params?: any[]): Promise<T | null>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface EventEmitter {
  emit(event: string, data?: any): void;
  on(event: string, listener: (data?: any) => void): void;
  off(event: string, listener: (data?: any) => void): void;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  lastChecked: Date;
  responseTime?: number;
}

export interface SystemMetrics {
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  activeConnections: number;
  requestsPerMinute: number;
  errorRate: number;
}
