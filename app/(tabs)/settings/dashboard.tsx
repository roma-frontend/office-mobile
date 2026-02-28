import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { router } from 'expo-router';

export default function DashboardSettings() {
  const { colors } = useTheme();
  
  const [widgets, setWidgets] = useState({
    quickStats: true,
    leaveCalendar: true,
    upcomingTasks: true,
    teamActivity: true,
    recentLeaves: false,
    analytics: true,
  });

  const toggleWidget = (key: keyof typeof widgets) => {
    setWidgets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const widgetList = [
    { key: 'quickStats', icon: '📊', label: 'Quick Statistics', desc: 'Overview of leaves, tasks, and attendance' },
    { key: 'leaveCalendar', icon: '📅', label: 'Leave Calendar', desc: 'Visual calendar of team absences' },
    { key: 'upcomingTasks', icon: '✓', label: 'Upcoming Tasks', desc: 'Your next tasks and deadlines' },
    { key: 'teamActivity', icon: '👥', label: 'Team Activity', desc: 'Recent team actions and updates' },
    { key: 'recentLeaves', icon: '📋', label: 'Recent Leaves', desc: 'Latest leave requests' },
    { key: 'analytics', icon: '📈', label: 'Analytics Chart', desc: 'Performance trends' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Customize which widgets appear on your dashboard
        </Text>

        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {widgetList.map((widget, index) => (
            <View key={widget.key}>
              <View style={styles.widgetRow}>
                <View style={styles.widgetInfo}>
                  <Text style={styles.widgetIcon}>{widget.icon}</Text>
                  <View style={styles.widgetText}>
                    <Text style={[styles.widgetLabel, { color: colors.textPrimary }]}>
                      {widget.label}
                    </Text>
                    <Text style={[styles.widgetDesc, { color: colors.textMuted }]}>
                      {widget.desc}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={widgets[widget.key as keyof typeof widgets]}
                  onValueChange={() => toggleWidget(widget.key as keyof typeof widgets)}
                  trackColor={{ false: '#767577', true: colors.primary + '80' }}
                  thumbColor={widgets[widget.key as keyof typeof widgets] ? colors.primary : '#f4f3f4'}
                />
              </View>
              {index < widgetList.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            Widget preferences are saved automatically and will be applied on next app launch.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  widgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  widgetInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  widgetIcon: { fontSize: 28, marginRight: 12 },
  widgetText: { flex: 1 },
  widgetLabel: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  widgetDesc: { fontSize: 13 },
  divider: { height: 1, marginLeft: 56 },
  infoCard: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, gap: 12, marginTop: 16 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
