import { useState, useEffect, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LeaveType = 'paid' | 'sick' | 'family' | 'doctor' | 'unpaid';
type LeaveStatus = 'pending' | 'approved' | 'rejected';

const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  paid: colors.primary,
  sick: '#ef4444',
  family: '#10b981',
  doctor: '#06b6d4',
  unpaid: '#f59e0b',
};

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  paid: 'Paid Vacation',
  sick: 'Sick Leave',
  family: 'Family Leave',
  doctor: 'Doctor Visit',
  unpaid: 'Unpaid Leave',
};

// Helper: Get days in month as calendar grid (6 rows × 7 cols)
function getDaysInMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const days: Date[] = [];
  const current = new Date(startDate);

  for (let i = 0; i < 42; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

// Helper: Format date to YYYY-MM-DD
function dateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Check if a leave includes a specific date
function dateInRange(leaveStart: string, leaveEnd: string, checkDate: string): boolean {
  return checkDate >= leaveStart && checkDate <= leaveEnd;
}

// Helper: Get leaves for a specific day
function getLeavesForDay(leaves: any[], date: Date): any[] {
  const dateStr = dateToString(date);
  return leaves.filter(l => {
    if (l.status === 'rejected') return false;
    return dateInRange(l.startDate, l.endDate, dateStr);
  });
}

// Helper: Format "February 2026"
function formatMonthYear(date: Date): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

// Helper: Get initials from name
function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function Calendar() {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 108 : 88;

  // Auth
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('employee');

  useEffect(() => {
    AsyncStorage.getItem('user_id').then(id => setUserId(id));
    AsyncStorage.getItem('user_role').then(role => setUserRole(role ?? 'employee'));
  }, []);

  // Queries
  const allLeaves = useQuery(api.leaves.getAllLeaves, userId ? { requesterId: userId as any } : 'skip');

  // State
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const today = useMemo(() => {
    const t = new Date();
    return dateToString(t);
  }, []);

  const daysInMonth = useMemo(() => getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);

  const leavesData = useMemo(() => allLeaves ?? [], [allLeaves]);

  const selectedDateLeaves = useMemo(() => {
    if (!selectedDate) return [];
    return getLeavesForDay(leavesData, selectedDate);
  }, [selectedDate, leavesData]);

  const todayLeaves = useMemo(() => {
    const t = new Date();
    return getLeavesForDay(leavesData, t).filter(l => l.status === 'approved');
  }, [leavesData]);

  const monthlySummary = useMemo(() => {
    const summary: Record<LeaveType, number> = {
      paid: 0,
      sick: 0,
      family: 0,
      doctor: 0,
      unpaid: 0,
    };

    leavesData.forEach(leave => {
      if (leave.status === 'rejected') return;
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const current = new Date(start);

      while (current <= end) {
        const month = current.getMonth();
        if (month === currentDate.getMonth() && current.getFullYear() === currentDate.getFullYear()) {
          summary[leave.type as LeaveType]++;
        }
        current.setDate(current.getDate() + 1);
      }
    });

    return summary;
  }, [leavesData, currentDate]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const isLoading = allLeaves === undefined;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Calendar</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={goToPreviousMonth} style={[styles.navBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <Text style={[styles.monthYearText, { color: colors.textPrimary }]}>{formatMonthYear(currentDate)}</Text>

            <TouchableOpacity onPress={goToNextMonth} style={[styles.navBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity onPress={goToToday} style={[styles.todayBtn, { backgroundColor: colors.primary + '22', borderColor: colors.primary }]}>
              <Text style={[styles.todayBtnText, { color: colors.primary }]}>Today</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={toggleTheme} style={[styles.iconBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Weekday Headers */}
          <View style={styles.weekdayRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <View key={day} style={styles.weekdayCell}>
                <Text style={[styles.weekdayText, { color: colors.textMuted }]}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {daysInMonth.map((date, idx) => {
              const dateStr = dateToString(date);
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const isToday = dateStr === today;
              const isSelected = selectedDate && dateToString(selectedDate) === dateStr;
              const leavesForDay = getLeavesForDay(leavesData, date);

              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setSelectedDate(isSelected ? null : date)}
                  style={[
                    styles.dayCell,
                    { backgroundColor: colors.bgCard, borderColor: colors.border },
                    !isCurrentMonth && { backgroundColor: colors.bg, borderColor: colors.border + '44' },
                    isToday && { borderColor: colors.primary, borderWidth: 2 },
                    isSelected && { backgroundColor: colors.primary + '15', borderColor: colors.primary, borderWidth: 2 },
                  ]}
                >
                  {/* Day number */}
                  <Text
                    style={[
                      styles.dayNumber,
                      { color: colors.textPrimary },
                      !isCurrentMonth && { color: colors.textMuted },
                      isToday && { color: colors.primary },
                    ]}
                  >
                    {date.getDate()}
                  </Text>

                  {/* Leave pills (max 2) */}
                  <View style={styles.leavePills}>
                    {leavesForDay.slice(0, 2).map((leave, i) => (
                      <View
                        key={i}
                        style={[
                          styles.leavePill,
                          { backgroundColor: LEAVE_TYPE_COLORS[leave.type as LeaveType] },
                          leave.status === 'pending' ? { opacity: 0.6 } : undefined,
                        ]}
                      />
                    ))}
                    {leavesForDay.length > 2 && (
                      <Text style={[styles.moreLeaves, { color: colors.textMuted }]}>+{leavesForDay.length - 2}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected Day Panel */}
          {selectedDate && (
            <View style={[styles.selectedDayPanel, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={styles.panelHeader}>
                <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <TouchableOpacity onPress={() => setSelectedDate(null)}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {selectedDateLeaves.length === 0 ? (
                <Text style={[styles.noLeavesText, { color: colors.textMuted }]}>No leaves scheduled</Text>
              ) : (
                <View style={styles.leavesList}>
                  {selectedDateLeaves.map((leave, idx) => (
                    <View key={idx} style={styles.leaveItem}>
                      <View
                        style={[
                          styles.leaveDot,
                          { backgroundColor: LEAVE_TYPE_COLORS[leave.type as LeaveType] },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.leaveItemName, { color: colors.textPrimary }]}>{leave.userName}</Text>
                        <Text style={[styles.leaveItemType, { color: colors.textSecondary }]}>
                          {LEAVE_TYPE_LABELS[leave.type as LeaveType]}
                        </Text>
                        <Text style={[styles.leaveItemDates, { color: colors.textMuted }]}>
                          {leave.startDate}
                          {leave.endDate !== leave.startDate ? ` → ${leave.endDate}` : ''}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              leave.status === 'approved'
                                ? colors.success + '22'
                                : colors.warning + '22',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color:
                                leave.status === 'approved'
                                  ? colors.success
                                  : colors.warning,
                            },
                          ]}
                        >
                          {leave.status === 'approved' ? '✓' : '⏱'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* On Leave Today Section */}
          {todayLeaves.length > 0 && (
            <View style={styles.onLeaveTodaySection}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>On Leave Today</Text>
              <View style={styles.onLeaveList}>
                {todayLeaves.map((leave, idx) => (
                  <View key={idx} style={[styles.onLeaveItem, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                    <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '22' }]}>
                      <Text style={[styles.avatarText, { color: colors.primary }]}>{getInitials(leave.userName)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.onLeaveName, { color: colors.textPrimary }]}>{leave.userName}</Text>
                      <Text style={[styles.onLeaveDept, { color: colors.textMuted }]}>{leave.userDepartment}</Text>
                    </View>
                    <View
                      style={[
                        styles.leaveTypeChip,
                        {
                          backgroundColor:
                            LEAVE_TYPE_COLORS[leave.type as LeaveType] + '22',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.leaveTypeChipText,
                          {
                            color: LEAVE_TYPE_COLORS[leave.type as LeaveType],
                          },
                        ]}
                      >
                        {LEAVE_TYPE_LABELS[leave.type as LeaveType]}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Monthly Summary */}
          <View style={styles.summarySection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Monthly Summary</Text>
            <View style={styles.summaryGrid}>
              {Object.entries(monthlySummary).map(([type, count]) => (
                <View
                  key={type}
                  style={[
                    styles.summaryCard,
                    { backgroundColor: colors.bgCard, borderColor: LEAVE_TYPE_COLORS[type as LeaveType] + '44' },
                  ]}
                >
                  <View
                    style={[
                      styles.summaryDot,
                      {
                        backgroundColor: LEAVE_TYPE_COLORS[type as LeaveType],
                      },
                    ]}
                  />
                  <View>
                    <Text style={[styles.summaryType, { color: colors.textSecondary }]}>
                      {LEAVE_TYPE_LABELS[type as LeaveType]}
                    </Text>
                    <Text
                      style={[
                        styles.summaryCount,
                        { color: LEAVE_TYPE_COLORS[type as LeaveType] },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  title: {
    ...Typography.h1,
  },

  // Loading
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Month Navigation
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearText: {
    flex: 1,
    ...Typography.h2,
    textAlign: 'center',
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  todayBtnText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Weekday Headers
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 0,
  },
  weekdayCell: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayText: {
    ...Typography.captionMedium,
    fontWeight: '600',
  },

  // Calendar Grid
  calendarGrid: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  dayCell: {
    width: '14.285714%',
    aspectRatio: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dayCellOtherMonth: {
    borderWidth: 1,
  },
  dayCellToday: {
    borderWidth: 2,
  },
  dayCellSelected: {
    borderWidth: 2,
  },
  dayNumber: {
    ...Typography.caption,
    fontWeight: '600',
    marginBottom: 2,
  },
  dayNumberOtherMonth: {
  },
  dayNumberToday: {
  },
  leavePills: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
    marginTop: 2,
  },
  leavePill: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreLeaves: {
    ...Typography.caption,
    fontSize: 9,
  },

  // Selected Day Panel
  selectedDayPanel: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  panelTitle: {
    ...Typography.h3,
  },
  noLeavesText: {
    ...Typography.body,
    textAlign: 'center',
    paddingVertical: 12,
  },
  leavesList: {
    gap: 12,
  },
  leaveItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  leaveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    flexShrink: 0,
  },
  leaveItemName: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  leaveItemType: {
    ...Typography.caption,
    marginTop: 2,
  },
  leaveItemDates: {
    ...Typography.caption,
    marginTop: 1,
    fontSize: 12,
  },
  statusBadge: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statusBadgeText: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 14,
  },

  // On Leave Today Section
  onLeaveTodaySection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: 12,
  },
  onLeaveList: {
    gap: 10,
  },
  onLeaveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    ...Typography.label,
    fontWeight: '700',
  },
  onLeaveName: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  onLeaveDept: {
    ...Typography.caption,
    marginTop: 2,
  },
  leaveTypeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  leaveTypeChipText: {
    ...Typography.label,
    fontWeight: '600',
    fontSize: 11,
  },

  // Monthly Summary
  summarySection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  summaryGrid: {
    gap: 10,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
  },
  summaryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  summaryType: {
    ...Typography.body,
  },
  summaryCount: {
    ...Typography.h3,
    fontWeight: '700',
    marginTop: 2,
  },
});

