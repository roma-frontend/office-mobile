import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
  TextInput, ActivityIndicator, Dimensions, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useToast } from '@/context/ToastContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Typography, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// ── Custom Calendar Picker ──────────────────────────────────────────────────
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface CalendarPickerProps {
  visible: boolean;
  title: string;
  value: string;
  minDate?: string;
  colors: any;
  isDark: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
}

function CalendarPicker({ visible, title, value, minDate, colors, isDark, onClose, onSelect }: CalendarPickerProps) {
  const initial = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [selected, setSelected] = useState(value || '');

  useEffect(() => {
    if (visible) {
      const d = value ? new Date(value + 'T00:00:00') : new Date();
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelected(value || '');
    }
  }, [visible, value]);

  const todayStr = new Date().toISOString().split('T')[0];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function toStr(d: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  function isDisabled(d: number) {
    if (!minDate) return false;
    return toStr(d) < minDate;
  }

  const accentColor = isDark ? colors.primary : colors.primary;
  const bg = isDark ? '#1A1510' : '#ffffff';
  const headerBg = isDark ? '#211C14' : colors.bg;
  const cellBg = isDark ? '#2A2218' : colors.bgCard;
  const textPrimary = colors.textPrimary;
  const textMuted = colors.textMuted;
  const borderColor = isDark ? '#3A3020' : colors.border;

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 360, backgroundColor: bg, borderRadius: 24, overflow: 'hidden', elevation: 20, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20 }}>

          {/* Header */}
          <LinearGradient colors={isDark ? [colors.primaryDark,colors.primary] : [colors.primary,colors.primaryLight]} style={{ padding: 20, paddingBottom: 16 }}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{title}</Text>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>
              {selected ? (() => { const d = new Date(selected + 'T00:00:00'); return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); })() : 'Pick a date'}
            </Text>
          </LinearGradient>

          {/* Month navigation */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: headerBg, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: borderColor }}>
            <TouchableOpacity onPress={prevMonth} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isDark ? '#2A2218' : colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '600' }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ color: textPrimary, fontSize: 16, fontWeight: '700' }}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isDark ? '#2A2218' : colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '600' }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Weekday labels */}
          <View style={{ flexDirection: 'row', backgroundColor: headerBg, paddingHorizontal: 12, paddingBottom: 8, paddingTop: 10 }}>
            {WEEKDAYS.map(d => (
              <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ color: d === 'Su' || d === 'Sa' ? accentColor + 'aa' : textMuted, fontSize: 12, fontWeight: '700' }}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
            {rows.map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', marginBottom: 4 }}>
                {Array.from({ length: 7 }).map((_, ci) => {
                  const day = row[ci] ?? null;
                  if (!day) return <View key={ci} style={{ flex: 1, height: 42 }} />;
                  const dateStr = toStr(day);
                  const isSelected = dateStr === selected;
                  const isToday = dateStr === todayStr;
                  const disabled = isDisabled(day);
                  const isWeekend = ci === 0 || ci === 6;
                  return (
                    <TouchableOpacity
                      key={ci}
                      disabled={disabled}
                      onPress={() => setSelected(dateStr)}
                      style={{ flex: 1, height: 42, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <View style={{
                        width: 38, height: 38, borderRadius: 12,
                        backgroundColor: isSelected ? accentColor : isToday ? accentColor + '22' : 'transparent',
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: isToday && !isSelected ? 1.5 : 0,
                        borderColor: accentColor,
                      }}>
                        <Text style={{
                          fontSize: 14,
                          fontWeight: isSelected || isToday ? '700' : '400',
                          color: isSelected ? '#fff' : disabled ? textMuted + '44' : isWeekend ? accentColor : textPrimary,
                        }}>{day}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: borderColor }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: cellBg, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: textMuted, fontWeight: '600', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { if (selected) { onSelect(selected); onClose(); } }}
              disabled={!selected}
              style={{ flex: 2, height: 48, borderRadius: 14, overflow: 'hidden', opacity: selected ? 1 : 0.5 }}>
              <LinearGradient colors={isDark ? [colors.primaryDark,colors.primary] : [colors.primary,colors.primaryLight]} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Confirm Date</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}
// ────────────────────────────────────────────────────────────────────────────

type LeaveType = 'paid' | 'sick' | 'family' | 'doctor' | 'unpaid';
type LeaveStatus = 'pending' | 'approved' | 'rejected';

const LEAVE_TYPES: { label: string; value: LeaveType; color: string; icon: string }[] = [
  { label: 'Paid Vacation', value: 'paid', color: colors.primary, icon: 'sunny-outline' },
  { label: 'Sick Leave', value: 'sick', color: '#ef4444', icon: 'medkit-outline' },
  { label: 'Family Leave', value: 'family', color: '#10b981', icon: 'people-outline' },
  { label: 'Doctor Visit', value: 'doctor', color: '#06b6d4', icon: 'medical-outline' },
  { label: 'Unpaid Leave', value: 'unpaid', color: '#f59e0b', icon: 'calendar-outline' },
];

const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  paid: colors.primary, sick: '#ef4444', family: '#10b981', doctor: '#06b6d4', unpaid: '#f59e0b',
};

const STATUS_ICONS: Record<LeaveStatus, string> = {
  approved: 'checkmark-circle', pending: 'time', rejected: 'close-circle',
};

const FILTERS = ['All', 'Pending', 'Approved', 'Rejected'];

function calcDays(from: string, to: string) {
  const start = new Date(from);
  const end = new Date(to || from);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
}

function today() {
  return new Date().toISOString().split('T')[0];
}


export default function Leaves() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom;
  const { colors, isDark, toggleTheme } = useTheme();
  const toast = useToast();

  // Auth
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('employee');

  useEffect(() => {
    AsyncStorage.getItem('user_id').then(id => setUserId(id));
    AsyncStorage.getItem('user_role').then(role => setUserRole(role ?? 'employee'));
  }, []);

  const isAdmin = userRole === 'admin' || userRole === 'supervisor';

  // Data
  const userLeaves = useQuery(
    api.leaves.getUserLeaves,
    userId ? { userId: userId as Id<'users'> } : 'skip'
  );
  const allLeaves = useQuery(api.leaves.getAllLeaves, (isAdmin && userId) ? { requesterId: userId as any } : 'skip');
  const leaveStats = useQuery(api.leaves.getLeaveStats, userId ? { requesterId: userId as any } : 'skip');

  const createLeave = useMutation(api.leaves.createLeave);
  const approveLeave = useMutation(api.leaves.approveLeave);
  const rejectLeave = useMutation(api.leaves.rejectLeave);
  const deleteLeave = useMutation(api.leaves.deleteLeave);

  // List state
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create modal state
  const [showModal, setShowModal] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('paid');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Reject modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<Id<'leaveRequests'> | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTargetId, setEditTargetId] = useState<Id<'leaveRequests'> | null>(null);
  const [editLeaveType, setEditLeaveType] = useState<LeaveType>('paid');
  const [editFromDate, setEditFromDate] = useState('');
  const [editToDate, setEditToDate] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [showEditFromPicker, setShowEditFromPicker] = useState(false);
  const [showEditToPicker, setShowEditToPicker] = useState(false);

  const updateLeave = useMutation(api.leaves.updateLeave);

  const leavesSource = isAdmin ? (allLeaves ?? []) : (userLeaves ?? []);

  const filtered = useMemo(() => {
    return leavesSource.filter(l => {
      const matchFilter = filter === 'All' || l.status === filter.toLowerCase();
      const matchSearch = !search || (
        l.reason.toLowerCase().includes(search.toLowerCase()) ||
        (l as any).userName?.toLowerCase().includes(search.toLowerCase()) ||
        l.type.toLowerCase().includes(search.toLowerCase())
      );
      return matchFilter && matchSearch;
    });
  }, [leavesSource, filter, search]);

  const daysPreview = fromDate && toDate ? calcDays(fromDate, toDate) : fromDate ? 1 : 0;

  const resetModal = () => {
    setFromDate(''); setToDate(''); setReason(''); setComment('');
    setLeaveType('paid'); setShowModal(false);
  };

  const handleSubmit = async () => {
    if (!fromDate) { toast.error('Validation Error', 'Please enter a start date'); return; }
    if (!reason.trim()) { toast.error('Validation Error', 'Please provide a reason'); return; }
    if (!userId) { toast.error('Session Expired', 'Please log in again.'); return; }
    if (toDate && toDate < fromDate) { toast.error('Invalid Dates', 'End date cannot be before start date'); return; }
    setSubmitting(true);
    try {
      const days = calcDays(fromDate, toDate || fromDate);
      await createLeave({
        userId: userId as Id<'users'>,
        type: leaveType,
        startDate: fromDate,
        endDate: toDate || fromDate,
        days,
        reason: reason.trim(),
        comment: comment.trim() || undefined,
      });
      resetModal();
      toast.success('Request Submitted', 'Your leave request was submitted successfully!');
    } catch (e: any) {
      toast.error('Submit Failed', e?.message ?? 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (leaveId: Id<'leaveRequests'>) => {
    if (!userId) return;
    try {
      await approveLeave({ leaveId, reviewerId: userId as Id<'users'> });
      toast.success('Leave Approved ✅', 'Leave request has been approved.');
    } catch (e: any) { toast.error('Error', e?.message ?? 'Failed to approve'); }
  };

  const handleReject = (leaveId: Id<'leaveRequests'>) => {
    setRejectTargetId(leaveId);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!userId || !rejectTargetId) return;
    setRejectSubmitting(true);
    try {
      await rejectLeave({ leaveId: rejectTargetId, reviewerId: userId as Id<'users'>, comment: rejectReason.trim() || undefined });
      setRejectModalVisible(false);
      setRejectTargetId(null);
      setRejectReason('');
      toast.info('Leave Rejected ❌', 'Leave request has been rejected.');
    } catch (e: any) { toast.error('Error', e?.message ?? 'Failed to reject'); }
    finally { setRejectSubmitting(false); }
  };

  const handleEdit = (l: any) => {
    setEditTargetId(l._id);
    setEditLeaveType(l.type as LeaveType);
    setEditFromDate(l.startDate);
    setEditToDate(l.endDate !== l.startDate ? l.endDate : '');
    setEditReason(l.reason);
    setShowEditModal(true);
  };

  const confirmEdit = async () => {
    if (!userId || !editTargetId) return;
    if (!editFromDate) { toast.error('Validation Error', 'Please enter a start date'); return; }
    if (!editReason.trim()) { toast.error('Validation Error', 'Please provide a reason'); return; }
    if (editToDate && editToDate < editFromDate) { toast.error('Invalid Dates', 'End date cannot be before start date'); return; }
    setEditSubmitting(true);
    try {
      const days = calcDays(editFromDate, editToDate || editFromDate);
      await updateLeave({
        leaveId: editTargetId,
        requesterId: userId as Id<'users'>,
        type: editLeaveType,
        startDate: editFromDate,
        endDate: editToDate || editFromDate,
        days,
        reason: editReason.trim(),
      });
      setShowEditModal(false);
      setEditTargetId(null);
      toast.success('Request Updated', 'Leave request has been updated.');
    } catch (e: any) { toast.error('Error', e?.message ?? 'Failed to update'); }
    finally { setEditSubmitting(false); }
  };

  const handleDelete = async (leaveId: Id<'leaveRequests'>) => {
    if (!userId) return;
    Alert.alert('Delete', 'Are you sure you want to delete this request?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteLeave({ leaveId, requesterId: userId as Id<'users'> });
          toast.success('Deleted', 'Leave request has been deleted.');
        } catch (e: any) { toast.error('Error', e?.message ?? 'Failed to delete'); }
      }},
    ]);
  };

  const isLoading = isAdmin ? allLeaves === undefined : userLeaves === undefined;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{isAdmin ? 'Leave Requests' : 'My Leaves'}</Text>
          {leaveStats && (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {leaveStats.pending} pending · {leaveStats.approved} approved · {leaveStats.onLeaveToday} on leave today
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={() => setShowSearch(s => !s)}>
            <Ionicons name={showSearch ? 'close' : 'search-outline'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
            <LinearGradient colors={isDark ? [colors.primaryDark, colors.primary] : [colors.primaryDark, colors.primary]} style={styles.addBtnGrad}>
              <Ionicons name="add" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      {showSearch && (
        <View style={[styles.searchRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search by type, reason, employee..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Stats cards (admin only) */}
      {isAdmin && leaveStats && (
        <View style={styles.statsRow}>
          {[
            { label: 'Total',    value: leaveStats.total,    color: colors.primary },
            { label: 'Pending',  value: leaveStats.pending,  color: colors.warning },
            { label: 'Approved', value: leaveStats.approved, color: colors.success },
            { label: 'Rejected', value: leaveStats.rejected, color: colors.error   },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { borderColor: s.color + '44', backgroundColor: colors.bgCard }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Filter tabs — fixed above the list, won't be pushed by expanding cards */}
      <View style={{ backgroundColor: colors.bg, zIndex: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
          contentContainerStyle={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingRight: 8, paddingVertical: 4 }}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)}
              style={[styles.filterChip, { backgroundColor: colors.bgCard, borderColor: colors.border }, filter === f && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Text style={[styles.filterText, { color: colors.textMuted }, filter === f && { color: '#fff' }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={[styles.centered, { paddingBottom: bottomOffset }]}>
          <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No leave requests found</Text>
          <Text style={[styles.emptySubText, { color: colors.textMuted }]}>Tap + to submit a new request</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomOffset + 16, gap: 10, paddingTop: 4 }}>
          {filtered.map(l => {
            const STATUS_COLORS: Record<LeaveStatus, string> = {
              approved: colors.success, pending: colors.warning, rejected: colors.error,
            };
            const sc = STATUS_COLORS[l.status as LeaveStatus] ?? colors.textMuted;
            const si = STATUS_ICONS[l.status as LeaveStatus] ?? 'help-circle';
            const tc = LEAVE_TYPE_COLORS[l.type as LeaveType] ?? colors.primary;
            const lt = LEAVE_TYPES.find(x => x.value === l.type);
            const isExpanded = expandedId === l._id;
            return (
              <TouchableOpacity key={l._id} activeOpacity={0.85}
                onPress={() => setExpandedId(isExpanded ? null : l._id)}
                style={[styles.leaveCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                {/* Color bar */}
                <View style={[styles.leaveColorBar, { backgroundColor: tc }]} />
                <View style={styles.leaveCardInner}>
                  {/* Top row */}
                  <View style={styles.leaveTop}>
                    <View style={[styles.leaveTypeIcon, { backgroundColor: tc + '22' }]}>
                      <Ionicons name={lt?.icon as any ?? 'calendar-outline'} size={16} color={tc} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.leaveName, { color: colors.textPrimary }]}>{lt?.label ?? l.type}</Text>
                      {isAdmin && (l as any).userName && (
                        <Text style={[styles.leaveEmployee, { color: colors.textMuted }]}>{(l as any).userName} · {(l as any).userDepartment}</Text>
                      )}
                      <Text style={[styles.leaveDates, { color: colors.textMuted }]}>
                        {l.startDate}{l.endDate !== l.startDate ? ` → ${l.endDate}` : ''}
                        {' · '}{l.days} day{l.days !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: sc + '22' }]}>
                      <Ionicons name={si as any} size={12} color={sc} />
                      <Text style={[styles.statusText, { color: sc }]}>
                        {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {/* Reason */}
                  <Text style={[styles.leaveReason, { color: colors.textSecondary }]} numberOfLines={isExpanded ? undefined : 1}>{l.reason}</Text>

                  {/* Reviewer info when expanded */}
                  {isExpanded && (l as any).reviewerName && (
                    <View style={[styles.reviewerRow, { backgroundColor: sc + '11' }]}>
                      <Ionicons name={l.status === 'approved' ? 'checkmark-circle' : 'close-circle'} size={13} color={sc} />
                      <Text style={[styles.reviewerText, { color: sc }]}>
                        {l.status === 'approved' ? 'Approved' : 'Rejected'} by {(l as any).reviewerName}
                      </Text>
                      {(l as any).reviewComment ? (
                        <Text style={[styles.reviewComment, { color: colors.textMuted }]}> · "{(l as any).reviewComment}"</Text>
                      ) : null}
                    </View>
                  )}

                  {/* Expanded: actions */}
                  {isExpanded && (
                    <View style={[styles.leaveActions, { borderColor: colors.border }]}>
                      {isAdmin && l.status === 'pending' && (
                        <>
                          <TouchableOpacity style={[styles.approveBtn, { backgroundColor: colors.success + '20', borderColor: colors.success + '60' }]}
                            onPress={() => handleApprove(l._id)}>
                            <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                            <Text style={[styles.actionBtnText, { color: colors.success }]}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.rejectBtn, { backgroundColor: colors.error + '20', borderColor: colors.error + '60' }]}
                            onPress={() => handleReject(l._id)}>
                            <Ionicons name="close-circle-outline" size={16} color={colors.error} />
                            <Text style={[styles.actionBtnText, { color: colors.error }]}>Reject</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {!isAdmin && l.status === 'pending' && (
                        <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '60' }]}
                          onPress={() => handleEdit(l)}>
                          <Ionicons name="create-outline" size={16} color={colors.primary} />
                          <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
                        onPress={() => handleDelete(l._id)}>
                        <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Custom Calendar Pickers — New Leave Modal (placed BEFORE modals to avoid nesting issues) */}
      <CalendarPicker
        visible={showFromPicker}
        title="Select Start Date"
        value={fromDate}
        minDate={today()}
        colors={colors}
        isDark={isDark}
        onClose={() => setShowFromPicker(false)}
        onSelect={(d) => { setFromDate(d); if (toDate && toDate < d) setToDate(''); }}
      />
      <CalendarPicker
        visible={showToPicker}
        title="Select End Date"
        value={toDate}
        minDate={fromDate || today()}
        colors={colors}
        isDark={isDark}
        onClose={() => setShowToPicker(false)}
        onSelect={(d) => setToDate(d)}
      />

      {/* Custom Calendar Pickers — Edit Leave Modal */}
      <CalendarPicker
        visible={showEditFromPicker}
        title="Select Start Date"
        value={editFromDate}
        minDate={today()}
        colors={colors}
        isDark={isDark}
        onClose={() => setShowEditFromPicker(false)}
        onSelect={(d) => { setEditFromDate(d); if (editToDate && editToDate < d) setEditToDate(''); }}
      />
      <CalendarPicker
        visible={showEditToPicker}
        title="Select End Date"
        value={editToDate}
        minDate={editFromDate || today()}
        colors={colors}
        isDark={isDark}
        onClose={() => setShowEditToPicker(false)}
        onSelect={(d) => setEditToDate(d)}
      />

      {/* New Leave Modal */}
      <Modal visible={showModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom + 16, 36), backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>New Leave Request</Text>

                {/* Type selector */}
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Leave Type</Text>
                <View style={styles.typeGrid}>
                  {LEAVE_TYPES.map(t => (
                    <TouchableOpacity key={t.value} onPress={() => setLeaveType(t.value)}
                      style={[styles.typeChip, { backgroundColor: colors.bgElevated, borderColor: colors.border }, leaveType === t.value && { borderColor: t.color, backgroundColor: t.color + '22' }]}>
                      <Ionicons name={t.icon as any} size={16} color={leaveType === t.value ? t.color : colors.textMuted} />
                      <Text style={[styles.typeText, { color: colors.textMuted }, leaveType === t.value && { color: t.color }]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Dates */}
                <View style={styles.dateRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Start Date *</Text>
                    <TouchableOpacity 
                      style={[styles.fieldInput, { backgroundColor: colors.bgElevated, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12 }]}
                      onPress={() => {
                        console.log('From date picker pressed');
                        setShowFromPicker(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: fromDate ? colors.textPrimary : colors.textMuted, ...Typography.body }}>
                        {fromDate || 'YYYY-MM-DD'}
                      </Text>
                      <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>End Date</Text>
                    <TouchableOpacity 
                      style={[styles.fieldInput, { backgroundColor: colors.bgElevated, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12 }]}
                      onPress={() => {
                        console.log('To date picker pressed');
                        setShowToPicker(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: toDate ? colors.textPrimary : colors.textMuted, ...Typography.body }}>
                        {toDate || 'YYYY-MM-DD'}
                      </Text>
                      <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Days preview */}
                {daysPreview > 0 && (
                  <View style={[styles.daysPreview, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '33' }]}>
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <Text style={[styles.daysPreviewText, { color: colors.primary }]}>
                      {daysPreview} day{daysPreview !== 1 ? 's' : ''} requested
                      {fromDate ? ` · ${fromDate}${toDate && toDate !== fromDate ? ` → ${toDate}` : ''}` : ''}
                    </Text>
                  </View>
                )}

                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Reason *</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: colors.bgElevated, borderColor: colors.border, color: colors.textPrimary }]} placeholder="Brief reason for leave..."
                  placeholderTextColor={colors.textMuted} value={reason} onChangeText={setReason} />

                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Additional Comments</Text>
                <TextInput style={[styles.fieldInput, { height: 80, textAlignVertical: 'top', paddingTop: 10, backgroundColor: colors.bgElevated, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Any additional information..."
                  placeholderTextColor={colors.textMuted} value={comment}
                  onChangeText={setComment} multiline />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.bgElevated, borderColor: colors.border }]} onPress={resetModal}>
                    <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.submitBtn, { shadowColor: colors.primary }]} onPress={handleSubmit} disabled={submitting}>
                    <LinearGradient colors={isDark ? [colors.primaryDark, colors.primary] : [colors.primaryDark, colors.primary]} style={styles.submitGrad}>
                      {submitting
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.submitText}>Submit Request</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reject Modal — cross-platform (no Alert.prompt) */}
      <Modal visible={rejectModalVisible} animationType="fade" transparent statusBarTranslucent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.centeredOverlay}>
            <View style={[styles.dialogCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={styles.dialogIconWrap}>
                <Ionicons name="close-circle" size={32} color={colors.error} />
              </View>
              <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>Reject Leave Request</Text>
              <Text style={[styles.dialogSubtitle, { color: colors.textMuted }]}>Provide a reason (optional)</Text>
              <TextInput
                style={[styles.fieldInput, { marginTop: 12, textAlignVertical: 'top', height: 80, paddingTop: 10, backgroundColor: colors.bgElevated, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="e.g. Insufficient staffing during this period..."
                placeholderTextColor={colors.textMuted}
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
                  onPress={() => { setRejectModalVisible(false); setRejectReason(''); }}>
                  <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { flex: 1.5, shadowColor: colors.error }]} onPress={confirmReject} disabled={rejectSubmitting}>
                  <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.submitGrad}>
                    {rejectSubmitting
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.submitText}>Reject</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom + 16, 36), backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Leave Request</Text>

                {/* Type selector */}
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Leave Type</Text>
                <View style={styles.typeGrid}>
                  {LEAVE_TYPES.map(t => (
                    <TouchableOpacity key={t.value} onPress={() => setEditLeaveType(t.value)}
                      style={[styles.typeChip, { backgroundColor: colors.bgElevated, borderColor: colors.border }, editLeaveType === t.value && { borderColor: t.color, backgroundColor: t.color + '22' }]}>
                      <Ionicons name={t.icon as any} size={16} color={editLeaveType === t.value ? t.color : colors.textMuted} />
                      <Text style={[styles.typeText, { color: colors.textMuted }, editLeaveType === t.value && { color: t.color }]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Dates */}
                <View style={styles.dateRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Start Date *</Text>
                    <TouchableOpacity style={[styles.fieldInput, { backgroundColor: colors.bgElevated, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12 }]}
                      onPress={() => setShowEditFromPicker(true)}>
                      <Text style={{ color: editFromDate ? colors.textPrimary : colors.textMuted, ...Typography.body }}>
                        {editFromDate || 'YYYY-MM-DD'}
                      </Text>
                      <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>End Date</Text>
                    <TouchableOpacity style={[styles.fieldInput, { backgroundColor: colors.bgElevated, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12 }]}
                      onPress={() => setShowEditToPicker(true)}>
                      <Text style={{ color: editToDate ? colors.textPrimary : colors.textMuted, ...Typography.body }}>
                        {editToDate || 'YYYY-MM-DD'}
                      </Text>
                      <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {editFromDate ? (
                  <View style={[styles.daysPreview, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '33' }]}>
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <Text style={[styles.daysPreviewText, { color: colors.primary }]}>
                      {calcDays(editFromDate, editToDate || editFromDate)} day{calcDays(editFromDate, editToDate || editFromDate) !== 1 ? 's' : ''} requested
                    </Text>
                  </View>
                ) : null}

                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Reason *</Text>
                <TextInput style={[styles.fieldInput, { height: 80, textAlignVertical: 'top', paddingTop: 10, backgroundColor: colors.bgElevated, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Brief reason for leave..."
                  placeholderTextColor={colors.textMuted} value={editReason}
                  onChangeText={setEditReason} multiline />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.bgElevated, borderColor: colors.border }]} onPress={() => setShowEditModal(false)}>
                    <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.submitBtn, { shadowColor: colors.primary }]} onPress={confirmEdit} disabled={editSubmitting}>
                    <LinearGradient colors={isDark ? [colors.primaryDark, colors.primary] : [colors.primaryDark, colors.primary]} style={styles.submitGrad}>
                      {editSubmitting
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.submitText}>Save Changes</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  title: { ...Typography.h1 },
  subtitle: { ...Typography.caption, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  iconBtn: { width: 40, height: 40, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  addBtn: { borderRadius: Radius.md, overflow: 'hidden', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  addBtnGrad: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  // Search
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, ...Typography.body },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  statCard: { flex: 1, borderRadius: Radius.md, borderWidth: 1, paddingVertical: 10, alignItems: 'center', gap: 2 },
  statValue: { ...Typography.h2, fontWeight: '700' },
  statLabel: { ...Typography.label },

  // Filters
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterChip: { height: 34, paddingHorizontal: 16, borderRadius: Radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { borderWidth: 1 },
  filterText: { ...Typography.captionMedium },
  filterTextActive: { color: '#fff', fontWeight: '600' },

  // Empty / Loading
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { ...Typography.bodyMedium },
  emptySubText: { ...Typography.caption },

  // Leave cards
  leaveCard: { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden', flexDirection: 'row' },
  leaveColorBar: { width: 4 },
  leaveCardInner: { flex: 1, padding: 14 },
  leaveTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  leaveTypeIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  leaveName: { ...Typography.bodyMedium, fontWeight: '600' },
  leaveEmployee: { ...Typography.caption, marginTop: 1 },
  leaveDates: { ...Typography.caption, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  statusText: { ...Typography.label, fontSize: 11, fontWeight: '600' },
  leaveReason: { ...Typography.caption, marginBottom: 2, lineHeight: 18 },

  // Leave actions (expanded) — full-width row buttons
  leaveActions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: Radius.md, borderWidth: 1.5 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: Radius.md, borderWidth: 1.5 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: Radius.md, borderWidth: 1.5 },
  deleteBtn: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  actionBtnText: { ...Typography.captionMedium, fontWeight: '600' },

  // Reviewer info
  reviewerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, marginBottom: 4, flexWrap: 'wrap', borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  reviewerText: { ...Typography.caption, fontWeight: '600' },
  reviewComment: { ...Typography.caption, fontStyle: 'italic', flex: 1 },

  // Modal (bottom sheet)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { ...Typography.h2, marginBottom: 20 },
  fieldLabel: { ...Typography.label, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  fieldInput: { borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, ...Typography.body, marginBottom: 16 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1.5 },
  typeText: { ...Typography.captionMedium },
  dateRow: { flexDirection: 'row', marginBottom: 0 },
  daysPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, borderWidth: 1 },
  daysPreviewText: { ...Typography.captionMedium, flex: 1 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, height: 52, borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  cancelText: { ...Typography.bodyMedium },
  submitBtn: { flex: 2, height: 52, borderRadius: Radius.md, overflow: 'hidden', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  submitGrad: { width: '100%', height: 52, alignItems: 'center', justifyContent: 'center' },
  submitText: { ...Typography.bodyMedium, color: '#fff', fontWeight: '700' },

  // Centered dialog (Reject modal)
  centeredOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialogCard: { width: '100%', borderRadius: 24, padding: 24, borderWidth: 1 },
  dialogIconWrap: { alignItems: 'center', marginBottom: 12 },
  dialogTitle: { ...Typography.h3, textAlign: 'center', marginBottom: 4 },
  dialogSubtitle: { ...Typography.caption, textAlign: 'center' },

});





