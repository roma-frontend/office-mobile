import { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, Modal, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TodayStatus = {
  status: 'checked_in' | 'checked_out' | null;
  checkInTime: number;
  checkOutTime: number;
  totalWorkedMinutes: number;
  isLate: boolean;
  lateMinutes: number;
  isEarlyLeave: boolean;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
};

type MonthlyStats = {
  totalDays: number;
  totalWorkedHours: number;
  punctualityRate: number;
  lateDays: number;
  earlyLeaveDays: number;
  totalOvertimeHours: number;
};

type AttendanceRecord = {
  _id: Id<'timeTracking'>;
  date: string;
  checkInTime: number;
  checkOutTime: number;
  totalWorkedMinutes: number;
  isLate: boolean;
  isEarlyLeave: boolean;
  overtimeMinutes: number;
  status: string;
};

type SupervisorRating = {
  qualityOfWork: number;
  efficiency: number;
  teamwork: number;
  initiative: number;
  communication: number;
  reliability: number;
  overallRating: number;
  strengths: string;
  areasForImprovement: string;
};

type User = {
  _id: Id<'users'>;
  name: string;
  email: string;
  role: string;
};

// Live Clock Component
function LiveClock() {
  const { colors } = useTheme();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.clockContainer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Text style={[styles.clockText, { color: colors.textPrimary }]}>{time}</Text>
    </View>
  );
}

// Supervisor Rating Modal Component
interface SupervisorRatingModalProps {
  visible: boolean;
  employee: User | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

function SupervisorRatingModal({ visible, employee, onClose, onSubmit, isLoading }: SupervisorRatingModalProps) {
  const { colors } = useTheme();
  const [ratings, setRatings] = useState({ qualityOfWork: 0, efficiency: 0, teamwork: 0, initiative: 0, communication: 0, reliability: 0 });
  const [strengths, setStrengths] = useState('');
  const [areasForImprovement, setAreasForImprovement] = useState('');

  const handleSubmit = () => {
    if (Object.values(ratings).some(r => r === 0)) {
      Alert.alert('Error', 'Please rate all categories');
      return;
    }
    if (!employee) return;
    onSubmit({ ...ratings, strengths, areasForImprovement, employeeId: employee._id });
    setRatings({ qualityOfWork: 0, efficiency: 0, teamwork: 0, initiative: 0, communication: 0, reliability: 0 });
    setStrengths('');
    setAreasForImprovement('');
  };

  const StarRow = ({ label, value, onChange }: { label: string; value: number; onChange: (val: number) => void }) => (
    <View style={styles.ratingRow}>
      <Text style={[styles.ratingLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => onChange(star)}>
            <Ionicons name={star <= value ? 'star' : 'star-outline'} size={24} color={colors.primary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Rate {employee?.name ?? ''}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <StarRow label="Quality of Work" value={ratings.qualityOfWork} onChange={(v) => setRatings({...ratings, qualityOfWork: v})} />
            <StarRow label="Efficiency" value={ratings.efficiency} onChange={(v) => setRatings({...ratings, efficiency: v})} />
            <StarRow label="Teamwork" value={ratings.teamwork} onChange={(v) => setRatings({...ratings, teamwork: v})} />
            <StarRow label="Initiative" value={ratings.initiative} onChange={(v) => setRatings({...ratings, initiative: v})} />
            <StarRow label="Communication" value={ratings.communication} onChange={(v) => setRatings({...ratings, communication: v})} />
            <StarRow label="Reliability" value={ratings.reliability} onChange={(v) => setRatings({...ratings, reliability: v})} />

            <Text style={[styles.textAreaLabel, { color: colors.textMuted }]}>Strengths</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]}
              value={strengths}
              onChangeText={setStrengths}
              placeholder="Enter strengths..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.textAreaLabel, { color: colors.textMuted }]}>Areas for Improvement</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]}
              value={areasForImprovement}
              onChangeText={setAreasForImprovement}
              placeholder="Enter areas for improvement..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Rating</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Main Attendance Component
export default function Attendance() {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Load user data from AsyncStorage
  useEffect(() => {
    const loadUserData = async () => {
      const id = await AsyncStorage.getItem('user_id');
      const name = await AsyncStorage.getItem('user_name');
      const role = await AsyncStorage.getItem('user_role');
      setUserId(id);
      setUserName(name);
      setUserRole(role);
    };
    loadUserData();
  }, []);

  // Queries
  const todayStatus = useQuery(api.timeTracking.getTodayStatus, userId ? { userId: userId as Id<'users'> } : 'skip') as TodayStatus | undefined;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyStats = useQuery(api.timeTracking.getMonthlyStats, userId ? { userId: userId as Id<'users'>, month: currentMonth } : 'skip') as MonthlyStats | undefined;
  const historyRecords = useQuery(api.timeTracking.getUserHistory, userId ? { userId: userId as Id<'users'>, limit: 10 } : 'skip') as AttendanceRecord[] | undefined;
  const employees = useQuery(api.users.getAllUsers, (userRole === 'supervisor' || userRole === 'admin') && userId ? { requesterId: userId as any } : 'skip') as User[] | undefined;

  // Mutations
  const checkInMutation = useMutation(api.timeTracking.checkIn);
  const checkOutMutation = useMutation(api.timeTracking.checkOut);
  const createRatingMutation = useMutation(api.supervisorRatings.createRating);

  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const handleCheckIn = async () => {
    if (!userId) {
      Alert.alert('Error', 'User ID not found');
      return;
    }
    setIsCheckingIn(true);
    try {
      await checkInMutation({ userId: userId as Id<'users'> });
      Alert.alert('Success', 'Checked in successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to check in');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!userId) {
      Alert.alert('Error', 'User ID not found');
      return;
    }
    setIsCheckingOut(true);
    try {
      await checkOutMutation({ userId: userId as Id<'users'> });
      Alert.alert('Success', 'Checked out successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to check out');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleSubmitRating = async (data: any) => {
    setIsSubmittingRating(true);
    try {
      await createRatingMutation({
        employeeId: data.employeeId,
        supervisorId: userId as Id<'users'>,
        qualityOfWork: data.qualityOfWork,
        efficiency: data.efficiency,
        teamwork: data.teamwork,
        initiative: data.initiative,
        communication: data.communication,
        reliability: data.reliability,
        strengths: data.strengths,
        areasForImprovement: data.areasForImprovement,
      });
      Alert.alert('Success', 'Rating submitted successfully');
      setModalVisible(false);
      setSelectedEmployee(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Attendance</Text>
          <LiveClock />
        </View>

        {/* Check In/Out Widget */}
        <View style={[styles.checkInWidget, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.widgetHeader}>
            <Text style={[styles.widgetStatus, { color: colors.textMuted }]}>
              {todayStatus?.status === 'checked_in' ? 'At Work' : todayStatus?.status === 'checked_out' ? 'Done' : 'Not Checked In'}
            </Text>
          </View>

          <View style={styles.timeRow}>
            {todayStatus?.checkInTime && (
              <View style={styles.timeInfo}>
                <Text style={[styles.timeLabel, { color: colors.textMuted }]}>Check In</Text>
                <Text style={[styles.timeValue, { color: colors.textPrimary }]}>{formatTime(todayStatus.checkInTime)}</Text>
              </View>
            )}
            {todayStatus?.checkOutTime && (
              <View style={styles.timeInfo}>
                <Text style={[styles.timeLabel, { color: colors.textMuted }]}>Check Out</Text>
                <Text style={[styles.timeValue, { color: colors.textPrimary }]}>{formatTime(todayStatus.checkOutTime)}</Text>
              </View>
            )}
          </View>

          {(todayStatus?.totalWorkedMinutes ?? 0) > 0 && (
            <View style={styles.workedInfo}>
              <Text style={[styles.workedLabel, { color: colors.textMuted }]}>Total Worked</Text>
              <Text style={[styles.workedValue, { color: colors.textPrimary }]}>{formatDuration(todayStatus?.totalWorkedMinutes ?? 0)}</Text>
            </View>
          )}

          {(todayStatus?.overtimeMinutes ?? 0) > 0 && (
            <View style={styles.badgeRow}>
              <View style={styles.otBadge}>
                <Ionicons name="time" size={16} color="#fff" />
                <Text style={styles.badgeText}>OT: {formatDuration(todayStatus?.overtimeMinutes ?? 0)}</Text>
              </View>
            </View>
          )}

          {todayStatus?.isLate && (
            <View style={styles.badgeRow}>
              <View style={styles.lateBadge}>
                <Ionicons name="alert-circle" size={16} color="#fff" />
                <Text style={styles.badgeText}>Late: {todayStatus?.lateMinutes ?? 0}m</Text>
              </View>
            </View>
          )}

          {todayStatus?.isEarlyLeave && (
            <View style={styles.badgeRow}>
              <View style={styles.earlyBadge}>
                <Ionicons name="alert-circle" size={16} color="#fff" />
                <Text style={styles.badgeText}>Early Leave: {todayStatus?.earlyLeaveMinutes ?? 0}m</Text>
              </View>
            </View>
          )}

          {todayStatus?.status === 'checked_in' ? (
            <LinearGradient colors={[colors.error, '#c41c3b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionButton}>
              <TouchableOpacity onPress={handleCheckOut} disabled={isCheckingOut}>
                {isCheckingOut ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Check Out</Text>}
              </TouchableOpacity>
            </LinearGradient>
          ) : (
            <LinearGradient colors={[colors.success, '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionButton}>
              <TouchableOpacity onPress={handleCheckIn} disabled={isCheckingIn}>
                {isCheckingIn ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Check In</Text>}
              </TouchableOpacity>
            </LinearGradient>
          )}
        </View>

        {/* Monthly Stats Grid */}
        {monthlyStats && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{monthlyStats.totalDays}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Days Worked</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{Number(monthlyStats.totalWorkedHours ?? 0).toFixed(1)}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Hours</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{Number(monthlyStats.punctualityRate ?? 0).toFixed(0)}%</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Punctuality</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{Number(monthlyStats.totalOvertimeHours ?? 0).toFixed(1)}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Overtime</Text>
            </View>
          </View>
        )}

        {/* Attendance Issues Card */}
        {monthlyStats && (monthlyStats.lateDays > 0 || monthlyStats.earlyLeaveDays > 0) && (
          <View style={[styles.issuesCard, { backgroundColor: colors.bgCard }]}>
            <View style={styles.issuesHeader}>
              <Ionicons name="warning" size={24} color="#f59e0b" />
              <Text style={[styles.issuesTitle, { color: colors.textPrimary }]}>Attendance Issues</Text>
            </View>
            {monthlyStats.lateDays > 0 && <Text style={[styles.issueText, { color: colors.textSecondary }]}>Late Arrivals: {monthlyStats.lateDays} days</Text>}
            {monthlyStats.earlyLeaveDays > 0 && <Text style={[styles.issueText, { color: colors.textSecondary }]}>Early Leaves: {monthlyStats.earlyLeaveDays} days</Text>}
          </View>
        )}

        {/* Recent Attendance History */}
        {historyRecords && historyRecords.length > 0 && (
          <View style={styles.historySection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Attendance</Text>
            {historyRecords.map(record => (
              <View key={record._id} style={[styles.historyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <View style={styles.historyDate}>
                  <Text style={[styles.historyDateText, { color: colors.textPrimary }]}>{formatDate(new Date(record.date).getTime())}</Text>
                </View>
                <View style={styles.historyTimes}>
                  <Text style={[styles.historyTime, { color: colors.textPrimary }]}>
                    {formatTime(record.checkInTime)} → {record.checkOutTime ? formatTime(record.checkOutTime) : '—'}
                  </Text>
                  <Text style={[styles.historyDuration, { color: colors.textMuted }]}>{formatDuration(record.totalWorkedMinutes)}</Text>
                </View>
                <View style={styles.historyBadges}>
                  {record.isLate && <View style={styles.badgeSmall}><Text style={styles.badgeSmallText}>Late</Text></View>}
                  {record.isEarlyLeave && <View style={styles.badgeSmall}><Text style={styles.badgeSmallText}>Early</Text></View>}
                  {record.overtimeMinutes > 0 && <View style={[styles.badgeSmall, styles.badgeSmallOT]}><Text style={styles.badgeSmallText}>OT</Text></View>}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Supervisor/Admin Ratings Section */}
        {(userRole === 'supervisor' || userRole === 'admin') && employees && employees.length > 0 && (
          <View style={styles.ratingsSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Employee Ratings</Text>
            {employees.map(employee => (
              <TouchableOpacity
                key={employee._id}
                style={[styles.employeeCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                onPress={() => {
                  setSelectedEmployee(employee);
                  setModalVisible(true);
                }}
              >
                <View style={styles.employeeInfo}>
                  <Text style={[styles.employeeName, { color: colors.textPrimary }]}>{employee.name}</Text>
                  <Text style={[styles.employeeRole, { color: colors.textMuted }]}>{employee.role}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Spacer for tab bar */}
        <View style={{ height: Platform.OS === 'ios' ? 88 : 68 }} />
      </ScrollView>

      {/* Supervisor Rating Modal */}
      <SupervisorRatingModal
        visible={modalVisible}
        employee={selectedEmployee}
        onClose={() => {
          setModalVisible(false);
          setSelectedEmployee(null);
        }}
        onSubmit={handleSubmitRating}
        isLoading={isSubmittingRating}
      />
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    ...Typography.h1,
    marginBottom: Spacing.md,
  },
  clockContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  clockText: {
    ...Typography.h2,
  },
  checkInWidget: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  widgetHeader: {
    marginBottom: Spacing.md,
  },
  widgetStatus: {
    ...Typography.body,
    fontSize: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  timeInfo: {
    alignItems: 'center',
  },
  timeLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  timeValue: {
    ...Typography.h3,
  },
  workedInfo: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  workedLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  workedValue: {
    ...Typography.h3,
  },
  badgeRow: {
    marginBottom: Spacing.md,
  },
  lateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  earlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  otBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0891b2',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  badgeText: {
    color: '#fff',
    ...Typography.caption,
  },
  actionButton: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  actionButtonText: {
    color: '#fff',
    ...Typography.body,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  statValue: {
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.caption,
  },
  issuesCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  issuesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  issuesTitle: {
    ...Typography.body,
    fontWeight: '600',
  },
  issueText: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  historySection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  historyCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyDate: {
    alignItems: 'center',
    minWidth: 50,
  },
  historyDateText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  historyTimes: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  historyTime: {
    ...Typography.body,
    marginBottom: Spacing.xs,
  },
  historyDuration: {
    ...Typography.caption,
  },
  historyBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  badgeSmall: {
    backgroundColor: '#dc2626',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
  },
  badgeSmallOT: {
    backgroundColor: '#0891b2',
  },
  badgeSmallText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  ratingsSection: {
    marginBottom: Spacing.lg,
  },
  employeeCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  employeeRole: {
    ...Typography.caption,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalContent: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...Typography.h3,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  ratingRow: {
    marginBottom: Spacing.lg,
  },
  ratingLabel: {
    ...Typography.body,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  textAreaLabel: {
    ...Typography.body,
    marginBottom: Spacing.sm,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  textInput: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  textInputPlaceholder: {
    ...Typography.caption,
  },
  submitButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    ...Typography.body,
    fontWeight: '600',
  },
});

