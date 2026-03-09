import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator,
  RefreshControl, Alert, Platform, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

const NOTIF_ICONS: Record<string, { name: string; color: string }> = {
  leave_request:  { name: 'document-text-outline', color: '#3b82f6' },
  leave_approved: { name: 'checkmark-circle-outline', color: '#10b981' },
  leave_rejected: { name: 'close-circle-outline', color: '#ef4444' },
  task:           { name: 'checkbox-outline', color: '#06b6d4' },
  task_assigned:  { name: 'clipboard-outline', color: '#06b6d4' },
  task_completed: { name: 'checkmark-done-outline', color: '#10b981' },
  security_alert: { name: 'shield-outline', color: '#f59e0b' },
  system:         { name: 'information-circle-outline', color: '#8b5cf6' },
  rating:         { name: 'star-outline', color: '#f59e0b' },
  join_request:   { name: 'person-add-outline', color: '#3b82f6' },
  user_approved:  { name: 'person-outline', color: '#10b981' },
  attendance:     { name: 'time-outline', color: '#06b6d4' },
  message:        { name: 'chatbubble-outline', color: '#8b5cf6' },
};

function getNotifIcon(type?: string) {
  return NOTIF_ICONS[type ?? ''] ?? { name: 'notifications-outline', color: '#3b82f6' };
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom;

  const userId = user?.userId ?? null;
  const [refreshing, setRefreshing] = useState(false);

  const notifications = useQuery(
    api.notifications.getUserNotifications,
    userId ? { userId: userId as Id<'users'> } : 'skip'
  );
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    userId ? { userId: userId as Id<'users'> } : 'skip'
  );
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const deleteNotification = useMutation(api.notifications.deleteNotification);

  const isLoading = notifications === undefined;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    if (!userId) return;
    try {
      await markAllAsRead({ userId: userId as Id<'users'> });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to mark all as read');
    }
  }, [userId, markAllAsRead]);

  const handleTap = useCallback(async (notif: any) => {
    try {
      if (!notif.isRead) {
        await markAsRead({ notificationId: notif._id });
      }
    } catch {}
  }, [markAsRead]);

  const handleDelete = useCallback(async (notifId: Id<'notifications'>) => {
    try {
      await deleteNotification({ notificationId: notifId });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to delete');
    }
  }, [deleteNotification]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    const icon = getNotifIcon(item.type);
    const isUnread = !item.isRead;

    return (
      <TouchableOpacity
        style={[
          styles.notifItem,
          {
            backgroundColor: isUnread ? colors.primary + '08' : colors.bgCard,
            borderColor: isUnread ? colors.primary + '22' : colors.border,
          },
        ]}
        onPress={() => handleTap(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.notifIconWrap, { backgroundColor: icon.color + '18' }]}>
          <Ionicons name={icon.name as any} size={22} color={icon.color} />
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text
              style={[
                styles.notifTitle,
                { color: colors.textPrimary },
                isUnread && { fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {item.title ?? 'Notification'}
            </Text>
            {isUnread && (
              <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
            )}
          </View>
          <Text
            style={[styles.notifMessage, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.message ?? ''}
          </Text>
          <Text style={[styles.notifTime, { color: colors.textMuted }]}>
            {timeAgo(item._creationTime ?? item.createdAt ?? Date.now())}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item._id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [colors, handleTap, handleDelete]);

  const EmptyState = () => (
    <View style={styles.emptyWrap}>
      <LinearGradient
        colors={[colors.primary + '18', colors.primary + '08']}
        style={styles.emptyIcon}
      >
        <Ionicons name="notifications-off-outline" size={48} color={colors.primary} />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        All caught up!
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
        You have no notifications right now.{'\n'}We'll let you know when something happens.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Notifications
          </Text>
          {(unreadCount ?? 0) > 0 && (
            <View style={[styles.headerBadge, { backgroundColor: colors.primary + '22' }]}>
              <Text style={[styles.headerBadgeText, { color: colors.primary }]}>
                {unreadCount}
              </Text>
            </View>
          )}
        </View>
        {(unreadCount ?? 0) > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Ionicons name="checkmark-done-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={notifications ?? []}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomOffset + 16 },
            (notifications?.length ?? 0) === 0 && { flex: 1 },
          ]}
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '700' },
  markAllBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  listContent: {
    padding: 16,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 12,
  },
  notifIconWrap: {
    width: 44, height: 44,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  notifContent: { flex: 1 },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  notifTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notifMessage: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11 },
  deleteBtn: { padding: 4, marginTop: 2 },

  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingVertical: 60,
  },
  emptyIcon: {
    width: 100, height: 100, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
