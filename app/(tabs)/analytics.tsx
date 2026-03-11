import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from 'convex/react';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useMemo } from 'react';
import { useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Typography, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';


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
  const deptData = useQuery(api.analytics.getDepartmentStats, {});

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
  const trendsData = useQuery(api.analytics.getLeaveTrends, {});

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

// ── Performance Ratings Tab ───────────────────────────────────────────
const RATING_CRITERIA = [
  { key: 'qualityOfWork', label: 'Quality', icon: 'star-outline', color: '#3b82f6' },
  { key: 'efficiency', label: 'Efficiency', icon: 'speedometer-outline', color: '#10b981' },
  { key: 'teamwork', label: 'Teamwork', icon: 'people-outline', color: '#8b5cf6' },
  { key: 'initiative', label: 'Initiative', icon: 'bulb-outline', color: '#f59e0b' },
  { key: 'communication', label: 'Communication', icon: 'chatbubbles-outline', color: '#06b6d4' },
  { key: 'reliability', label: 'Reliability', icon: 'shield-checkmark-outline', color: '#ef4444' },
];

function RatingsTab({ userId, colors }: { userId: string; colors: any }) {
  const ratings = useQuery(api.supervisorRatings.getEmployeeRatings, {
    employeeId: userId as Id<'users'>,
    limit: 10,
  });
  const averages = useQuery(api.supervisorRatings.getAverageRatings, {
    employeeId: userId as Id<'users'>,
  });
  const trends = useQuery(api.supervisorRatings.getRatingTrends, {
    employeeId: userId as Id<'users'>,
    months: 6,
  });

  if (ratings === undefined || averages === undefined) {
    return <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />;
  }

  const overallAvg = averages
    ? (Object.values(averages).reduce((s: number, v: any) => s + (Number(v) || 0), 0) / Math.max(Object.values(averages).length, 1)).toFixed(1)
    : '0.0';

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md, gap: Spacing.lg, paddingBottom: Platform.OS === 'ios' ? 108 : 88 }}>
      {/* Overall Score */}
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, alignItems: 'center', paddingVertical: 24 }]}>
        <Text style={{ fontSize: 48, fontWeight: '800', color: colors.primary }}>{overallAvg}</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>Overall Rating</Text>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
          {[1, 2, 3, 4, 5].map(s => (
            <Ionicons key={s} name={Number(overallAvg) >= s ? 'star' : Number(overallAvg) >= s - 0.5 ? 'star-half' : 'star-outline'} size={20} color="#f59e0b" />
          ))}
        </View>
      </View>

      {/* Criteria Breakdown */}
      {averages && Object.keys(averages).length > 0 && (
        <View>
          <SectionHeader title="Criteria Breakdown" icon="analytics-outline" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            {RATING_CRITERIA.map((crit, i) => {
              const val = Number((averages as any)[crit.key] ?? 0);
              return (
                <View key={crit.key} style={{ marginBottom: i < RATING_CRITERIA.length - 1 ? 16 : 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name={crit.icon as any} size={16} color={crit.color} />
                      <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>{crit.label}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>{val.toFixed(1)}/5</Text>
                  </View>
                  <View style={{ height: 8, backgroundColor: colors.bgElevated ?? (colors.border + '44'), borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${(val / 5) * 100}%`, backgroundColor: crit.color, borderRadius: 4 }} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Trend */}
      {trends && Array.isArray(trends) && trends.length > 0 && (
        <View>
          <SectionHeader title="Rating Trend" icon="trending-up-outline" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            {(() => {
              const maxVal = Math.max(...trends.map((t: any) => t.average ?? 0), 1);
              const chartH = 100;
              return (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: chartH + 28 }}>
                  {trends.map((t: any, i: number) => (
                    <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: chartH + 28 }}>
                      <View style={{
                        width: '60%', borderRadius: 4, backgroundColor: colors.primary,
                        height: Math.max(8, ((t.average ?? 0) / 5) * chartH),
                      }} />
                      <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 6 }}>{t.month}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>
        </View>
      )}

      {/* Rating History */}
      <SectionHeader title="Rating History" icon="time-outline" colors={colors} />
      {ratings && ratings.length > 0 ? (
        ratings.map((r: any, i: number) => (
          <View key={r._id ?? i} style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, marginBottom: i < ratings.length - 1 ? 8 : 0 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
                  {r.supervisorName ?? 'Supervisor'}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
                </Text>
              </View>
              <View style={{ backgroundColor: colors.primary + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>
                  {((r.qualityOfWork + r.efficiency + r.teamwork + r.initiative + r.communication + r.reliability) / 6).toFixed(1)}
                </Text>
              </View>
            </View>
            {r.comments && (
              <Text style={{ fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 19 }}>
                "{r.comments}"
              </Text>
            )}
          </View>
        ))
      ) : (
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, alignItems: 'center', paddingVertical: 32 }]}>
          <Ionicons name="star-outline" size={40} color={colors.textMuted} />
          <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 12 }}>No ratings yet</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ── Tab Button ─────────────────────────────────────────────────────────
function TabButton({ label, active, onPress, colors }: { label: string; active: boolean; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        styles.tabButton, 
        { 
          minWidth: 110,
          paddingHorizontal: Spacing.lg,
          backgroundColor: active ? colors.bgElevated : 'transparent',
          paddingVertical: Spacing.md + 4,
        }
      ]}
    >
      <Text style={[styles.tabButtonText, { color: active ? colors.primary : colors.textMuted }, { fontWeight: active ? '700' : '500' }]}>{label}</Text>
      {active && <View style={[styles.tabButtonUnderline, { backgroundColor: colors.primary, width: '60%' }]} />}
    </TouchableOpacity>
  );
}

// ── Main Component ─────────────────────────────────────────────────────
export default function Analytics() {
  const insets = useSafeAreaInsets();
  const { colors, toggleTheme } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'trends' | 'ratings'>('overview');

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
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={[styles.tabSwitcher, { borderBottomColor: colors.border, backgroundColor: colors.bgCard }]}
            contentContainerStyle={{ flexGrow: 1 }}
          >
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
            <TabButton
              label="Ratings"
              active={activeTab === 'ratings'}
              onPress={() => setActiveTab('ratings')}
              colors={colors}
            />
          </ScrollView>

          {/* Tab Content */}
          {activeTab === 'overview' && <AdminOverviewTab userId={userId} colors={colors} />}
          {activeTab === 'departments' && <AdminDepartmentsTab userId={userId} colors={colors} />}
          {activeTab === 'trends' && <AdminTrendsTab userId={userId} colors={colors} />}
          {activeTab === 'ratings' && <RatingsTab userId={userId} colors={colors} />}
        </>
      ) : (
        <>
          {/* Employee Tab Switcher */}
          <View style={[styles.tabSwitcher, { borderBottomColor: colors.border, backgroundColor: colors.bgCard }]}>
            <TabButton
              label="My Analytics"
              active={activeTab === 'overview'}
              onPress={() => setActiveTab('overview')}
              colors={colors}
            />
            <TabButton
              label="My Ratings"
              active={activeTab === 'ratings'}
              onPress={() => setActiveTab('ratings')}
              colors={colors}
            />
          </View>
          {activeTab === 'overview' || activeTab === 'departments' || activeTab === 'trends'
            ? <PersonalAnalyticsSection userId={userId} colors={colors} />
            : <RatingsTab userId={userId} colors={colors} />
          }
        </>
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
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    flexGrow: 0,
  },
  tabButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
  },
  tabButtonText: {
    ...Typography.bodyMedium,
  },
  tabButtonUnderline: {
    position: 'absolute' as const,
    bottom: 0,
    height: 3,
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

