import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Share, Platform, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

type DateRange = 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months';
type LeaveType = 'paid' | 'sick' | 'family' | 'doctor' | 'unpaid';

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  paid: 'Paid Vacation', sick: 'Sick Leave', family: 'Family Leave',
  doctor: 'Doctor Visit', unpaid: 'Unpaid Leave',
};
const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  paid: '#3b82f6', sick: '#ef4444', family: '#10b981', doctor: '#06b6d4', unpaid: '#f59e0b',
};

const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'last_3_months', label: 'Last 3 Months' },
  { key: 'last_6_months', label: 'Last 6 Months' },
];

function getDateRange(range: DateRange): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  let start: Date;
  switch (range) {
    case 'this_month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case 'last_month': start = new Date(now.getFullYear(), now.getMonth() - 1, 1); break;
    case 'last_3_months': start = new Date(now.getFullYear(), now.getMonth() - 2, 1); break;
    case 'last_6_months': start = new Date(now.getFullYear(), now.getMonth() - 5, 1); break;
  }
  return { start, end };
}

function SummaryCard({ icon, label, value, color, colors }: {
  icon: string; label: string; value: number | string; color: string; colors: any;
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <LinearGradient colors={[`${color}08`, `${color}00`]} style={StyleSheet.absoluteFill} />
      <View style={[styles.summaryIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom;

  const userId = user?.userId ?? null;
  const userRole = user?.role ?? 'employee';
  const isAdmin = userRole === 'admin' || userRole === 'supervisor';

  const [dateRange, setDateRange] = useState<DateRange>('this_month');

  const overview = useQuery(api.analytics.getAnalyticsOverview);
  const deptStats = useQuery(isAdmin ? api.analytics.getDepartmentStats : (null as any), isAdmin ? undefined : 'skip');
  const trends = useQuery(api.analytics.getLeaveTrends);

  const isLoading = overview === undefined;
  const { start, end } = getDateRange(dateRange);

  // Filter leaves by date range
  const filteredLeaves = useMemo(() => {
    if (!overview?.leaves) return [];
    return overview.leaves.filter((l: any) => {
      const d = new Date(l.startDate ?? l._creationTime);
      return d >= start && d <= end;
    });
  }, [overview, start, end]);

  const stats = useMemo(() => {
    const total = filteredLeaves.length;
    const approved = filteredLeaves.filter((l: any) => l.status === 'approved').length;
    const rejected = filteredLeaves.filter((l: any) => l.status === 'rejected').length;
    const pending = filteredLeaves.filter((l: any) => l.status === 'pending').length;
    return { total, approved, rejected, pending };
  }, [filteredLeaves]);

  const leaveByType = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeaves.forEach((l: any) => {
      counts[l.type] = (counts[l.type] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({ type: type as LeaveType, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLeaves]);

  const maxTypeCount = Math.max(...leaveByType.map(d => d.count), 1);

  const handleShareReport = async () => {
    const rangeName = DATE_RANGES.find(r => r.key === dateRange)?.label ?? '';
    const typeBreakdown = leaveByType.map(d =>
      `  ${LEAVE_TYPE_LABELS[d.type] ?? d.type}: ${d.count}`
    ).join('\n');

    const report = `📊 Leave Report — ${rangeName}
━━━━━━━━━━━━━━━━━━━━
Total Requests: ${stats.total}
Approved: ${stats.approved}
Rejected: ${stats.rejected}
Pending: ${stats.pending}

📋 By Type:
${typeBreakdown || '  No data'}

Generated by HRLeave Mobile`;

    try {
      await Share.share({ message: report, title: `Leave Report — ${rangeName}` });
    } catch {}
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Reports</Text>
        <TouchableOpacity onPress={handleShareReport} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomOffset + 16 }}
      >
        {/* Date Range Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {DATE_RANGES.map(r => (
            <TouchableOpacity
              key={r.key}
              onPress={() => setDateRange(r.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: dateRange === r.key ? colors.primary + '18' : colors.bgCard,
                  borderColor: dateRange === r.key ? colors.primary + '44' : colors.border,
                },
              ]}
            >
              <Text style={[
                styles.filterChipText,
                { color: dateRange === r.key ? colors.primary : colors.textMuted },
              ]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={{ padding: 60, alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              <SummaryCard icon="layers-outline" label="Total" value={stats.total} color={colors.primary} colors={colors} />
              <SummaryCard icon="checkmark-circle-outline" label="Approved" value={stats.approved} color={colors.success} colors={colors} />
              <SummaryCard icon="close-circle-outline" label="Rejected" value={stats.rejected} color={colors.error} colors={colors} />
              <SummaryCard icon="time-outline" label="Pending" value={stats.pending} color={colors.warning} colors={colors} />
            </View>

            {/* Leave by Type */}
            <View>
              <View style={styles.sectionHeader}>
                <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>By Leave Type</Text>
              </View>
              <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                {leaveByType.length === 0 ? (
                  <Text style={[styles.noData, { color: colors.textMuted }]}>No leave data for this period</Text>
                ) : (
                  leaveByType.map((d, i) => (
                    <View key={d.type} style={[styles.typeRow, i < leaveByType.length - 1 && { marginBottom: 14 }]}>
                      <View style={styles.typeHeader}>
                        <View style={[styles.typeDot, { backgroundColor: LEAVE_TYPE_COLORS[d.type] ?? colors.primary }]} />
                        <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>
                          {LEAVE_TYPE_LABELS[d.type] ?? d.type}
                        </Text>
                        <Text style={[styles.typeCount, { color: colors.textPrimary }]}>{d.count}</Text>
                      </View>
                      <View style={[styles.barBg, { backgroundColor: colors.bgElevated }]}>
                        <View
                          style={[styles.barFill, {
                            width: `${(d.count / maxTypeCount) * 100}%`,
                            backgroundColor: LEAVE_TYPE_COLORS[d.type] ?? colors.primary,
                          }]}
                        />
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* Department Breakdown (Admin only) */}
            {isAdmin && deptStats && deptStats.length > 0 && (
              <View>
                <View style={styles.sectionHeader}>
                  <Ionicons name="business-outline" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>By Department</Text>
                </View>
                <View style={{ gap: 10 }}>
                  {deptStats.map((dept: any, i: number) => (
                    <View key={i} style={[styles.deptCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                      <View style={styles.deptHeader}>
                        <View style={[styles.deptIcon, { backgroundColor: colors.primary + '18' }]}>
                          <Ionicons name="people-outline" size={18} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.deptName, { color: colors.textPrimary }]}>{dept.department}</Text>
                          <Text style={[styles.deptCount, { color: colors.textMuted }]}>{dept.employeeCount} employees</Text>
                        </View>
                      </View>
                      <View style={styles.deptBalances}>
                        {[
                          { label: 'Avg Paid', value: Number(dept.avgPaidBalance ?? 0).toFixed(1), color: '#3b82f6' },
                          { label: 'Avg Sick', value: Number(dept.avgSickBalance ?? 0).toFixed(1), color: '#ef4444' },
                          { label: 'Avg Family', value: Number(dept.avgFamilyBalance ?? 0).toFixed(1), color: '#10b981' },
                        ].map((b, j) => (
                          <View key={j} style={styles.deptBalance}>
                            <Text style={[styles.deptBalValue, { color: b.color }]}>{b.value}</Text>
                            <Text style={[styles.deptBalLabel, { color: colors.textMuted }]}>{b.label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Approval Rate */}
            <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, alignItems: 'center', padding: 24 }]}>
              <Text style={[styles.approvalRateValue, { color: colors.primary }]}>
                {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
              </Text>
              <Text style={[styles.approvalRateLabel, { color: colors.textMuted }]}>
                Approval Rate
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  shareBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: {
    width: (width - 42) / 2, borderRadius: Radius.lg, borderWidth: 1,
    padding: 14, overflow: 'hidden', position: 'relative',
  },
  summaryIcon: {
    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  summaryValue: { fontSize: 26, fontWeight: '700', marginBottom: 2 },
  summaryLabel: { fontSize: 12, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '600' },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: 16 },
  noData: { textAlign: 'center', padding: 16, fontSize: 13 },
  typeRow: {},
  typeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  typeLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  typeCount: { fontSize: 14, fontWeight: '700' },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  deptCard: { borderRadius: Radius.lg, borderWidth: 1, padding: 16 },
  deptHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  deptIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  deptName: { fontSize: 15, fontWeight: '600' },
  deptCount: { fontSize: 12, marginTop: 2 },
  deptBalances: { flexDirection: 'row', justifyContent: 'space-around' },
  deptBalance: { alignItems: 'center' },
  deptBalValue: { fontSize: 20, fontWeight: '700' },
  deptBalLabel: { fontSize: 11, marginTop: 2 },
  approvalRateValue: { fontSize: 48, fontWeight: '800' },
  approvalRateLabel: { fontSize: 14, marginTop: 4 },
});
