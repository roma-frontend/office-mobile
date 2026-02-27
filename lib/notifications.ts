// Notifications disabled for Expo Go compatibility

export async function registerForPushNotifications(): Promise<string | null> {
  return null;
}

export async function scheduleLocalNotification(title: string, body: string, seconds = 1) {
  console.log('Notification (disabled):', title, body);
}

export function useNotificationObserver(
  onNotification: (n: any) => void,
  onResponse: (r: any) => void,
) {
  return () => {};
}
