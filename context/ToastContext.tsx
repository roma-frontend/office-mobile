import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from './ThemeContext';
import { Radius, Typography } from '@/constants/theme';

// ── Types ──────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// ── Context ────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue>({
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

export const useToast = () => useContext(ToastContext);

// ── Toast Item Component ───────────────────────────────────────────────────
const TOAST_CONFIG: Record<ToastType, { icon: string; haptic: Haptics.NotificationFeedbackType }> = {
  success: { icon: 'checkmark-circle',  haptic: Haptics.NotificationFeedbackType.Success },
  error:   { icon: 'close-circle',      haptic: Haptics.NotificationFeedbackType.Error   },
  warning: { icon: 'warning',           haptic: Haptics.NotificationFeedbackType.Warning  },
  info:    { icon: 'information-circle', haptic: Haptics.NotificationFeedbackType.Success },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  const typeColors: Record<ToastType, string> = {
    success: colors.success,
    error:   colors.error,
    warning: colors.warning,
    info:    colors.primary,
  };
  const color = typeColors[toast.type];
  const cfg = TOAST_CONFIG[toast.type];

  React.useEffect(() => {
    // Haptic feedback
    Haptics.notificationAsync(cfg.haptic).catch(() => {});

    // Animate in
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 60, friction: 8 }),
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => dismiss(), toast.duration ?? 3500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss(toast.id));
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.bgCard,
          borderColor: color + '55',
          borderLeftColor: color,
          opacity,
          transform: [{ translateY }],
          shadowColor: color,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
        <Ionicons name={cfg.icon as any} size={20} color={color} />
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{toast.title}</Text>
        {toast.message ? (
          <Text style={[styles.message, { color: colors.textMuted }]}>{toast.message}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={dismiss} style={styles.closeBtn}>
        <Ionicons name="close" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Provider ───────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const insets = useSafeAreaInsets();

  const add = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-2), { id, type, title, message, duration }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    success: (title, msg) => add('success', title, msg),
    error:   (title, msg) => add('error',   title, msg),
    warning: (title, msg) => add('warning', title, msg),
    info:    (title, msg) => add('info',    title, msg),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container — sits on top of everything */}
      <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  message: {
    ...Typography.caption,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 4,
  },
});
