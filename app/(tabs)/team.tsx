import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Platform, Image, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Typography, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  admin:      { label: 'Admin',      color: '#3b82f6', icon: 'shield'        },
  supervisor: { label: 'Supervisor', color: '#f59e0b', icon: 'star'          },
  employee:   { label: 'Employee',   color: '#10b981', icon: 'person'        },
};

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  staff:      { label: 'Staff',      color: '#3b82f6' },
  contractor: { label: 'Contractor', color: '#f59e0b' },
};

const PRESENCE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  available:     { label: 'Available',     color: '#4CAF7C', icon: 'checkmark-circle' },
  in_meeting:    { label: 'In Meeting',    color: '#f59e0b',      icon: 'calendar'         },
  in_call:       { label: 'In Call',       color: '#06b6d4',      icon: 'call'             },
  out_of_office: { label: 'Out of Office', color: '#C84C4C',   icon: 'home'             },
  busy:          { label: 'Busy',          color: '#f97316',      icon: 'ban'              },
};

const AVATAR_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#60a5fa'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function Avatar({ name, avatarUrl, size = 46, index = 0 }: { name: string; avatarUrl?: string; size?: number; index?: number }) {
  const initials = getInitials(name);
  const avatarColor = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const borderRadius = Math.round(size * 0.3);
  
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius, flexShrink: 0 }}
      />
    );
  }
  return (
    <LinearGradient
      colors={[avatarColor, avatarColor + '99']}
      style={{ width: size, height: size, borderRadius, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      <Text style={{ fontSize: size * 0.32, fontWeight: '700', color: '#fff' }}>{initials}</Text>
    </LinearGradient>
  );
}

function InfoRow({ icon, value, colors }: { icon: string; value?: string | null; colors: any }) {
  if (!value) return null;
  return (
    <View style={profileStyles.infoRow}>
      <Ionicons name={icon as any} size={15} color={colors.textMuted} />
      <Text style={[profileStyles.infoText, { color: colors.textMuted }]}>{value}</Text>
    </View>
  );
}

function EmployeeProfileModal({ employee, allUsers, onClose }: {
  employee: any;
  allUsers: any[];
  onClose: () => void;
}) {
  const { colors, isDark } = useTheme();
  const leaves = useQuery(api.leaves.getUserLeaves, { userId: employee._id });
  const supervisor = allUsers.find(u => u._id === employee.supervisorId);
  const roleConf = ROLE_CONFIG[employee.role] ?? ROLE_CONFIG.employee;
  const typeConf = TYPE_CONFIG[employee.employeeType] ?? { label: employee.employeeType, color: colors.primary };
  const presenceConf = PRESENCE_CONFIG[employee.presenceStatus ?? 'available'] ?? PRESENCE_CONFIG.available;

  const approvedLeaves = (leaves ?? []).filter(l => l.status === 'approved');
  const pendingLeaves = (leaves ?? []).filter(l => l.status === 'pending');
  const totalDays = approvedLeaves.reduce((sum, l) => sum + (l.days ?? 0), 0);

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaProvider>
      <SafeAreaView style={[profileStyles.overlay, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={[profileStyles.container, { backgroundColor: colors.bg }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

          {/* Hero */}
          <LinearGradient
            colors={isDark ? ['#0f172a', '#1e293b', colors.bg] : [colors.primary, colors.primaryLight, colors.bg]}
            style={profileStyles.hero}
          >
            <TouchableOpacity style={profileStyles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={profileStyles.avatar}>
              <Avatar name={employee.name} avatarUrl={employee.avatarUrl} size={80} />
            </View>
            <Text style={profileStyles.name}>{employee.name}</Text>
            <Text style={profileStyles.position}>{employee.position ?? roleConf.label}</Text>
            <View style={profileStyles.heroBadges}>
              <View style={[profileStyles.badge, { backgroundColor: roleConf.color + '44' }]}>
                <Ionicons name={roleConf.icon as any} size={12} color={roleConf.color} />
                <Text style={[profileStyles.badgeText, { color: roleConf.color }]}>{roleConf.label}</Text>
              </View>
              <View style={[profileStyles.badge, { backgroundColor: typeConf.color + '44' }]}>
                <Text style={[profileStyles.badgeText, { color: typeConf.color }]}>{typeConf.label}</Text>
              </View>
              <View style={[profileStyles.badge, { backgroundColor: presenceConf.color + '44' }]}>
                <Ionicons name={presenceConf.icon as any} size={12} color={presenceConf.color} />
                <Text style={[profileStyles.badgeText, { color: presenceConf.color }]}>{presenceConf.label}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Leave stats */}
          <View style={profileStyles.section}>
            <Text style={[profileStyles.sectionTitle, { color: colors.textPrimary }]}>Leave Overview</Text>
            <View style={profileStyles.statsRow}>
              {[
                { label: "Paid Left", value: employee.paidLeaveBalance ?? 0, color: colors.primary },
                { label: "Sick Left", value: employee.sickLeaveBalance ?? 0, color: "#ef4444" },
                { label: "Family Left", value: employee.familyLeaveBalance ?? 0, color: "#10b981" },
                { label: "Used Days", value: totalDays, color: "#f59e0b" },
              ].map(s => (
                <View key={s.label} style={[profileStyles.statBox, { backgroundColor: colors.bgCard, borderColor: s.color + '44' }]}>
                  <Text style={[profileStyles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={[profileStyles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Contact info */}
          <View style={profileStyles.section}>
            <Text style={[profileStyles.sectionTitle, { color: colors.textPrimary }]}>Contact & Details</Text>
            <View style={[profileStyles.infoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <InfoRow icon="mail-outline" value={employee.email} colors={colors} />
              <InfoRow icon="call-outline" value={employee.phone} colors={colors} />
              <InfoRow icon="business-outline" value={employee.department} colors={colors} />
              <InfoRow icon="location-outline" value={employee.position} colors={colors} />
              {supervisor && <InfoRow icon="person-circle-outline" value={`Supervisor: ${supervisor.name}`} colors={colors} />}
              {employee.travelAllowance && (
                <InfoRow icon="card-outline" value={`Travel Allowance: ${employee.travelAllowance.toLocaleString()} AMD`} colors={colors} />
              )}
              {employee.createdAt && (
                <InfoRow icon="calendar-outline" value={`Joined: ${new Date(employee.createdAt).toLocaleDateString()}`} colors={colors} />
              )}
              {employee.lastLoginAt && (
                <InfoRow icon="time-outline" value={`Last seen: ${new Date(employee.lastLoginAt).toLocaleDateString()}`} colors={colors} />
              )}
            </View>
          </View>

          {/* Recent leaves */}
          <View style={profileStyles.section}>
            <View style={profileStyles.sectionHeader}>
              <Text style={[profileStyles.sectionTitle, { color: colors.textPrimary }]}>Leave History</Text>
              <View style={[profileStyles.badge, { backgroundColor: colors.warning + '22' }]}>
                <Text style={[profileStyles.badgeText, { color: colors.warning }]}>{pendingLeaves.length} pending</Text>
              </View>
            </View>
            {leaves === undefined ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
            ) : leaves.length === 0 ? (
              <View style={profileStyles.emptyLeaves}>
                <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
                <Text style={[profileStyles.emptyText, { color: colors.textSecondary }]}>No leave history</Text>
              </View>
            ) : (
              <View style={[profileStyles.leaveList, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                {leaves.slice(0, 5).map(l => {
                  const sc = l.status === 'approved' ? colors.success : l.status === 'pending' ? colors.warning : colors.error;
                  return (
                    <View key={l._id} style={[profileStyles.leaveItem, { borderBottomColor: colors.border }]}>
                      <View style={[profileStyles.leaveDot, { backgroundColor: sc }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[profileStyles.leaveType, { color: colors.textPrimary }]}>{l.type.charAt(0).toUpperCase() + l.type.slice(1)} · {l.days}d</Text>
                        <Text style={[profileStyles.leaveDates, { color: colors.textMuted }]}>{l.startDate}{l.endDate !== l.startDate ? ` → ${l.endDate}` : ''}</Text>
                        <Text style={[profileStyles.leaveReason, { color: colors.textMuted }]} numberOfLines={1}>{l.reason}</Text>
                      </View>
                      <View style={[profileStyles.statusBadge, { backgroundColor: sc + '22' }]}>
                        <Text style={[profileStyles.statusText, { color: sc }]}>
                          {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
        </View>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>

  );
}

export default function Team() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom;

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  useEffect(() => {
    AsyncStorage.getItem('user_id').then(id => setUserId(id));
  }, []);

  const users = useQuery(api.users.getAllUsers, userId ? { requesterId: userId as any } : 'skip');
  const isLoading = users === undefined;

  const stats = useMemo(() => {
    if (!users) return { total: 0, staff: 0, contractors: 0, admins: 0, supervisors: 0 };
    const active = (users as any[]).filter((u: any) => u.isActive);
    return {
      total: active.length,
      staff: active.filter((u: any) => u.employeeType === 'staff').length,
      contractors: active.filter((u: any) => u.employeeType === 'contractor').length,
      admins: active.filter((u: any) => u.role === 'admin').length,
      supervisors: active.filter((u: any) => u.role === 'supervisor').length,
    };
  }, [users]);

  const filtered = useMemo(() => {
    if (!users) return [];
    return (users as any[]).filter((u: any) => {
      const matchSearch = !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        (u.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (u.department ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (u.position ?? '').toLowerCase().includes(search.toLowerCase());
      const matchRole = filterRole === 'all' || u.role === filterRole;
      return matchSearch && matchRole && u.isActive;
    });
  }, [users, search, filterRole]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomOffset + 16 }}
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
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Team</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{stats.total} members · {stats.staff} staff · {stats.contractors} contractors</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={{ position: 'relative', marginBottom: 16 }}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {[
              { label: 'Total',       value: stats.total,       color: colors.primary, icon: 'people-outline'  },
              { label: 'Staff',       value: stats.staff,       color: colors.success, icon: 'person-outline'  },
              { label: 'Contractors', value: stats.contractors, color: '#f59e0b',      icon: 'briefcase-outline'},
              { label: 'Supervisors', value: stats.supervisors, color: colors.primary,      icon: 'shield-outline'  },
            ].map(s => (
              <View key={s.label} style={[styles.statCard, { borderColor: s.color + '44', backgroundColor: colors.bgCard }]}>
                <Ionicons name={s.icon as any} size={18} color={s.color} />
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
              </View>
            ))}
            {/* Spacer for scroll end */}
            <View style={{ width: 16 }} />
          </ScrollView>
          {/* Gradient fade on right */}
          <LinearGradient
            colors={[colors.bg + '00', colors.bg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 40,
              pointerEvents: 'none',
            }}
          />
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search by name, department, role..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Role filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 12 }}>
          {['all', 'admin', 'supervisor', 'employee'].map(r => (
            <TouchableOpacity key={r} onPress={() => setFilterRole(r)}
              style={[styles.filterChip, { backgroundColor: filterRole === r ? colors.primary : colors.bgCard, borderColor: filterRole === r ? colors.primary : colors.border }]}>
              <Text style={[styles.filterText, { color: filterRole === r ? '#fff' : colors.textMuted }]}>
                {r === 'all' ? 'All Roles' : ROLE_CONFIG[r]?.label ?? r}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* List */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No team members found</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((m: any, i: number) => {
              const roleConf = ROLE_CONFIG[m.role] ?? ROLE_CONFIG.employee;
              const typeConf = TYPE_CONFIG[m.employeeType] ?? { label: m.employeeType, color: colors.primary };
              const presConf = PRESENCE_CONFIG[m.presenceStatus ?? 'available'] ?? PRESENCE_CONFIG.available;
              const supervisor = (users as any[])?.find((u: any) => u._id === m.supervisorId);
              return (
                <TouchableOpacity key={m._id} style={[styles.memberCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                  activeOpacity={0.75} onPress={() => setSelectedEmployee(m)}>
                  {/* Avatar */}
                  <Avatar name={m.name} avatarUrl={m.avatarUrl} size={46} index={i} />

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, { color: colors.textPrimary }]}>{m.name}</Text>
                    <Text style={[styles.memberRole, { color: colors.textMuted }]}>
                      {m.position ?? roleConf.label}{m.department ? ` · ${m.department}` : ''}
                    </Text>
                    {supervisor && (
                      <Text style={[styles.supervisorText, { color: colors.textMuted }]}>↑ {supervisor.name}</Text>
                    )}
                  </View>

                  {/* Right side */}
                  <View style={styles.cardRight}>
                    <View style={[styles.statusPill, { backgroundColor: presConf.color + '22' }]}>
                      <Ionicons name={presConf.icon as any} size={10} color={presConf.color} />
                      <Text style={[styles.statusText, { color: presConf.color }]}>{presConf.label}</Text>
                    </View>
                    <View style={[styles.typePill, { backgroundColor: typeConf.color + '22' }]}>
                      <Text style={[styles.typeText, { color: typeConf.color }]}>{typeConf.label}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginTop: 2 }} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Employee Profile Modal */}
      {selectedEmployee && (
        <EmployeeProfileModal
          employee={selectedEmployee}
          allUsers={users ?? []}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { ...Typography.h1 },
  subtitle: { ...Typography.caption, marginTop: 2 },

  // Stats
  statCard: { borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', minWidth: 85, gap: 3 },
  statValue: { ...Typography.h2, fontWeight: '700' },
  statLabel: { ...Typography.label },

  // Search
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radius.lg, borderWidth: 1, marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  searchInput: { flex: 1, ...Typography.body },

  // Filters
  filterChip: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { },
  filterText: { ...Typography.captionMedium },
  filterTextActive: { color: '#fff' },

  // Empty / Loading
  centered: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyText: { ...Typography.bodyMedium },

  // Member cards
  list: { paddingHorizontal: 16, gap: 10 },
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radius.lg, borderWidth: 1, padding: 12 },
  avatarCircle: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { ...Typography.bodyMedium, color: '#fff', fontWeight: '700' },
  memberName: { ...Typography.bodyMedium },
  memberRole: { ...Typography.caption, marginTop: 1 },
  supervisorText: { ...Typography.caption, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.full },
  statusText: { ...Typography.label, fontSize: 10 },
  typePill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.full },
  typeText: { ...Typography.label, fontSize: 10 },
});

const profileStyles = StyleSheet.create({
  overlay: { flex: 1 },
  container: { flex: 1, overflow: 'hidden' },
  bar: { alignItems: 'center', paddingVertical: 12 },
  barHandle: { width: 40, height: 4, borderRadius: 2 },

  // Hero section
  hero: { paddingTop: 16, paddingBottom: 32, alignItems: 'center', paddingHorizontal: 24 },
  closeBtn: { alignSelf: 'flex-end', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  name: { ...Typography.h1, color: '#fff', textAlign: 'center' },
  position: { ...Typography.body, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center' },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  badgeText: { ...Typography.label, fontSize: 11, fontWeight: '600' },

  // Sections
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { ...Typography.h3, marginBottom: 12 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, borderRadius: Radius.md, borderWidth: 1, padding: 10, alignItems: 'center' },
  statValue: { ...Typography.h2, fontWeight: '700' },
  statLabel: { ...Typography.label, marginTop: 2, textAlign: 'center' },

  // Info card
  infoCard: { borderRadius: Radius.lg, borderWidth: 1, padding: 14, gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { ...Typography.body, flex: 1 },

  // Leaves
  leaveList: { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  leaveItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderBottomWidth: 1 },
  leaveDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  leaveType: { ...Typography.captionMedium },
  leaveDates: { ...Typography.caption, marginTop: 1 },
  leaveReason: { ...Typography.caption, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  statusText: { ...Typography.label, fontSize: 10 },
  emptyLeaves: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyText: { ...Typography.caption },
});


