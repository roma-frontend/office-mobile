import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Typography, Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

import { api } from '../../convex/_generated/api';



function MetricCard({ icon, label, value, suffix, color, colors }: {
  icon: string; label: string; value: string | number; suffix?: string; color: string; colors: any;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <LinearGradient colors={[`${color}08`, `${color}00`]} style={StyleSheet.absoluteFill} />
      <View style={[styles.metricIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
        {value}{suffix && <Text style={[styles.metricSuffix, { color: colors.textMuted }]}>{suffix}</Text>}
      </Text>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status, colors }: { status: string; colors: any }) {
  const config: Record<string, { color: string; label: string }> = {
    normal:   { color: colors.success, label: 'Normal' },
    warning:  { color: colors.warning, label: 'Warning' },
    critical: { color: colors.error,   label: 'Critical' },
    breached: { color: '#dc2626',      label: 'Breached' },
  };
  const c = config[status] ?? config.normal;
  return (
    <View style={[styles.statusBadge, { backgroundColor: c.color + '18' }]}>
      <View style={[styles.statusDot, { backgroundColor: c.color }]} />
      <Text style={[styles.statusBadgeText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

export default function SLADashboard() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom;

  const userRole = user?.role;
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  const slaStats = useQuery(isAdmin ? api.sla.getSLAStats : (null as any), isAdmin ? {} : 'skip');
  const slaConfig = useQuery(isAdmin ? api.sla.getSLAConfig : (null as any), isAdmin ? undefined : 'skip');
  const pendingWithSLA = useQuery(isAdmin ? api.sla.getPendingWithSLA : (null as any), isAdmin ? undefined : 'skip');

  const isLoading = slaStats === undefined;

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>SLA Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerWrap}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 16 }]}>Admin Only</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>SLA metrics are only available to administrators.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatHours = (ms: number) => {
    if (!ms || ms === 0) return '0';
    const hours = ms / (1000 * 60 * 60);
    return hours < 1 ? `${Math.round(ms / 60000)}m` : `${hours.toFixed(1)}h`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.headerRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>SLA Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomOffset + 16 }}
        >
          {/* Compliance Rate Hero */}
          <LinearGradient
            colors={isDark ? [colors.primaryDark, colors.primary + '44'] : [colors.primary + '18', colors.primary + '08']}
            style={styles.heroCard}
          >
            <Text style={[styles.heroLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : colors.primary }]}>
              Compliance Rate
            </Text>
            <Text style={[styles.heroValue, { color: isDark ? '#fff' : colors.primary }]}>
              {slaStats?.complianceRate != null ? `${Math.round(slaStats.complianceRate)}%` : 'N/A'}
            </Text>
            <Text style={[styles.heroSub, { color: isDark ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
              {slaStats?.onTime ?? 0} on-time out of {slaStats?.total ?? 0} total
            </Text>
          </LinearGradient>

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <MetricCard icon="layers-outline" label="Total Requests" value={slaStats?.total ?? 0} color={colors.primary} colors={colors} />
            <MetricCard icon="time-outline" label="Pending" value={slaStats?.pending ?? 0} color={colors.warning} colors={colors} />
            <MetricCard icon="checkmark-circle-outline" label="On Time" value={slaStats?.onTime ?? 0} color={colors.success} colors={colors} />
            <MetricCard icon="alert-circle-outline" label="Breached" value={slaStats?.breached ?? 0} color={colors.error} colors={colors} />
          </View>

          {/* Average Response Time */}
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="speedometer-outline" size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Response Time</Text>
            </View>
            <Text style={[styles.responseValue, { color: colors.primary }]}>
              {formatHours(slaStats?.avgResponseTime ?? 0)}
            </Text>
            <Text style={[styles.responseLabel, { color: colors.textMuted }]}>Average Response Time</Text>
            {slaConfig && (
              <View style={[styles.targetRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.targetLabel, { color: colors.textMuted }]}>Target: {slaConfig.targetResponseTime ?? 24}h</Text>
                <Text style={[styles.targetLabel, { color: colors.warning }]}>Warning: {slaConfig.warningThreshold ?? 18}h</Text>
                <Text style={[styles.targetLabel, { color: colors.error }]}>Critical: {slaConfig.criticalThreshold ?? 22}h</Text>
              </View>
            )}
          </View>

          {/* Warning & Critical Counts */}
          {((slaStats?.warningCount ?? 0) > 0 || (slaStats?.criticalCount ?? 0) > 0) && (
            <View style={styles.alertRow}>
              {(slaStats?.warningCount ?? 0) > 0 && (
                <View style={[styles.alertCard, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '33' }]}>
                  <Ionicons name="warning-outline" size={20} color={colors.warning} />
                  <Text style={[styles.alertValue, { color: colors.warning }]}>{slaStats!.warningCount}</Text>
                  <Text style={[styles.alertLabel, { color: colors.warning }]}>Warnings</Text>
                </View>
              )}
              {(slaStats?.criticalCount ?? 0) > 0 && (
                <View style={[styles.alertCard, { backgroundColor: colors.error + '12', borderColor: colors.error + '33' }]}>
                  <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
                  <Text style={[styles.alertValue, { color: colors.error }]}>{slaStats!.criticalCount}</Text>
                  <Text style={[styles.alertLabel, { color: colors.error }]}>Critical</Text>
                </View>
              )}
            </View>
          )}

          {/* Pending with SLA Status */}
          {pendingWithSLA && pendingWithSLA.length > 0 && (
            <View>
              <View style={styles.sectionHeader}>
                <Ionicons name="list-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pending Requests</Text>
              </View>
              <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, padding: 0 }]}>
                {pendingWithSLA.slice(0, 10).map((item: any, i: number) => (
                  <View key={item._id ?? i} style={[
                    styles.pendingRow,
                    i < Math.min(pendingWithSLA.length, 10) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pendingName, { color: colors.textPrimary }]}>
                        {(item as any).userName ?? 'Employee'}
                      </Text>
                      <Text style={[styles.pendingType, { color: colors.textMuted }]}>
                        {(item as any).type ?? 'Leave'} · {(item as any).days ?? 0}d
                      </Text>
                    </View>
                    <StatusBadge status={(item as any).slaStatus ?? 'normal'} colors={colors} />
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  heroCard: { borderRadius: Radius.xl, padding: 24, alignItems: 'center' },
  heroLabel: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  heroValue: { fontSize: 48, fontWeight: '800', letterSpacing: -1 },
  heroSub: { fontSize: 13, marginTop: 4 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    width: '48%', flexGrow: 1, borderRadius: Radius.lg, borderWidth: 1,
    padding: 14, overflow: 'hidden', position: 'relative',
  },
  metricIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  metricValue: { fontSize: 24, fontWeight: '700', marginBottom: 2 },
  metricSuffix: { fontSize: 14, fontWeight: '400' },
  metricLabel: { fontSize: 12, fontWeight: '500' },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  responseValue: { fontSize: 36, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  responseLabel: { fontSize: 13, textAlign: 'center' },
  targetRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, paddingTop: 12, borderTopWidth: 1 },
  targetLabel: { fontSize: 11, fontWeight: '500' },
  alertRow: { flexDirection: 'row', gap: 10 },
  alertCard: {
    flex: 1, borderRadius: Radius.lg, borderWidth: 1, padding: 16, alignItems: 'center', gap: 4,
  },
  alertValue: { fontSize: 24, fontWeight: '700' },
  alertLabel: { fontSize: 12, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '600' },
  pendingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  pendingName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  pendingType: { fontSize: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
});
