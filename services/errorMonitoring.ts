// Сервис мониторинга ошибок (Sentry заглушка)
// Для включения: npm install @sentry/react-native

import { Platform } from 'react-native';

class ErrorMonitoringService {
  private enabled: boolean = false;
  private dsn: string | null = null;

  constructor() {
    this.dsn = process.env.EXPO_PUBLIC_SENTRY_DSN || null;
    this.enabled = !!this.dsn && process.env.EXPO_PUBLIC_SENTRY_ENABLED === 'true';
  }

  /**
   * Инициализация Sentry
   */
  async init() {
    if (!this.enabled || !this.dsn) return;

    try {
      // const Sentry = await import('@sentry/react-native');
      // Sentry.init({ dsn: this.dsn });
      console.log('[ErrorMonitoring] Would initialize Sentry with DSN:', this.dsn);
    } catch (error) {
      console.warn('[ErrorMonitoring] Failed to initialize:', error);
    }
  }

  /**
   * Логирование ошибки
   */
  captureException(error: Error, context?: Record<string, any>) {
    if (!this.enabled) {
      console.error('[ErrorMonitoring]', error, context);
      return;
    }

    // Sentry.captureException(error, { extra: context });
    console.error('[ErrorMonitoring]', error, context);
  }

  /**
   * Логирование сообщения
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (!this.enabled) {
      console.log(`[ErrorMonitoring:${level}]`, message);
      return;
    }

    // Sentry.captureMessage(message, level);
    console.log(`[ErrorMonitoring:${level}]`, message);
  }

  /**
   * Добавление контекста
   */
  setContext(name: string, context: Record<string, any>) {
    if (!this.enabled) return;
    // Sentry.setContext(name, context);
  }

  /**
   * Установка пользователя
   */
  setUser(user: { id?: string; email?: string; username?: string } | null) {
    if (!this.enabled) return;
    // Sentry.setUser(user);
  }

  /**
   * Добавление тега
   */
  setTag(key: string, value: string) {
    if (!this.enabled) return;
    // Sentry.setTag(key, value);
  }

  /**
   * Начало транзакции (для производительности)
   */
  startTransaction(name: string, op?: string) {
    if (!this.enabled) return null;
    // return Sentry.startTransaction({ name, op });
    return null;
  }
}

// Singleton экземпляр
export const errorMonitoring = new ErrorMonitoringService();

// Хелпер для обертки функций с отловом ошибок
export async function withErrorMonitoring<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    errorMonitoring.captureException(err, { context });
    throw err;
  }
}

// React Error Boundary компонент (для классовых компонентов)
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorMonitoring.captureException(error, { componentStack: errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}
