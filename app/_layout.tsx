import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConvexProvider, ConvexReactClient, useQuery } from 'convex/react';
import { CONVEX_URL } from '@/constants/config';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { ToastProvider, useToast } from '@/context/ToastContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { api } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';

const convex = new ConvexReactClient(CONVEX_URL);

// ── Notification watcher — shows toasts for new notifications in real-time ──
function NotificationWatcher() {
  const toast = useToast();
  const { user } = useAuth();
  const prevNotifIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const notifications = useQuery(
    api.notifications.getUserNotifications,
    user?.userId ? { userId: user.userId as Id<'users'> } : 'skip'
  );

  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    if (isFirstLoad.current) {
      notifications.forEach((n: any) => prevNotifIds.current.add(n._id));
      isFirstLoad.current = false;
      return;
    }

    const newNotifs = notifications.filter(
      (n: any) => !n.isRead && !prevNotifIds.current.has(n._id)
    );

    if (newNotifs.length > 0) {
      newNotifs.forEach((n: any) => {
        const type = n.type === 'leave_approved'
          ? 'success'
          : n.type === 'leave_rejected'
          ? 'error'
          : 'info';
        toast[type](n.title, n.message);
      });
      newNotifs.forEach((n: any) => prevNotifIds.current.add(n._id));
    }

    notifications.forEach((n: any) => prevNotifIds.current.add(n._id));
  }, [notifications]);

  return null;
}

function AppStack() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NotificationWatcher />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ConvexProvider client={convex}>
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>
                <AppStack />
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </ConvexProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
