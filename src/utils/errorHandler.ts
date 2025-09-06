import React from 'react';

export const ErrorType = {
  NETWORK: 'NETWORK',
  AUTHENTICATION: 'AUTHENTICATION',
  VALIDATION: 'VALIDATION',
  PERMISSION: 'PERMISSION',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly code: string;
  public readonly context?: ErrorContext;
  public readonly originalError?: Error;
  public readonly timestamp: Date;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    code: string = 'UNKNOWN_ERROR',
    context?: ErrorContext,
    originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.context = context;
    this.originalError = originalError;
    this.timestamp = new Date();
  }
}

export class NetworkError extends AppError {
  constructor(message: string, context?: ErrorContext, originalError?: Error) {
    super(message, ErrorType.NETWORK, 'NETWORK_ERROR', context, originalError);
    this.name = 'NetworkError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, context?: ErrorContext, originalError?: Error) {
    super(message, ErrorType.AUTHENTICATION, 'AUTH_ERROR', context, originalError);
    this.name = 'AuthError';
  }
}

export class ValidationAppError extends AppError {
  public readonly errors: Array<{ field: string; message: string; code: string }>;

  constructor(
    message: string,
    errors: Array<{ field: string; message: string; code: string }>,
    context?: ErrorContext,
    originalError?: Error
  ) {
    super(message, ErrorType.VALIDATION, 'VALIDATION_ERROR', context, originalError);
    this.name = 'ValidationAppError';
    this.errors = errors;
  }
}

export class PermissionError extends AppError {
  constructor(message: string, context?: ErrorContext, originalError?: Error) {
    super(message, ErrorType.PERMISSION, 'PERMISSION_DENIED', context, originalError);
    this.name = 'PermissionError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, context?: ErrorContext, originalError?: Error) {
    super(message, ErrorType.NOT_FOUND, 'NOT_FOUND', context, originalError);
    this.name = 'NotFoundError';
  }
}

export class ServerError extends AppError {
  constructor(message: string, context?: ErrorContext, originalError?: Error) {
    super(message, ErrorType.SERVER, 'SERVER_ERROR', context, originalError);
    this.name = 'ServerError';
  }
}

export interface ErrorHandler {
  handle(error: Error | AppError, context?: ErrorContext): void;
  logError(error: Error | AppError, level: LogLevel, context?: ErrorContext): void;
  showUserError(message: string, type: ErrorType, context?: ErrorContext): void;
  createErrorBoundary(): React.ComponentType<{ children: React.ReactNode }>;
}

class ConsoleErrorHandler implements ErrorHandler {
  handle(error: Error | AppError, context?: ErrorContext): void {
    this.logError(error, LogLevel.ERROR, context);
    this.showUserError(error.message, error instanceof AppError ? error.type : ErrorType.UNKNOWN, context);
  }

  logError(error: Error | AppError, level: LogLevel, context?: ErrorContext): void {
    const logData = {
      message: error.message,
      type: error instanceof AppError ? error.type : ErrorType.UNKNOWN,
      code: error instanceof AppError ? error.code : 'UNKNOWN_ERROR',
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack,
      originalError: error instanceof AppError ? error.originalError : undefined,
    };

    switch (level) {
      case LogLevel.DEBUG:
        console.debug('[DEBUG]', logData);
        break;
      case LogLevel.INFO:
        console.info('[INFO]', logData);
        break;
      case LogLevel.WARN:
        console.warn('[WARN]', logData);
        break;
      case LogLevel.ERROR:
        console.error('[ERROR]', logData);
        break;
    }

    // 실제 프로덕션에서는 외부 로깅 서비스로 전송
    if (import.meta.env.PROD) {
      this.sendToExternalLogger(logData, level);
    }
  }

  showUserError(message: string, type: ErrorType, context?: ErrorContext): void {
    // 사용자 친화적 에러 메시지로 변환
    const userMessage = this.getUserFriendlyMessage(message, type);

    // 실제 구현에서는 토스트나 알림 컴포넌트를 사용
    console.warn(`[USER ERROR] ${type}: ${userMessage}`, context);

    // 개발 환경에서는 alert으로 표시 (실제로는 Toast 컴포넌트 사용)
    if (import.meta.env.DEV) {
      alert(`오류 발생: ${userMessage}`);
    }
  }

  createErrorBoundary(): React.ComponentType<{ children: React.ReactNode }> {
    // 기본 에러 바운더리 컴포넌트 (아래에서 구현)
    return ErrorBoundary;
  }

  private getUserFriendlyMessage(_message: string, type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK:
        return '네트워크 연결을 확인하고 다시 시도해주세요.';
      case ErrorType.AUTHENTICATION:
        return '인증 정보가 유효하지 않습니다. 다시 로그인해주세요.';
      case ErrorType.VALIDATION:
        return '입력한 정보를 확인해주세요.';
      case ErrorType.PERMISSION:
        return '이 작업을 수행할 권한이 없습니다.';
      case ErrorType.NOT_FOUND:
        return '요청한 정보를 찾을 수 없습니다.';
      case ErrorType.SERVER:
        return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      default:
        return '알 수 없는 오류가 발생했습니다.';
    }
  }

  private sendToExternalLogger(logData: Record<string, unknown>, level: LogLevel): void {
    // 프로덕션 환경에서 외부 로깅 서비스로 전송
    // 예: Sentry, LogRocket, Google Analytics 등

    // 임시로 localStorage에 저장 (실제로는 API로 전송)
    const logs = JSON.parse(localStorage.getItem('error-logs') || '[]');
    logs.push({ ...logData, level });
    localStorage.setItem('error-logs', JSON.stringify(logs.slice(-100))); // 최근 100개만 유지
  }
}

// 기본적인 에러 바운더리 컴포넌트 (별도 파일로 분리 필요)
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, {
  hasError: boolean;
  error?: Error;
}> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 에러 로깅
    errorHandler.logError(error, LogLevel.ERROR, {
      component: 'ErrorBoundary',
      metadata: { errorInfo },
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return React.createElement(FallbackComponent, {
          error: this.state.error!,
          resetError: this.resetError
        });
      }

      // 기본 폴백 UI
      return React.createElement('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '20px',
          textAlign: 'center'
        }
      }, '오류가 발생했습니다. 페이지를 새로고침해주세요.');
    }

    return this.props.children;
  }
}

// 싱글톤 인스턴스
export const errorHandler: ErrorHandler = new ConsoleErrorHandler();

// 헬퍼 함수들
export const createAppError = (
  message: string,
  type: ErrorType = ErrorType.UNKNOWN,
  code: string = 'UNKNOWN_ERROR',
  context?: ErrorContext,
  originalError?: Error
): AppError => {
  return new AppError(message, type, code, context, originalError);
};

export const handleAsyncError = async <T>(
  asyncFn: () => Promise<T>,
  context?: ErrorContext
): Promise<T | null> => {
  try {
    return await asyncFn();
  } catch (error) {
    errorHandler.handle(error as Error, context);
    return null;
  }
};

export const withErrorHandling = <T extends unknown[], R>(
  fn: (...args: T) => R,
  context?: ErrorContext
) => {
  return (...args: T): R | null => {
    try {
      return fn(...args);
    } catch (error) {
      errorHandler.handle(error as Error, context);
      return null;
    }
  };
};
