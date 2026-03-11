import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Lazy-load expo-notifications only on native
const Notifications: typeof import('expo-notifications') | null =
  Platform.OS !== 'web' ? require('expo-notifications') : null;

// Configure notification behavior (native only)
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
}

interface BreakReminderConfig {
  enabled: boolean;
  intervalMinutes: number;
  workHoursStart: string;
  workHoursEnd: string;
}

class BreakReminderService {
  private notificationIdentifier: string | null = null;
  private config: BreakReminderConfig = {
    enabled: false,
    intervalMinutes: 120,
    workHoursStart: '09:00',
    workHoursEnd: '18:00',
  };

  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    if (!Notifications) return false;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push notification permissions!');
      return false;
    }

    console.log('✅ Push notification permissions granted!');
    return true;
  }

  // Check if current time is within work hours
  private isWithinWorkHours(): boolean {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return currentTime >= this.config.workHoursStart && currentTime <= this.config.workHoursEnd;
  }

  // Schedule break reminder notification
  async scheduleBreakReminder(): Promise<void> {
    if (!Notifications) return;
    // Cancel existing notification if any
    if (this.notificationIdentifier) {
      await Notifications.cancelScheduledNotificationAsync(this.notificationIdentifier);
    }

    if (!this.config.enabled) {
      console.log('Break reminders disabled');
      return;
    }

    // Request permissions first
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn('Cannot schedule notification: no permission');
      return;
    }

    // Check if within work hours
    if (!this.isWithinWorkHours()) {
      console.log('Outside work hours, scheduling for next work hour');
      // Schedule for next work hour start
      const [hours, minutes] = this.config.workHoursStart.split(':').map(Number);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(hours, minutes, 0, 0);

      this.notificationIdentifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Time for a Break! ☕",
          body: "Good morning! Don't forget to take regular breaks during work.",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
          data: { type: 'break-reminder' },
        },
        trigger: tomorrow,
      });

      return;
    }

    // Schedule repeating notification
    const intervalSeconds = this.config.intervalMinutes * 60;

    this.notificationIdentifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time for a Break! ☕",
        body: `You've been working for ${this.config.intervalMinutes} minutes. Take a 5-minute break to stretch and recharge!`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 300, 100, 300, 100, 300, 100, 300], // Strong vibration pattern
        badge: 1,
        data: { 
          type: 'break-reminder',
          timestamp: Date.now(),
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: intervalSeconds,
        repeats: true,
      },
    });

    console.log(`✅ Break reminder scheduled every ${this.config.intervalMinutes} minutes`);
    console.log(`   Notification ID: ${this.notificationIdentifier}`);
  }

  // Update configuration
  async updateConfig(newConfig: Partial<BreakReminderConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Save to AsyncStorage
    await AsyncStorage.setItem('break-reminder-config', JSON.stringify(this.config));
    
    // Reschedule with new config
    await this.scheduleBreakReminder();
  }

  // Load configuration from storage
  async loadConfig(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('break-reminder-config');
      if (stored) {
        this.config = JSON.parse(stored);
        console.log('Loaded break reminder config:', this.config);
      }
    } catch (error) {
      console.error('Failed to load break reminder config:', error);
    }
  }

  // Get current configuration
  getConfig(): BreakReminderConfig {
    return { ...this.config };
  }

  // Start break reminders
  async start(config?: Partial<BreakReminderConfig>): Promise<void> {
    if (config) {
      await this.updateConfig(config);
    } else {
      await this.loadConfig();
      await this.scheduleBreakReminder();
    }
  }

  // Stop break reminders
  async stop(): Promise<void> {
    if (this.notificationIdentifier && Notifications) {
      await Notifications.cancelScheduledNotificationAsync(this.notificationIdentifier);
      this.notificationIdentifier = null;
      console.log('Break reminders stopped');
    }
    
    this.config.enabled = false;
    await AsyncStorage.setItem('break-reminder-config', JSON.stringify(this.config));
  }

  // Cancel all scheduled notifications
  async cancelAll(): Promise<void> {
    if (!Notifications) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All scheduled notifications cancelled');
  }

  // Get all scheduled notifications
  async getScheduledNotifications(): Promise<any[]> {
    if (!Notifications) return [];
    return await Notifications.getAllScheduledNotificationsAsync();
  }
}

// Export singleton instance
export const breakReminderService = new BreakReminderService();

// Map notification type to route
export function getRouteForNotificationType(type: string): string | null {
  switch (type) {
    case 'leave_request':
    case 'leave_approved':
    case 'leave_rejected':
      return '/(tabs)/leaves';
    case 'task':
    case 'task_assigned':
    case 'task_completed':
      return '/(tabs)/tasks';
    case 'attendance':
      return '/(tabs)/attendance';
    case 'message':
      return '/(tabs)/chat';
    case 'rating':
      return '/(tabs)/analytics';
    case 'join_request':
    case 'user_approved':
      return '/(tabs)/admin';
    case 'security_alert':
      return '/(tabs)/settings/security';
    case 'pomodoro_complete':
    case 'break_complete':
    case 'long_break_complete':
      return '/(tabs)/pomodoro';
    case 'break-reminder':
      return null; // stay on current screen
    case 'system':
    default:
      return '/(tabs)/notifications';
  }
}

// Setup notification listeners
export function setupNotificationListeners() {
  if (!Notifications) return;
  // Handle notification received while app is in foreground
  Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
  });

  // Handle notification tap
  Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response);
    const data = response.notification.request.content.data;
    const route = getRouteForNotificationType(data?.type);

    if (route) {
      const { router } = require('expo-router');
      router.push(route);
    }
  });
}
