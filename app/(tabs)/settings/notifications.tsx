import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { router } from 'expo-router';
import { useSettings } from '@/hooks/useSettings';

export default function NotificationsSettings() {
  const { colors } = useTheme();
  const { settings, isLoading, updateSetting } = useSettings();

  const notifications = [
    {
      id: 'emailNotifs',
      icon: '📧',
      label: 'Email Notifications',
      description: 'Receive leave updates and system alerts via email',
      value: settings.emailNotifs ?? true,
      onChange: (v: boolean) => updateSetting('emailNotifs', v),
    },
    {
      id: 'pushNotifs',
      icon: '🔔',
      label: 'Push Notifications',
      description: 'Get real-time notifications on your device',
      value: settings.pushNotifs ?? true,
      onChange: (v: boolean) => updateSetting('pushNotifs', v),
    },
    {
      id: 'weeklyReport',
      icon: '📊',
      label: 'Weekly Report',
      description: 'Receive a weekly summary every Monday',
      value: settings.weeklyReport ?? true,
      onChange: (v: boolean) => updateSetting('weeklyReport', v),
    },
    {
      id: 'leaveApprovals',
      icon: '✅',
      label: 'Leave Approvals',
      description: 'Notify when leave requests are approved/rejected',
      value: settings.leaveApprovals ?? true,
      onChange: (v: boolean) => updateSetting('leaveApprovals', v),
    },
    {
      id: 'taskUpdates',
      icon: '📋',
      label: 'Task Updates',
      description: 'Get notified about task assignments and updates',
      value: settings.taskUpdates ?? true,
      onChange: (v: boolean) => updateSetting('taskUpdates', v),
    },
    {
      id: 'teamActivity',
      icon: '👥',
      label: 'Team Activity',
      description: 'Updates when team members take actions',
      value: settings.teamActivity ?? false,
      onChange: (v: boolean) => updateSetting('teamActivity', v),
    },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Configure how you receive alerts and updates
        </Text>

        {/* Notification Settings */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {notifications.map((item, index) => (
            <View key={item.id}>
              <View style={styles.notificationRow}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationIcon}>{item.icon}</Text>
                  <View style={styles.notificationText}>
                    <Text style={[styles.notificationLabel, { color: colors.textPrimary }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.notificationDescription, { color: colors.textMuted }]}>
                      {item.description}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={item.value}
                  onValueChange={item.onChange}
                  trackColor={{ false: '#767577', true: colors.primary + '80' }}
                  thumbColor={item.value ? colors.primary : '#f4f3f4'}
                />
              </View>
              {index < notifications.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' }]}>
          <Ionicons name="information-circle" size={20} color={colors.warning} />
          <Text style={[styles.infoText, { color: colors.warning }]}>
            You can manage notification sounds and vibration settings in your device's system settings.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  notificationInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginLeft: 56,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
