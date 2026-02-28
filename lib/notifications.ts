import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useEffect } from 'react';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions');
      return null;
    }

    // Get push token (for remote notifications)
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push notification token:', token);

    // Android-specific channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('pomodoro', {
        name: 'Pomodoro Timer',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563eb',
      });
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

export async function scheduleLocalNotification(
  title: string, 
  body: string, 
  seconds = 1,
  data?: any
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        seconds,
        channelId: 'pomodoro',
      },
    });
    console.log('Notification scheduled:', title);
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
}

export async function sendImmediateNotification(
  title: string,
  body: string,
  data?: any
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Send immediately
    });
    console.log('Immediate notification sent:', title);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

export function useNotificationObserver(
  onNotification: (notification: Notifications.Notification) => void,
  onResponse: (response: Notifications.NotificationResponse) => void,
) {
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(onNotification);
    const responseListener = Notifications.addNotificationResponseReceivedListener(onResponse);

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [onNotification, onResponse]);
}

// Pomodoro-specific notification helpers
export async function notifyPomodoroComplete() {
  await sendImmediateNotification(
    '🎉 Pomodoro Complete!',
    'Great work! Time for a 5-minute break.',
    { type: 'pomodoro_complete' }
  );
}

export async function notifyBreakComplete() {
  await sendImmediateNotification(
    '💪 Break Over!',
    'Feeling refreshed? Ready to focus again?',
    { type: 'break_complete' }
  );
}

export async function notifyLongBreakComplete() {
  await sendImmediateNotification(
    '✨ Long Break Complete!',
    'Time to get back to crushing your goals!',
    { type: 'long_break_complete' }
  );
}
