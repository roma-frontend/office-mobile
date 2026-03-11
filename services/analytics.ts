// Сервис аналитики (заглушка для будущей интеграции)
// Можно использовать Amplitude, Firebase Analytics, или Mixpanel

interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, any>;
}

class AnalyticsService {
  private enabled: boolean = true;
  private queue: AnalyticsEvent[] = [];

  constructor() {
    // Проверка, включена ли аналитика
    this.enabled = process.env.EXPO_PUBLIC_ANALYTICS_ENABLED !== 'false';
  }

  /**
   * Логирование события
   */
  track(eventName: string, properties?: Record<string, any>) {
    if (!this.enabled) return;

    const event: AnalyticsEvent = { eventName, properties };
    
    // Если сервис еще не инициализирован, добавляем в очередь
    if (!this.isInitialized()) {
      this.queue.push(event);
      return;
    }

    // Логирование в консоль для отладки
    if (__DEV__) {
      console.log('[Analytics]', eventName, properties);
    }

    // Здесь будет интеграция с Amplitude/Firebase
    // Amplitude.track(eventName, properties);
  }

  /**
   * Логирование экрана
   */
  trackScreen(screenName: string, params?: Record<string, any>) {
    this.track('screen_view', {
      screen_name: screenName,
      ...params,
    });
  }

  /**
   * Логирование ошибки
   */
  trackError(error: Error, context?: string) {
    this.track('error', {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack,
      context,
    });
  }

  /**
   * Логирование действия пользователя
   */
  trackUserAction(action: string, target?: string) {
    this.track('user_action', { action, target });
  }

  /**
   * Проверка инициализации
   */
  private isInitialized(): boolean {
    // Здесь будет проверка инициализации SDK
    return true;
  }

  /**
   * Обработка очереди событий
   */
  flushQueue() {
    this.queue.forEach(event => {
      this.track(event.eventName, event.properties);
    });
    this.queue = [];
  }

  /**
   * Включение/выключение аналитики
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

// Singleton экземпляр
export const analytics = new AnalyticsService();

// Хелперы для часто используемых событий
export const trackMessageSent = (conversationId: string, messageLength: number) => {
  analytics.track('message_sent', { conversationId, messageLength });
};

export const trackCallStarted = (callType: 'audio' | 'video', duration?: number) => {
  analytics.track('call_started', { callType, duration });
};

export const trackLeaveRequested = (leaveType: string, days: number) => {
  analytics.track('leave_requested', { leaveType, days });
};

export const trackTaskCreated = (priority: string, status: string) => {
  analytics.track('task_created', { priority, status });
};

export const trackFileUploaded = (fileType: string, fileSize: number) => {
  analytics.track('file_uploaded', { fileType, fileSize });
};
