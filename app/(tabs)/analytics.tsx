import { useState, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

const { width } = Dimensions.get('window');

type LeaveType = 'paid' | 'sick' | 'family' | 'doctor' | 'unpaid';

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  paid: 'Paid Vacation',
  sick: 'Sick Leave',
  family: 'Family Leave',
  doctor: 'Doctor Visit',
  unpaid: 'Unpaid Leave',
};

const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  paid: '#3b82f6',
  sick: '#ef4444',
  family: '#10b981',
  doctor: '#06b6d4',
  unpaid: '#f59e0b',
};

// ── KPI Card ───────────────────────────────────────────────────────────
function KPICard({ icon, label, value, subtext, color }: {
  icon: string;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.kpiCard, { borderLeftColor: color, borderLeftWidth: 4, backgroundColor: colors.bgCard, borderColor: colors.border, borderRightWidth: 1, borderTopWidth: 1, borderBottomWidth: 1 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>{label}</Text>
          <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>{value}</Text>
          {subtext && <Text style={[styles.kpiSubtext, { color: colors.textMuted }]}>{subtext}</Text>}
        </View>
        <View style={[styles.kpiIconBox, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
      </View>
    </View>
  );
}

// ── Bar Chart (Leave Trends) ───────────────────────────────────────────
function LeaveTrendsChart({ data, colors }: {
  data: { month: string; approved: number; pending: number; rejected: number }[];
  colors: any;
}) {
  const maxVal = Math.max(...data.flatMap((d: any) => [d.approved, d.pending, d.rejected]), 1);
  const chartH = 120;

  return (
    <View style={styles.chartContainer}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: chartH + 32 }}>
        {data.map((d: any, i: any) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: chartH + 32 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, height: chartH }}>
              {[
                { val: d.approved, color: colors.success },
                { val: d.pending, color: colors.warning },
                { val: d.rejected, color: colors.error },
              ].map((bar, j) => (
                <View
                  key={j}
                  style={{
                    width: 4,
                    height: Math.max(2, (bar.val / maxVal) * chartH),
                    backgroundColor: bar.color,
                    borderRadius: 2,
                  }}
                />
              ))}
            </View>
            <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 6 }}>{d.month}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 16, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.success }} />
          <Text style={{ fontSize: 11, color: colors.textMuted }}>Approved</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.warning }} />
          <Text style={{ fontSize: 11, color: colors.textMuted }}>Pending</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.error }} />
          <Text style={{ fontSize: 11, color: colors.textMuted }}>Rejected</Text>
        </View>
      </View>
    </View>
  );
}

// ── Leave Distribution (Horizontal bars) ────────────────────────────────
function LeaveDistributionChart({ data, colors }: {
  data: { type: LeaveType; count: number }[];
  colors: any;
}) {
  const maxVal = Math.max(...data.map((d: any) => d.count), 1);

  return (
    <View style={styles.chartContainer}>
      {data.map((d: any, i: any) => (
        <View key={i} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>
              {LEAVE_TYPE_LABELS[d.type as LeaveType]}
            </Text>
            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>{d.count}</Text>
          </View>
          <View style={{ height: 8, backgroundColor: colors.bgElevated, borderRadius: 4, overflow: 'hidden' }}>
            <View
              style={{
                height: '100%',
                width: `${(d.count / maxVal) * 100}%`,
                backgroundColor: LEAVE_TYPE_COLORS[d.type as LeaveType],
                borderRadius: 4,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Department Card ────────────────────────────────────────────────────
function DepartmentCard({ dept, colors }: {
  dept: { department: string; employeeCount: number; avgPaidBalance: number; avgSickBalance: number; avgFamilyBalance?: number };
  colors: any;
}) {
  const maxBalance = 30;

  return (
    <LinearGradient
      colors={[colors.bgCard, colors.bgElevated]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.deptCard, { borderColor: colors.border }]}
    >
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 }}>
          {dept.department}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>
          {dept.employeeCount} employees
        </Text>
      </View>

      {[
        { label: 'Paid', value: Number(dept.avgPaidBalance ?? 0), color: '#3b82f6' },
        { label: 'Sick', value: Number(dept.avgSickBalance ?? 0), color: colors.error },
        { label: 'Family', value: Number(dept.avgFamilyBalance ?? 0), color: colors.success },
      ].map((bal, i) => (
        <View key={i} style={{ marginBottom: i < 2 ? 8 : 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>{bal.label}</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textPrimary }}>{bal.value.toFixed(1)}</Text>
          </View>
          <View style={{ height: 4, backgroundColor: colors.bgElevated, borderRadius: 2, overflow: 'hidden' }}>
            <View
              style={{
                height: '100%',
                width: `${(bal.value / maxBalance) * 100}%`,
                backgroundColor: bal.color,
              }}
            />
          </View>
        </View>
      ))}
    </LinearGradient>
  );
}

// ── Smart Suggestion Card ──────────────────────────────────────────────
function SmartSuggestionCard({ item, colors }: {
  item: { type: string; message: string; priority: string; affectedEmployees: number };
  colors: any;
}) {
  const priorityColors: Record<string, string> = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981',
  };

  return (
    <View style={[styles.suggestionCard, { borderLeftColor: priorityColors[item.priority], borderLeftWidth: 3, backgroundColor: colors.bgCard, borderColor: colors.border, borderRightWidth: 1, borderTopWidth: 1, borderBottomWidth: 1 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View
          style={[styles.suggestionBadge, { backgroundColor: priorityColors[item.priority] + '22' }]}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: priorityColors[item.priority] }}>
            {item.priority.toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 }}>
            {item.type}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
            {item.message}
          </Text>
          {item.affectedEmployees > 0 && (
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
              Affects {item.affectedEmployees} employee{item.affectedEmployees !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Section Header ─────────────────────────────────────────────────────
function SectionHeader({ title, icon, colors }: { title: string; icon: string; colors: any }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={18} color={colors.primary} />
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
    </View>
  );
}

// ── Personal Analytics Section ─────────────────────────────────────────
function PersonalAnalyticsSection({ userId, colors }: { userId: string; colors: any }) {
  const personalData = useQuery(api.analytics.getUserAnalytics, {
    userId: userId as Id<'users'>,
  });

  if (!personalData) return <ActivityIndicator color={colors.primary} size="large" />;

  const leaveData = Object.entries(personalData.leavesByType || {})
    .filter(([, count]: [any, any]) => count > 0)
    .map(([type, count]: [any, any]) => ({
      type: type as LeaveType,
      count: count as number,
    }));

  const monthlyData = (personalData.userLeaves || []).reduce((acc: any, leave: any) => {
    const monthKey = new Date(leave.createdAt).toLocaleString('en-US', { month: 'short' });
    const existing = acc.find((item: any) => item.month === monthKey);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ month: monthKey, count: 1 });
    }
    return acc;
  }, []).slice(-6);

  const maxMonthly = Math.max(...monthlyData.map((d: any) => d.count), 1);
  
  const totalRequests = personalData.userLeaves?.length || 0;
  const approvedRequests = personalData.userLeaves?.filter((l: any) => l.status === 'approved').length || 0;
  const rejectedRequests = personalData.userLeaves?.filter((l: any) => l.status === 'rejected').length || 0;
  const pendingRequests = personalData.userLeaves?.filter((l: any) => l.status === 'pending').length || 0;
  const approvalRate = Math.round((approvedRequests / (totalRequests || 1)) * 100);
  const chartH = 100;

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md, gap: Spacing.lg, paddingBottom: Platform.OS === 'ios' ? 108 : 88 }}>
      {/* Stats */}
      <View style={{ gap: Spacing.md }}>
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <KPICard icon="layers-outline" label="Total Requests" value={totalRequests} color={colors.primary} />
          <KPICard icon="checkmark-circle-outline" label="Approved" value={approvedRequests} color={colors.success} />
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <KPICard icon="close-circle-outline" label="Rejected" value={rejectedRequests} color={colors.error} />
          <KPICard icon="time-outline" label="Pending" value={pendingRequests} color={colors.warning} />
        </View>
        <KPICard icon="trending-up-outline" label="Approval Rate" value={`${approvalRate}%`} color={colors.primary} />
      </View>

      {/* Leave by Type */}
      {leaveData.length > 0 && (
        <View>
          <SectionHeader title="Leave Breakdown" icon="pie-chart-outline" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <LeaveDistributionChart data={leaveData} colors={colors} />
          </View>
        </View>
      )}

      {/* Monthly Activity */}
      {monthlyData.length > 0 && (
        <View>
          <SectionHeader title="Monthly Activity" icon="bar-chart-outline" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: chartH + 28 }}>
              {monthlyData.map((d: any, i: any) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: chartH + 28 }}>
                  <View style={{ width: '70%', height: Math.max(8, (d.count / maxMonthly) * chartH), backgroundColor: colors.primary, borderRadius: 4 }} />
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 6 }}>{d.month}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ── Admin Overview Tab ─────────────────────────────────────────────────
function AdminOverviewTab({ userId, colors }: { userId: string; colors: any }) {
  const overviewData = useQuery(api.analytics.getAnalyticsOverview);

  if (!overviewData) return <ActivityIndicator color={colors.primary} size="large" />;

  const leaveData = (overviewData.leaves || []).reduce((acc, leave) => {
    const existing = acc.find(item => item.type === leave.type);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ type: leave.type as LeaveType, count: 1 });
    }
    return acc;
  }, [] as { type: LeaveType; count: number }[])
    .filter(d => d.count > 0);

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md, gap: Spacing.lg, paddingBottom: Platform.OS === 'ios' ? 108 : 88 }}>
      {/* KPI Cards */}
      <View style={{ gap: Spacing.md }}>
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <KPICard icon="people-outline" label="Total Employees" value={overviewData.totalEmployees} color={colors.primary} />
          <KPICard icon="time-outline" label="Pending" value={overviewData.pendingApprovals} color={colors.warning} />
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <KPICard icon="layers-outline" label="Total Requests" value={overviewData.totalLeaves} color={colors.primary} />
          <KPICard icon="trending-up-outline" label="Approval Rate" value={`${Math.round((overviewData.approvedLeaves / (overviewData.totalLeaves || 1)) * 100)}%`} color={colors.success} />
        </View>
      </View>

      {/* Leave Distribution */}
      {leaveData.length > 0 && (
        <View>
          <SectionHeader title="Leave Distribution by Type" icon="pie-chart-outline" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <LeaveDistributionChart data={leaveData} colors={colors} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ── Admin Departments Tab ──────────────────────────────────────────────
function AdminDepartmentsTab({ userId, colors }: { userId: string; colors: any }) {
  const deptData = useQuery(api.analytics.getDepartmentStats);

  if (!deptData) return <ActivityIndicator color={colors.primary} size="large" />;

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md, paddingBottom: Platform.OS === 'ios' ? 108 : 88 }}>
      {deptData.map((dept, i) => (
        <DepartmentCard key={i} dept={dept} colors={colors} />
      ))}
    </ScrollView>
  );
}

// ── Admin Trends Tab ───────────────────────────────────────────────────
function AdminTrendsTab({ userId, colors }: { userId: string; colors: any }) {
  const trendsData = useQuery(api.analytics.getLeaveTrends);

  if (!trendsData) return <ActivityIndicator color={colors.primary} size="large" />;

  const trendsByMonth = (trendsData || []).reduce((acc, leave) => {
    const monthKey = new Date(leave.createdAt).toLocaleString('en-US', { month: 'short', year: '2-digit' });
    const existing = acc.find(item => item.month === monthKey);
    if (existing) {
      if (leave.status === 'approved') existing.approved += 1;
      if (leave.status === 'pending') existing.pending += 1;
      if (leave.status === 'rejected') existing.rejected += 1;
    } else {
      acc.push({
        month: monthKey,
        approved: leave.status === 'approved' ? 1 : 0,
        pending: leave.status === 'pending' ? 1 : 0,
        rejected: leave.status === 'rejected' ? 1 : 0,
      });
    }
    return acc;
  }, [] as { month: string; approved: number; pending: number; rejected: number }[]);

  const last6Months = trendsByMonth.slice(-6);

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md, gap: Spacing.lg, paddingBottom: Platform.OS === 'ios' ? 108 : 88 }}>
      <SectionHeader title="Leave Trends (Last 6 Months)" icon="bar-chart-outline" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <LeaveTrendsChart data={last6Months} colors={colors} />
      </View>
    </ScrollView>
  );
}

// ── Tab Button ─────────────────────────────────────────────────────────
function TabButton({ label, active, onPress, colors }: { label: string; active: boolean; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tabButton, active && { backgroundColor: colors.bgElevated + '44' }]}>
      <Text style={[styles.tabButtonText, { color: active ? colors.primary : colors.textMuted }, active && { fontWeight: '600' }]}>{label}</Text>
      {active && <View style={[styles.tabButtonUnderline, { backgroundColor: colors.primary }]} />}
    </TouchableOpacity>
  );
}

// ── Main Component ─────────────────────────────────────────────────────
export default function Analytics() {
  const insets = useSafeAreaInsets();
  const { colors, toggleTheme } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'trends'>('overview');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const [id, role] = await Promise.all([
          AsyncStorage.getItem('user_id'),
          AsyncStorage.getItem('user_role'),
        ]);
        setUserId(id);
        setUserRole(role);
      } catch (e) {
        console.error('Failed to load user', e);
      }
    };
    loadUser();
  }, []);

  if (!userId || !userRole) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const isAdminOrSupervisor = userRole === 'admin' || userRole === 'supervisor';

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Analytics</Text>
        <TouchableOpacity onPress={toggleTheme} style={{ padding: 8 }}>
          <Ionicons name={colors.isDark ? "sunny-outline" : "moon-outline"} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {isAdminOrSupervisor ? (
        <>
          {/* Admin Tab Switcher */}
          <View style={[styles.tabSwitcher, { borderBottomColor: colors.border, backgroundColor: colors.bgCard }]}>
            <TabButton
              label="Overview"
              active={activeTab === 'overview'}
              onPress={() => setActiveTab('overview')}
              colors={colors}
            />
            <TabButton
              label="Departments"
              active={activeTab === 'departments'}
              onPress={() => setActiveTab('departments')}
              colors={colors}
            />
            <TabButton
              label="Trends"
              active={activeTab === 'trends'}
              onPress={() => setActiveTab('trends')}
              colors={colors}
            />
          </View>

          {/* Tab Content */}
          {activeTab === 'overview' && <AdminOverviewTab userId={userId} colors={colors} />}
          {activeTab === 'departments' && <AdminDepartmentsTab userId={userId} colors={colors} />}
          {activeTab === 'trends' && <AdminTrendsTab userId={userId} colors={colors} />}
        </>
      ) : (
        /* Employee Personal Analytics */
        <PersonalAnalyticsSection userId={userId} colors={colors} />
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...Typography.h1,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    position: 'relative',
  },
  tabButtonText: {
    ...Typography.bodyMedium,
  },
  tabButtonUnderline: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '80%',
    borderRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    marginTop: 0,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  kpiCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  kpiLabel: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
  },
  kpiValue: {
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  kpiSubtext: {
    ...Typography.caption,
  },
  kpiIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartContainer: {
    width: '100%',
  },
  deptCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  suggestionCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  suggestionBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
});

