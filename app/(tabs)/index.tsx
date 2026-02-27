import { useState, useEffect, useMemo } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Platform, ActivityIndicator, Alert, Modal, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

type LeaveType = 'paid' | 'sick' | 'family' | 'doctor' | 'unpaid';
type LeaveStatus = 'pending' | 'approved' | 'rejected';

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  paid: 'Paid Vacation', sick: 'Sick Leave', family: 'Family Leave',
  doctor: 'Doctor Visit', unpaid: 'Unpaid Leave',
};
// Leave type colors are neutral/accent — same in both themes
const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  paid: colors.primary, sick: '#8A9BAC', family: '#4CAF7C', doctor: '#6A9BAC', unpaid: '#7A8A7A',
};
const STATUS_ICONS: Record<LeaveStatus, string> = {
  approved: 'checkmark-circle', pending: 'time', rejected: 'close-circle',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(date: Date) {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatShortDate(str: string) {
  if (!str) return '';
  const parts = str.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}`;
}

function getMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(d: Date) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getMonth()];
}

// ── Mini Bar Chart (no external deps) ────────────────────────────────────
function MiniBarChart({ data }: {
  data: { month: string; approved: number; pending: number; rejected: number }[];
}) {
  const { colors } = useTheme();
  const maxVal = Math.max(...data.flatMap(d => [d.approved, d.pending, d.rejected]), 1);
  const chartH = 100;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: chartH + 24 }}>
      {data.map((d, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: chartH + 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: chartH }}>
            {[
              { val: d.approved, color: colors.success },
              { val: d.pending,  color: colors.warning },
              { val: d.rejected, color: colors.error },
            ].map((bar, j) => (
              <View key={j} style={{
                width: 5,
                height: Math.max(2, (bar.val / maxVal) * chartH),
                backgroundColor: bar.color,
                borderRadius: 3,
              }} />
            ))}
          </View>
          <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 4 }}>{d.month}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Mini Pie (donut) via segments using Views ─────────────────────────────
function PieLegend({ data }: { data: { name: string; value: number; color: string }[] }) {
  const { colors } = useTheme();
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <View style={{ gap: 8 }}>
      {data.map((d, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.color }} />
            <Text style={{ fontSize: 12, color: colors.textMuted, flex: 1 }} numberOfLines={1}>{d.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ height: 6, width: Math.max(6, (d.value / total) * 80), backgroundColor: d.color, borderRadius: 3 }} />
            <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '600', width: 24, textAlign: 'right' }}>{d.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Star Rating ───────────────────────────────────────────────────────────
function StarRating({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Ionicons key={i} name={i <= Math.round(value) ? 'star' : 'star-outline'} size={14} color="#f59e0b" />
      ))}
    </View>
  );
}

// ── Section Header ────────────────────────────────────────────────────
function SectionHeader({ title, icon, onSeeAll }: { title: string; icon: string; onSeeAll?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={icon as any} size={16} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }, style]}>{children}</View>;
}

// ── Check-In/Out Widget ───────────────────────────────────────────────
function CheckInOutWidget({ userId }: { userId: string }) {
  const { colors } = useTheme();
  const todayStatus = useQuery(api.timeTracking.getTodayStatus, { userId: userId as Id<'users'> });
  const checkIn = useMutation(api.timeTracking.checkIn);
  const checkOut = useMutation(api.timeTracking.checkOut);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const isCheckedIn = todayStatus?.status === 'checked_in';
  const isCheckedOut = todayStatus?.status === 'checked_out';

  const fmtTime = (ms: number) => {
    const d = new Date(ms);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const handlePress = async () => {
    setLoading(true);
    try {
      if (!isCheckedIn && !isCheckedOut) {
        await checkIn({ userId: userId as Id<'users'> });
      } else if (isCheckedIn) {
        await checkOut({ userId: userId as Id<'users'> });
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const btnColor = isCheckedOut ? colors.textMuted : isCheckedIn ? colors.error : colors.success;
  const btnLabel = isCheckedOut ? 'Done for today' : isCheckedIn ? 'Check Out' : 'Check In';
  const btnIcon = isCheckedOut ? 'checkmark-done' : isCheckedIn ? 'log-out-outline' : 'log-in-outline';

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={{ ...Typography.bodyMedium, color: colors.textPrimary, fontWeight: '600' }}>Attendance</Text>
            <Text style={{ ...Typography.caption, color: colors.textMuted }}>{timeStr} · Today</Text>
          </View>
        </View>
        {todayStatus?.isLate && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.error + '22', borderRadius: Radius.full }}>
            <Text style={{ fontSize: 11, color: colors.error, fontWeight: '600' }}>Late {todayStatus.lateMinutes}m</Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Check In', value: todayStatus?.checkInTime ? fmtTime(todayStatus.checkInTime) : '—', icon: 'log-in-outline', color: colors.success },
          { label: 'Check Out', value: (todayStatus?.checkOutTime && todayStatus.checkOutTime > 0) ? fmtTime(todayStatus.checkOutTime) : '—', icon: 'log-out-outline', color: colors.error },
          { label: 'Hours', value: todayStatus?.totalWorkedMinutes ? `${(todayStatus.totalWorkedMinutes / 60).toFixed(1)}h` : '—', icon: 'hourglass-outline', color: colors.primary },
        ].map((item, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: colors.bgElevated, borderRadius: Radius.md, padding: 10, alignItems: 'center' }}>
            <Ionicons name={item.icon as any} size={14} color={item.color} />
            <Text style={{ ...Typography.bodyMedium, color: colors.textPrimary, fontWeight: '700', marginTop: 4 }}>{item.value}</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{item.label}</Text>
          </View>
        ))}
      </View>

      {!isCheckedOut && (
        <TouchableOpacity
          onPress={handlePress}
          disabled={loading}
          style={{ height: 46, borderRadius: Radius.md, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={isCheckedIn ? ['#ef4444', '#dc2626'] : ['#10b981', '#059669']}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name={btnIcon as any} size={18} color="#fff" />
                  <Text style={{ ...Typography.bodyMedium, color: '#fff', fontWeight: '700' }}>{btnLabel}</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>
      )}
      {isCheckedOut && (
        <View style={{ height: 40, borderRadius: Radius.md, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...Typography.captionMedium, color: colors.textMuted }}>✓ Checked out for today</Text>
        </View>
      )}
    </Card>
  );
}

// ── Employee Dashboard ────────────────────────────────────────────────────
function EmployeeDashboard({ userId, userName, bottomOffset }: { userId: string; userName: string; bottomOffset: number }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  
  const user = useQuery(api.users.getUserById, { userId: userId as Id<'users'> });
  const myLeaves = useQuery(api.leaves.getUserLeaves, { userId: userId as Id<'users'> });
  const latestRating = useQuery(api.supervisorRatings.getLatestRating, { employeeId: userId as Id<'users'> });
  const monthlyStats = useQuery(api.timeTracking.getMonthlyStats, { userId: userId as Id<'users'>, month: new Date().toISOString().slice(0, 7) });

  const onRefresh = async () => {
    setRefreshing(true);
    // Convex queries auto-refresh, just add delay for UX
    setTimeout(() => setRefreshing(false), 800);
  };

  const today = new Date();
  const leaves = myLeaves ?? [];
  const pending = leaves.filter(l => l.status === 'pending');
  const approved = leaves.filter(l => l.status === 'approved');
  const rejected = leaves.filter(l => l.status === 'rejected');

  const displayName = user?.name ?? userName ?? 'there';
  const firstName = displayName.split(' ')[0];

  return (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      contentContainerStyle={{ paddingBottom: bottomOffset + 20, gap: 16, paddingHorizontal: 16, paddingTop: 4 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >

      {/* Header */}
      <View style={[styles.headerPro, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View style={{ backgroundColor: isDark ? colors.primary + '22' : colors.bgElevated, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? colors.primary : colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>
                {user?.department ?? user?.position ?? 'Employee'}
              </Text>
            </View>
          </View>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>{getGreeting()}, {firstName}</Text>
          <Text style={[styles.subGreeting, { color: colors.textMuted }]}>{formatDate(today)}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.notifBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={toggleTheme}>
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.notifBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={() => router.push('/(tabs)/profile')}>
            <Ionicons name="person-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero leave balance */}
      <LinearGradient colors={isDark ? ['#0f172a', '#1e293b', colors.primary] : [colors.primaryDark, colors.primary, colors.primaryLight]} style={[styles.heroCard, { shadowColor: colors.primary }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.heroLabel}>PAID LEAVE BALANCE</Text>
        <Text style={styles.heroValue}>{user?.paidLeaveBalance ?? 0} days</Text>
        <Text style={styles.heroSub}>remaining this year</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.md, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{user?.sickLeaveBalance ?? 0}</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Sick Leave</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.md, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{user?.familyLeaveBalance ?? 0}</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Family Leave</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/leaves')}
            style={{ flex: 1.2, backgroundColor: '#fff', borderRadius: Radius.md, padding: 10, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '700', marginTop: 2 }}>Request</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Check-In Widget */}
      <SectionHeader title="Attendance" icon="time-outline" />
      <CheckInOutWidget userId={userId} />

      {/* Monthly attendance stats */}
      {monthlyStats && (
        <>
          <SectionHeader title="This Month" icon="calendar-outline" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { label: 'Days\nWorked', value: String(monthlyStats.totalDays), color: colors.primary },
              { label: 'Total\nHours', value: `${Number(monthlyStats.totalWorkedHours ?? 0).toFixed(1)}h`, color: '#10b981' },
              { label: 'Punctuality', value: `${monthlyStats.punctualityRate}%`, color: colors.primary },
              { label: 'Late\nDays', value: String(monthlyStats.lateDays), color: Number(monthlyStats.lateDays) > 0 ? colors.error : colors.success },
            ].map((s, i) => (
              <View key={i} style={[styles.miniStatCard, { borderColor: s.color + '44', backgroundColor: colors.bgCard }]}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: s.color }}>{s.value}</Text>
                <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 3, textAlign: 'center', lineHeight: 13 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Leave quick stats */}
      <SectionHeader title="My Leaves" icon="umbrella-outline" onSeeAll={() => router.push('/(tabs)/leaves')} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { label: 'Pending', value: pending.length, color: colors.warning, icon: 'time' },
          { label: 'Approved', value: approved.length, color: colors.success, icon: 'checkmark-circle' },
          { label: 'Rejected', value: rejected.length, color: colors.error, icon: 'close-circle' },
        ].map((s, i) => (
          <TouchableOpacity key={i} style={[styles.leaveStatCard, { borderColor: s.color + '44', backgroundColor: colors.bgCard }]} onPress={() => router.push('/(tabs)/leaves')}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: s.color + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Ionicons name={s.icon as any} size={18} color={s.color} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: s.color }}>{s.value}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent leave requests */}
      {leaves.length > 0 && (
        <Card>
          {leaves.slice(0, 5).map((l, i) => {
            const statusColorMap: Record<LeaveStatus, string> = { approved: colors.success, pending: colors.warning, rejected: colors.error };
            const sc = statusColorMap[l.status as LeaveStatus] ?? colors.textMuted;
            const si = STATUS_ICONS[l.status as LeaveStatus] ?? 'help-circle';
            const tc = LEAVE_TYPE_COLORS[l.type as LeaveType] ?? colors.primary;
            const label = LEAVE_TYPE_LABELS[l.type as LeaveType] ?? l.type;
            return (
              <View key={l._id} style={[styles.leaveRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={[styles.leaveColorDot, { backgroundColor: tc }]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...Typography.bodyMedium, color: colors.textPrimary, fontWeight: '600' }}>{label}</Text>
                  <Text style={{ ...Typography.caption, color: colors.textMuted, marginTop: 1 }}>
                    {formatShortDate(l.startDate)}{l.endDate !== l.startDate ? ` – ${formatShortDate(l.endDate)}` : ''} · {l.days}d
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: sc + '22', borderRadius: Radius.full }}>
                  <Ionicons name={si as any} size={11} color={sc} />
                  <Text style={{ fontSize: 11, color: sc, fontWeight: '600' }}>{l.status.charAt(0).toUpperCase() + l.status.slice(1)}</Text>
                </View>
              </View>
            );
          })}
          {leaves.length === 0 && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ ...Typography.caption, color: colors.textMuted }}>No leave requests yet</Text>
            </View>
          )}
        </Card>
      )}

      {/* Performance Rating */}
      {latestRating && (
        <>
          <SectionHeader title="My Performance" icon="star-outline" />
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View>
                <Text style={{ ...Typography.bodyMedium, color: colors.textPrimary, fontWeight: '600' }}>Overall Score</Text>
                <Text style={{ ...Typography.caption, color: colors.textMuted, marginTop: 2 }}>
                  by {(latestRating as any).supervisor?.name ?? 'Supervisor'} · {latestRating.ratingPeriod}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary }}>{latestRating.overallRating.toFixed(1)}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>/5.0</Text>
              </View>
            </View>
            {[
              { label: 'Quality of Work', value: latestRating.qualityOfWork },
              { label: 'Efficiency',       value: latestRating.efficiency },
              { label: 'Teamwork',         value: latestRating.teamwork },
              { label: 'Initiative',       value: latestRating.initiative },
              { label: 'Communication',    value: latestRating.communication },
              { label: 'Reliability',      value: latestRating.reliability },
            ].map(({ label, value }) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ ...Typography.caption, color: colors.textMuted, width: 130 }}>{label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <StarRating value={value} />
                  <Text style={{ ...Typography.captionMedium, color: colors.textPrimary, width: 16, textAlign: 'right' }}>{value}</Text>
                </View>
              </View>
            ))}
            {latestRating.strengths && (
              <View style={{ marginTop: 10, padding: 10, backgroundColor: colors.success + '15', borderRadius: Radius.md }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.success, marginBottom: 3 }}>💪 Strengths</Text>
                <Text style={{ ...Typography.caption, color: colors.success }}>{latestRating.strengths}</Text>
              </View>
            )}
            {latestRating.areasForImprovement && (
              <View style={{ marginTop: 8, padding: 10, backgroundColor: colors.warning + '15', borderRadius: Radius.md }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.warning, marginBottom: 3 }}>📈 Improve</Text>
                <Text style={{ ...Typography.caption, color: colors.warning }}>{latestRating.areasForImprovement}</Text>
              </View>
            )}
          </Card>
        </>
      )}
      {latestRating === null && (
        <Card style={{ alignItems: 'center', padding: 24 }}>
          <Ionicons name="star-outline" size={36} color={colors.textMuted} />
          <Text style={{ ...Typography.caption, color: colors.textMuted, marginTop: 8 }}>No performance rating yet</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>Your supervisor will rate your performance</Text>
        </Card>
      )}

      {/* More Features */}
      <SectionHeader title="More Features" icon="apps-outline" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { icon: 'checkbox-outline', label: 'Tasks', subtitle: 'My assignments', color: '#06b6d4', onPress: () => router.push('/(tabs)/tasks') },
          { icon: 'time-outline', label: 'Attendance', subtitle: 'Track time', color: '#10b981', onPress: () => router.push('/(tabs)/attendance') },
          { icon: 'bar-chart-outline', label: 'Analytics', subtitle: 'My stats', color: colors.primary, onPress: () => router.push('/(tabs)/analytics') },
        ].map((a, i) => (
          <TouchableOpacity key={i} style={{ flex: 1, backgroundColor: colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, alignItems: 'center', gap: 6 }} onPress={a.onPress}>
            <LinearGradient colors={[`${a.color}33`, `${a.color}11`]} style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={a.icon as any} size={24} color={a.color} />
            </LinearGradient>
            <Text style={{ ...Typography.bodyMedium, color: colors.textPrimary, fontWeight: '600', textAlign: 'center' }}>{a.label}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center' }}>{a.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick actions */}
      <SectionHeader title="Quick Actions" icon="flash-outline" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[
          { icon: 'document-text-outline', label: 'Apply Leave',  color: colors.primary,  onPress: () => router.push('/(tabs)/leaves') },
          { icon: 'people-outline',         label: 'Team View',    color: '#06b6d4',       onPress: () => router.push('/(tabs)/team') },
          { icon: 'calendar-outline',        label: 'Calendar',     color: colors.success,  onPress: () => router.push('/(tabs)/calendar') },
          { icon: 'person-outline',         label: 'My Profile',   color: colors.primary,     onPress: () => router.push('/(tabs)/profile') },
        ].map((a, i) => (
          <TouchableOpacity key={i} style={styles.quickAction} onPress={a.onPress}>
            <LinearGradient colors={[`${a.color}33`, `${a.color}11`]} style={styles.quickIconWrap}>
              <Ionicons name={a.icon as any} size={22} color={a.color} />
            </LinearGradient>
            <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

    </ScrollView>
  );
}

// ── Stats Detail Modal ────────────────────────────────────────────────────
type StatModalType = 'employees' | 'pending' | 'approved' | 'onleave' | null;

function StatsDetailModal({
  visible, type, allLeaves, allUsers, colors, isDark, onClose,
}: {
  visible: boolean; type: StatModalType;
  allLeaves: any[]; allUsers: any[];
  colors: any; isDark: boolean; onClose: () => void;
}) {
  if (!type) return null;
  const today = new Date().toISOString().split('T')[0];
  const month = new Date().toISOString().slice(0, 7);

  const config: Record<NonNullable<StatModalType>, { title: string; icon: string; color: string; items: any[]; renderItem: (item: any, i: number) => React.ReactNode }> = {
    employees: {
      title: 'All Employees',
      icon: 'people-outline',
      color: colors.primary,
      items: allUsers,
      renderItem: (u: any, i: number) => (
        <View key={u._id ?? i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>
              {(u.name ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{u.name ?? 'Unknown'}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{u.department ?? ''}{u.position ? ` · ${u.position}` : ''}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: (u.role === 'admin' ? colors.warning : u.role === 'supervisor' ? colors.success : colors.primary) + '22' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: u.role === 'admin' ? colors.warning : u.role === 'supervisor' ? colors.success : colors.primary }}>
                {u.role ?? 'employee'}
              </Text>
            </View>
          </View>
        </View>
      ),
    },
    pending: {
      title: 'Pending Requests',
      icon: 'time-outline',
      color: colors.warning,
      items: allLeaves.filter(l => l.status === 'pending'),
      renderItem: (l: any, i: number) => (
        <View key={l._id ?? i} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{l.userName ?? 'Unknown'}</Text>
            <View style={{ backgroundColor: colors.warning + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.warning }}>⏳ Pending</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>📋 {LEAVE_TYPE_LABELS[l.type as LeaveType] ?? l.type}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>📅 {formatShortDate(l.startDate)} → {formatShortDate(l.endDate)}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>⏱ {l.days}d</Text>
          </View>
          {l.reason ? <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' }}>"{l.reason}"</Text> : null}
          {l.userDepartment ? <Text style={{ fontSize: 11, color: colors.primary, marginTop: 2 }}>{l.userDepartment}</Text> : null}
        </View>
      ),
    },
    approved: {
      title: 'Approved This Month',
      icon: 'checkmark-circle-outline',
      color: colors.success,
      items: allLeaves.filter(l => l.status === 'approved' && l.startDate.startsWith(month)),
      renderItem: (l: any, i: number) => (
        <View key={l._id ?? i} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{l.userName ?? 'Unknown'}</Text>
            <View style={{ backgroundColor: colors.success + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.success }}>✅ Approved</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>📋 {LEAVE_TYPE_LABELS[l.type as LeaveType] ?? l.type}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>📅 {formatShortDate(l.startDate)} → {formatShortDate(l.endDate)}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>⏱ {l.days}d</Text>
          </View>
          {l.userDepartment ? <Text style={{ fontSize: 11, color: colors.primary, marginTop: 4 }}>{l.userDepartment}</Text> : null}
        </View>
      ),
    },
    onleave: {
      title: 'On Leave Today',
      icon: 'walk-outline',
      color: colors.primary,
      items: allLeaves.filter(l => l.status === 'approved' && l.startDate <= today && l.endDate >= today),
      renderItem: (l: any, i: number) => (
        <View key={l._id ?? i} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: LEAVE_TYPE_COLORS[l.type as LeaveType] + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>
                {l.type === 'paid' ? '🏖️' : l.type === 'sick' ? '🤒' : l.type === 'family' ? '👨‍👩‍👧' : l.type === 'doctor' ? '🏥' : '💼'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{l.userName ?? 'Unknown'}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {LEAVE_TYPE_LABELS[l.type as LeaveType] ?? l.type} · returns {formatShortDate(l.endDate)}
              </Text>
              {l.userDepartment ? <Text style={{ fontSize: 11, color: colors.primary, marginTop: 1 }}>{l.userDepartment}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{l.days}d</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>total</Text>
            </View>
          </View>
        </View>
      ),
    },
  };

  const cfg = config[type];

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', overflow: 'hidden' }}>
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: cfg.color + '22', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>{cfg.title}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>{cfg.items.length} {cfg.items.length === 1 ? 'record' : 'records'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {/* Content */}
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {cfg.items.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>🎉</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' }}>No records found</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center' }}>Nothing to show here right now</Text>
              </View>
            ) : (
              cfg.items.map((item, i) => cfg.renderItem(item, i))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────────────────
function AdminDashboard({ userId, userName, bottomOffset }: { userId: string; userName: string; bottomOffset: number }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  
  const allLeaves = useQuery(api.leaves.getAllLeaves, userId ? { requesterId: userId as any } : 'skip');
  const allUsers = useQuery(api.users.getAllUsers, userId ? { requesterId: userId as any } : 'skip');
  const leaveStats = useQuery(api.leaves.getLeaveStats, userId ? { requesterId: userId as any } : 'skip');

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const firstName = userName.split(' ')[0] || 'Admin';

  const totalEmployees = allUsers?.length ?? 0;
  const pendingCount = allLeaves?.filter(l => l.status === 'pending').length ?? 0;
  const onLeaveNow = allLeaves?.filter(l => l.status === 'approved' && l.startDate <= todayStr && l.endDate >= todayStr).length ?? 0;
  const approvedThisMonth = allLeaves?.filter(l => l.status === 'approved' && l.startDate.startsWith(today.toISOString().slice(0, 7))).length ?? 0;

  const recentLeaves = (allLeaves ?? []).slice(0, 6);

  // Monthly trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months: Record<string, { month: string; approved: number; pending: number; rejected: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months[getMonthKey(d)] = { month: getMonthLabel(d), approved: 0, pending: 0, rejected: 0 };
    }
    (allLeaves ?? []).forEach(l => {
      const key = l.startDate.slice(0, 7);
      if (months[key]) months[key][l.status as 'approved' | 'pending' | 'rejected']++;
    });
    return Object.values(months);
  }, [allLeaves]);

  // Leave distribution pie
  const pieData = useMemo(() => {
    return (Object.keys(LEAVE_TYPE_COLORS) as LeaveType[]).map(k => ({
      name: LEAVE_TYPE_LABELS[k],
      value: (allLeaves ?? []).filter(l => l.type === k).length,
      color: LEAVE_TYPE_COLORS[k],
    })).filter(d => d.value > 0);
  }, [allLeaves]);

  const isLoading = allLeaves === undefined || allUsers === undefined;
  const [statModal, setStatModal] = useState<StatModalType>(null);

  // Debug: log data status
  useEffect(() => {
    if (!isLoading) {
      console.log('[Dashboard] Data loaded:', {
        leavesCount: allLeaves?.length ?? 0,
        usersCount: allUsers?.length ?? 0,
        monthlyTrendPoints: monthlyTrend.length,
        pieDataItems: pieData.length,
      });
    }
  }, [isLoading, allLeaves, allUsers, monthlyTrend, pieData]);

  return (
    <>
    <StatsDetailModal
      visible={!!statModal}
      type={statModal}
      allLeaves={allLeaves ?? []}
      allUsers={allUsers ?? []}
      colors={colors}
      isDark={isDark}
      onClose={() => setStatModal(null)}
    />
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      contentContainerStyle={{ paddingBottom: bottomOffset + 20, gap: 16, paddingHorizontal: 16, paddingTop: 4 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >

      {/* Header */}
      <View style={[styles.headerPro, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View style={{ backgroundColor: isDark ? colors.primary + '22' : colors.bgElevated, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? colors.primary : colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>Admin Panel</Text>
            </View>
            {pendingCount > 0 && (
              <View style={{ backgroundColor: colors.error + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.error, letterSpacing: 0.5 }}>{pendingCount} pending</Text>
              </View>
            )}
          </View>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>{getGreeting()}, {firstName}</Text>
          <Text style={[styles.subGreeting, { color: colors.textMuted }]}>{formatDate(today)}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.notifBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={toggleTheme}>
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.notifBtn, { backgroundColor: colors.bgCard, borderColor: colors.border, position: 'relative' }]} onPress={() => router.push('/(tabs)/leaves')}>
            <Ionicons name="document-text-outline" size={20} color={colors.textPrimary} />
            {pendingCount > 0 && <View style={[styles.notifDot, { backgroundColor: colors.error, borderColor: colors.bg }]} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats grid - Compact & Responsive */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[
          { label: 'Total Employees', value: isLoading ? '—' : String(totalEmployees), icon: 'people-outline',           color: colors.primary,  modal: 'employees' as StatModalType },
          { label: 'Pending',         value: isLoading ? '—' : String(pendingCount),    icon: 'time-outline',             color: colors.warning,  modal: 'pending'   as StatModalType },
          { label: 'Approved/Month',  value: isLoading ? '—' : String(approvedThisMonth), icon: 'checkmark-circle-outline', color: colors.success,  modal: 'approved'  as StatModalType },
          { label: 'On Leave Now',    value: isLoading ? '—' : String(onLeaveNow),      icon: 'walk-outline',             color: colors.primary,     modal: 'onleave'   as StatModalType },
        ].map((s, i) => {
          const cardWidth = width < 380 ? (width - 40) / 2 : (width - 44) / 2;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => !isLoading && setStatModal(s.modal)}
              activeOpacity={0.7}
              style={[
                styles.statCardCompact,
                {
                  width: cardWidth,
                  backgroundColor: colors.bgCard,
                  borderColor: colors.border,
                }
              ]}
            >
              <LinearGradient
                colors={[`${s.color}08`, `${s.color}00`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: s.color + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={s.icon as any} size={16} color={s.color} />
                </View>
                <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />
              </View>
              
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '500' }} numberOfLines={1}>{s.label}</Text>
              
              {/* Subtle bottom accent */}
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: s.color, opacity: 0.3, borderBottomLeftRadius: Radius.lg, borderBottomRightRadius: Radius.lg }} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Monthly Trend Chart */}
      <SectionHeader title="Monthly Leave Trend" icon="trending-up-outline" />
      <Card>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          {[
            { label: 'Approved', color: colors.success },
            { label: 'Pending',  color: colors.warning },
            { label: 'Rejected', color: colors.error },
          ].map((l, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: l.color }} />
              <Text style={{ fontSize: 10, color: colors.textMuted }}>{l.label}</Text>
            </View>
          ))}
        </View>
        {isLoading
          ? <ActivityIndicator color={colors.primary} />
          : <MiniBarChart data={monthlyTrend} />
        }
      </Card>

      {/* Leave Distribution */}
      <SectionHeader title="Leave Distribution" icon="pie-chart-outline" />
      <Card>
        {isLoading
          ? <ActivityIndicator color={colors.primary} />
          : pieData.length > 0
            ? <PieLegend data={pieData} />
            : <Text style={{ ...Typography.caption, color: colors.textMuted, textAlign: 'center', padding: 16 }}>No data yet</Text>
        }
      </Card>

      {/* Recent Requests */}
      <SectionHeader title="Recent Leave Requests" icon="list-outline" onSeeAll={() => router.push('/(tabs)/leaves')} />
      <Card style={{ padding: 0 }}>
        {isLoading ? (
          <View style={{ padding: 20, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>
        ) : recentLeaves.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ ...Typography.caption, color: colors.textMuted }}>No leave requests yet</Text>
          </View>
        ) : recentLeaves.map((l, i) => {
          const statusColorMap: Record<LeaveStatus, string> = { approved: colors.success, pending: colors.warning, rejected: colors.error };
          const sc = statusColorMap[l.status as LeaveStatus] ?? colors.textMuted;
          const si = STATUS_ICONS[l.status as LeaveStatus] ?? 'help-circle';
          const tc = LEAVE_TYPE_COLORS[l.type as LeaveType] ?? colors.primary;
          const label = LEAVE_TYPE_LABELS[l.type as LeaveType] ?? l.type;
          return (
            <View key={l._id} style={[styles.recentRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={[styles.leaveColorDot, { backgroundColor: tc, marginLeft: 0, marginRight: 10 }]} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...Typography.bodyMedium, color: colors.textPrimary, fontWeight: '600' }} numberOfLines={1}>
                  {(l as any).userName ?? 'Unknown'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                  {label} · {formatShortDate(l.startDate)}{l.endDate !== l.startDate ? ` – ${formatShortDate(l.endDate)}` : ''} · {l.days}d
                </Text>
                {(l as any).userDepartment ? (
                  <Text style={{ fontSize: 10, color: colors.primary, marginTop: 1 }}>{(l as any).userDepartment}</Text>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: sc + '22', borderRadius: Radius.full }}>
                <Ionicons name={si as any} size={11} color={sc} />
                <Text style={{ fontSize: 11, color: sc, fontWeight: '600' }}>{l.status.charAt(0).toUpperCase() + l.status.slice(1)}</Text>
              </View>
            </View>
          );
        })}
      </Card>

      {/* More Features */}
      <SectionHeader title="More Features" icon="apps-outline" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { icon: 'checkbox-outline', label: 'Tasks', subtitle: 'Manage tasks', color: '#06b6d4', onPress: () => router.push('/(tabs)/tasks') },
          { icon: 'time-outline', label: 'Attendance', subtitle: 'Track time', color: colors.success, onPress: () => router.push('/(tabs)/attendance') },
          { icon: 'bar-chart-outline', label: 'Analytics', subtitle: 'View stats', color: colors.primary, onPress: () => router.push('/(tabs)/analytics') },
        ].map((a, i) => (
          <TouchableOpacity key={i} style={{ flex: 1, backgroundColor: colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, alignItems: 'center', gap: 6 }} onPress={a.onPress}>
            <LinearGradient colors={[`${a.color}33`, `${a.color}11`]} style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={a.icon as any} size={24} color={a.color} />
            </LinearGradient>
            <Text style={{ ...Typography.bodyMedium, color: colors.textPrimary, fontWeight: '600', textAlign: 'center' }}>{a.label}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center' }}>{a.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions */}
      <SectionHeader title="Quick Actions" icon="flash-outline" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { icon: 'calendar-outline',  label: 'Leave\nRequests', color: colors.primary, onPress: () => router.push('/(tabs)/leaves') },
          { icon: 'people-outline',    label: 'Team\nView',     color: colors.success,  onPress: () => router.push('/(tabs)/team') },
          { icon: 'calendar-outline',  label: 'Calendar',       color: colors.primary,     onPress: () => router.push('/(tabs)/calendar') },
        ].map((a, i) => (
          <TouchableOpacity key={i} style={[styles.quickAction, { flex: 1, marginRight: 0 }]} onPress={a.onPress}>
            <LinearGradient colors={[`${a.color}33`, `${a.color}11`]} style={[styles.quickIconWrap, { width: '100%', height: 60 }]}>
              <Ionicons name={a.icon as any} size={22} color={a.color} />
            </LinearGradient>
            <Text style={[styles.quickLabel, { color: colors.textSecondary, textAlign: 'center' }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

    </ScrollView>
    </>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom;

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<string>('employee');

  useEffect(() => {
    AsyncStorage.multiGet(['user_id', 'user_name', 'user_role']).then(pairs => {
      setUserId(pairs[0][1]);
      setUserName(pairs[1][1] ?? '');
      setUserRole(pairs[2][1] ?? 'employee');
    });
  }, []);

  const isAdmin = userRole === 'admin' || userRole === 'supervisor';

  if (!userId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {isAdmin
        ? <AdminDashboard userId={userId!} userName={userName} bottomOffset={bottomOffset} />
        : <EmployeeDashboard userId={userId} userName={userName} bottomOffset={bottomOffset} />
      }
    </SafeAreaView>
  );
}

// ── Static Styles (layout only — no colors) ───────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, paddingBottom: 4,
  },
  headerPro: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingTop: 12, paddingBottom: 14,
    borderBottomWidth: 1, marginBottom: 4,
  },
  greeting: { ...Typography.h2 },
  subGreeting: { ...Typography.caption, marginTop: 2 },
  notifBtn: {
    width: 40, height: 40, borderRadius: Radius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute', top: 8, right: 8, width: 8, height: 8,
    borderRadius: 4, borderWidth: 2,
  },

  heroCard: {
    borderRadius: Radius.xl, padding: 24, marginTop: 4,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4, shadowRadius: 24, elevation: 10,
  },
  heroLabel: { ...Typography.label, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  heroValue: { fontSize: 44, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  heroSub: { ...Typography.body, color: 'rgba(255,255,255,0.7)' },

  card: {
    borderRadius: Radius.lg, borderWidth: 1, padding: 16,
  },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  sectionTitle: { ...Typography.h3 },
  seeAll: { ...Typography.captionMedium },

  statCard: {
    borderRadius: Radius.lg, borderWidth: 1, padding: 16,
  },
  statCardCompact: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 12,
    position: 'relative',
    overflow: 'hidden',
  },

  miniStatCard: {
    flex: 1, borderRadius: Radius.md,
    borderWidth: 1, padding: 12, alignItems: 'center',
  },

  leaveStatCard: {
    flex: 1, borderRadius: Radius.lg,
    borderWidth: 1, padding: 16, alignItems: 'center',
  },

  leaveRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  leaveColorDot: { width: 4, height: 36, borderRadius: 2, marginLeft: -4 },

  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },

  quickAction: { alignItems: 'center', marginRight: 12, width: 76 },
  quickIconWrap: {
    width: 60, height: 60, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  quickLabel: { fontSize: 11, textAlign: 'center', lineHeight: 15 },
});



