// Skeleton loader для списков
import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8,
  style 
}: SkeletonProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.skeleton,
        { 
          width, 
          height, 
          borderRadius,
          backgroundColor: isDark ? colors.bgCard + '80' : '#e0e0e0',
        },
        style 
      ]}
    />
  );
}

interface SkeletonListProps {
  count?: number;
  type?: 'conversation' | 'message' | 'profile' | 'task';
}

export function SkeletonList({ count = 5, type = 'conversation' }: SkeletonListProps) {
  const { colors } = useTheme();

  const renderSkeleton = (index: number) => {
    switch (type) {
      case 'conversation':
        return (
          <View key={index} style={[styles.row, { borderBottomColor: colors.border + '40' }]}>
            <Skeleton width={50} height={50} borderRadius={14} />
            <View style={styles.rowContent}>
              <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
              <Skeleton width="80%" height={12} />
            </View>
          </View>
        );
      case 'message':
        return (
          <View key={index} style={styles.messageRow}>
            <Skeleton width={36} height={36} borderRadius={10} />
            <View style={styles.messageContent}>
              <Skeleton width={100} height={12} style={{ marginBottom: 6 }} />
              <Skeleton width="90%" height={14} style={{ marginBottom: 4 }} />
              <Skeleton width="70%" height={14} />
            </View>
          </View>
        );
      case 'profile':
        return (
          <View key={index} style={styles.profileRow}>
            <Skeleton width={46} height={46} borderRadius={14} />
            <View style={styles.profileContent}>
              <Skeleton width="50%" height={16} style={{ marginBottom: 6 }} />
              <Skeleton width="40%" height={12} />
            </View>
          </View>
        );
      case 'task':
        return (
          <View key={index} style={styles.taskRow}>
            <Skeleton width={20} height={20} borderRadius={4} style={{ marginRight: 12 }} />
            <View style={styles.taskContent}>
              <Skeleton width="70%" height={16} style={{ marginBottom: 6 }} />
              <Skeleton width="40%" height={12} />
            </View>
          </View>
        );
      default:
        return <Skeleton key={index} height={50} style={{ marginBottom: 10 }} />;
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => renderSkeleton(i))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    // Базовые стили задаются инлайн
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowContent: {
    flex: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  messageContent: {
    flex: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  profileContent: {
    flex: 1,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  taskContent: {
    flex: 1,
  },
});
