import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseEnabled } from './firebase';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  event: string;
  message: string;
  data?: Record<string, unknown>;
  userAgent?: string;
  url?: string;
  timestamp?: unknown;
}

/**
 * Firebase에 로그 저장
 * Firebase Console > Firestore > logs 컬렉션에서 확인 가능
 */
export async function log(
  level: LogLevel,
  event: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  // 콘솔에도 출력
  const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  consoleMethod(`[${level.toUpperCase()}] ${event}: ${message}`, data || '');

  // Firebase가 비활성화면 콘솔 로그만
  if (!isFirebaseEnabled() || !db) {
    return;
  }

  try {
    const logEntry: LogEntry = {
      level,
      event,
      message,
      data,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: serverTimestamp(),
    };

    await addDoc(collection(db, 'logs'), logEntry);
  } catch (error) {
    // 로깅 실패는 조용히 처리 (무한 루프 방지)
    console.error('[Logger] Failed to write log:', error);
  }
}

// 편의 함수들
export const logInfo = (event: string, message: string, data?: Record<string, unknown>) =>
  log('info', event, message, data);

export const logWarn = (event: string, message: string, data?: Record<string, unknown>) =>
  log('warn', event, message, data);

export const logError = (event: string, message: string, data?: Record<string, unknown>) =>
  log('error', event, message, data);

// 주요 이벤트 로깅 함수들
export const logUserLogin = (method: 'oauth' | 'pat', userId?: string, handle?: string) =>
  logInfo('USER_LOGIN', `User logged in via ${method}`, { userId, handle, method });

export const logUserLoginFailed = (method: 'oauth' | 'pat', reason: string) =>
  logError('USER_LOGIN_FAILED', `Login failed: ${reason}`, { method, reason });

export const logCloudSyncSuccess = (userId: string, handle?: string) =>
  logInfo('CLOUD_SYNC_SUCCESS', `Cloud sync initialized for ${handle || userId}`, { userId, handle });

export const logCloudSyncFailed = (reason: string, userId?: string) =>
  logError('CLOUD_SYNC_FAILED', `Cloud sync failed: ${reason}`, { userId, reason });

export const logProjectCreated = (projectId: string, projectName: string, userId?: string) =>
  logInfo('PROJECT_CREATED', `Project created: ${projectName}`, { projectId, projectName, userId });

export const logApiError = (endpoint: string, status: number, message: string) =>
  logError('API_ERROR', `API error: ${endpoint} returned ${status}`, { endpoint, status, message });
