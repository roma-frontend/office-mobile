import React from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { router } from 'expo-router';
import { useBreakReminder } from '@/hooks/useBreakReminder';
import { TouchableOpacity } from 'react-native';

export default function ProductivitySettings() {
  const { colors } = useTheme();
  const { config, isLoading, start, stop, updateConfig } = useBreakReminder();

  const handleToggleBreakReminders = async (value: boolean) => {
    if (value) {
      await start();
    } else {
      await stop();
    }
  };

  const intervals = [
    { label: '⚡ 1 minute (testing)', value: 1 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '90 minutes', value: 90 },
    { label: '2 hours (recommended)', value: 120 },
    { label: '3 hours', value: 180 },
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
        <Text style={[styles.title, { color: colors.textPrimary }]}>Productivity</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Configure break reminders and productivity features
        </Text>

        {/* Break Reminders */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={styles.settingHeader}>
                <Text style={styles.emoji}>☕</Text>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                  Break Reminders
                </Text>
              </View>
              <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
                Get reminded to take breaks during work hours
              </Text>
            </View>
            <Switch
              value={config.enabled}
              onValueChange={handleToggleBreakReminders}
              trackColor={{ false: '#767577', true: colors.primary + '80' }}
              thumbColor={config.enabled ? colors.primary : '#f4f3f4'}
            />
          </View>

          {config.enabled && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              
              {/* Interval Selection */}
              <View style={styles.intervalSection}>
                <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                  Break Interval
                </Text>
                {intervals.map((interval) => (
                  <TouchableOpacity
                    key={interval.value}
                    style={styles.radioRow}
                    onPress={() => updateConfig({ intervalMinutes: interval.value })}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.radio,
                      { borderColor: config.intervalMinutes === interval.value ? colors.primary : colors.border }
                    ]}>
                      {config.intervalMinutes === interval.value && (
                        <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                      )}
                    </View>
                    <Text style={[
                      styles.radioLabel,
                      { color: config.intervalMinutes === interval.value ? colors.textPrimary : colors.textMuted }
                    ]}>
                      {interval.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Work Hours */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <View style={styles.settingHeader}>
                    <Text style={styles.emoji}>🕐</Text>
                    <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                      Work Hours
                    </Text>
                  </View>
                  <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
                    {config.workHoursStart} - {config.workHoursEnd}
                  </Text>
                  <Text style={[styles.settingHint, { color: colors.textMuted }]}>
                    Reminders only during work hours
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.primary }]}>💡 How it works</Text>
            <Text style={[styles.infoText, { color: colors.primary }]}>
              • Break reminders work even when app is closed{'\n'}
              • Strong vibration on your device{'\n'}
              • System sound notification{'\n'}
              • Only active during work hours{'\n'}
              • Helps prevent burnout and stay healthy
            </Text>
          </View>
        </View>

        {/* Warning for testing mode */}
        {config.enabled && config.intervalMinutes === 1 && (
          <View style={[styles.warningCard, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' }]}>
            <Ionicons name="warning" size={20} color={colors.warning} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.warning }]}>⚡ Testing Mode Active</Text>
              <Text style={[styles.infoText, { color: colors.warning }]}>
                Break reminder will trigger every 1 minute. Perfect for testing! Remember to change to 120 minutes for actual use.
              </Text>
            </View>
          </View>
        )}
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
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  emoji: {
    fontSize: 20,
    marginRight: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  settingHint: {
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    height: 1,
  },
  intervalSection: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    fontSize: 15,
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  warningCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
