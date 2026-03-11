// Banner офлайн режима
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

interface OfflineBannerProps {
  isOnline: boolean;
}

export function OfflineBanner({ isOnline }: OfflineBannerProps) {
  const { colors } = useTheme();

  if (isOnline) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.warning + '22', borderColor: colors.warning + '44' }]}>
      <Ionicons name="wifi-off" size={16} color={colors.warning} />
      <Text style={[styles.text, { color: colors.warning }]}>
        No connection. Some features may not work.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
