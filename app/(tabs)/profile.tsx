import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Switch, Modal, TextInput, Platform, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Typography, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
// import { FaceRegistration } from '@/components/FaceRegistration'; // Disabled for Expo Go

const PRESENCE_OPTIONS = [
  { value: 'available',     label: 'Available',     color: '#10b981', icon: 'checkmark-circle' },
  { value: 'in_meeting',    label: 'In Meeting',    color: '#f59e0b', icon: 'calendar'         },
  { value: 'in_call',       label: 'In Call',       color: '#06b6d4', icon: 'call'             },
  { value: 'out_of_office', label: 'Out of Office', color: '#ef4444', icon: 'home'             },
  { value: 'busy',          label: 'Busy',          color: '#f97316', icon: 'ban'              },
];

const LEAVE_COLORS: Record<string, string> = {
  paid: '#3b82f6', sick: '#ef4444', family: '#10b981', doctor: '#06b6d4', unpaid: '#f59e0b',
};

// Avatar component that shows image if available, otherwise shows gradient with initials
function Avatar({ avatarUrl, initials, isDark }: { avatarUrl?: string; initials: string; isDark: boolean }) {
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={styles.avatarImage}
      />
    );
  }

  const gradientColors = isDark 
    ? ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.08)']
    : ['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.15)'];
  
  return (
    <LinearGradient colors={gradientColors} style={styles.avatarCircle}>
      <Text style={styles.avatarText}>{initials}</Text>
    </LinearGradient>
  );
}

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user: authUser, signOut } = useAuth();
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom;

  const userId = authUser?.userId ?? null;

  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPresenceModal, setShowPresenceModal] = useState(false);
  // const [showFaceRegistration, setShowFaceRegistration] = useState(false); // Disabled for Expo Go
  const [notifEnabled, setNotifEnabled] = useState(true);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [saving, setSaving] = useState(false);

  const user = useQuery(api.users.getUserById, userId ? { userId: userId as Id<'users'> } : 'skip');
  const leaves = useQuery(api.leaves.getUserLeaves, userId ? { userId: userId as Id<'users'> } : 'skip');

  const updateUser = useMutation(api.users.updateUser);
  const updatePresence = useMutation(api.users.updatePresenceStatus);

  const leavesLoading = leaves === undefined;

  const leaveStats = useMemo(() => {
    if (!leaves || !Array.isArray(leaves)) return { total: 0, approved: 0, pending: 0, totalDays: 0 };
    return {
      total: leaves.length,
      approved: leaves.filter(l => l.status === 'approved').length,
      pending: leaves.filter(l => l.status === 'pending').length,
      totalDays: leaves.filter(l => l.status === 'approved').reduce((s, l) => s + (l.days ?? 0), 0),
    };
  }, [leaves]);

  const recentLeaves = useMemo(() => {
    if (!Array.isArray(leaves)) return [];
    return leaves.slice(0, 5);
  }, [leaves]);

  const presence = PRESENCE_OPTIONS.find(p => p.value === (user as any)?.presenceStatus) ?? PRESENCE_OPTIONS[0];
  const initials = user ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  const openEdit = () => {
    setEditName(user?.name ?? '');
    setEditPhone((user as any)?.phone ?? '');
    setEditDepartment(user?.department ?? '');
    setEditPosition(user?.position ?? '');
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateUser({
        userId: userId as Id<'users'>,
        name: editName.trim() || undefined,
        phone: editPhone.trim() || undefined,
        department: editDepartment.trim() || undefined,
        position: editPosition.trim() || undefined,
      });
      setShowEditModal(false);
      Alert.alert('Saved', 'Profile updated successfully!');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePresenceChange = async (status: string) => {
    if (!userId) return;
    try {
      await updatePresence({ userId: userId as Id<'users'>, status: status as any });
      setShowPresenceModal(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update status');
    }
  };

  const logoutMutation = useMutation(api.auth.logout);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    console.log('[Profile] handleLogout called, opening modal');
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    console.log('[Profile] confirmLogout called');
    setShowLogoutModal(false);
    try {
      const currentUserId = userId;
      if (currentUserId) {
        logoutMutation({ userId: currentUserId as Id<'users'> }).catch((e: any) => {
          console.log('[Profile] logoutMutation error (ignored):', e?.message);
        });
      }
      console.log('[Profile] calling signOut...');
      await signOut();
      console.log('[Profile] signOut done');
    } catch (e: any) {
      console.log('[Profile] signOut threw:', e?.message);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
        <TouchableOpacity style={[styles.logoutBtn, { margin: 16, borderColor: colors.error + '44' }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Profile</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity 
              style={[styles.editHeaderBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]} 
              onPress={() => router.push('/settings')}
            >
              <Ionicons name="settings-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.editHeaderBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={openEdit}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.editHeaderBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={toggleTheme}>
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero card */}
        <LinearGradient colors={isDark ? [colors.bg, colors.bgCard, colors.primaryDark] : [colors.primaryDark, colors.primary, colors.primaryLight]} style={styles.heroCard}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {/* Avatar */}
          <Avatar avatarUrl={(user as any)?.avatarUrl} initials={initials} isDark={isDark} />
          <Text style={[styles.userName, { color: '#fff' }]}>{user.name}</Text>
          <Text style={[styles.userPosition, { color: 'rgba(255,255,255,0.75)' }]}>{user.position ?? user.role}</Text>
          {user.email && <Text style={[styles.userEmail, { color: 'rgba(255,255,255,0.55)' }]}>{user.email}</Text>}

          {/* Role & type badges */}
          <View style={styles.heroBadges}>
            <View style={styles.heroBadge}>
              <Ionicons name="shield-checkmark-outline" size={12} color={colors.primaryLight} />
              <Text style={[styles.heroBadgeText, { color: '#fff' }]}>
                {user.role === 'admin' ? 'Admin' : user.role === 'supervisor' ? 'Supervisor' : 'Employee'}
              </Text>
            </View>
            {(user as any).employeeType && (
              <View style={[styles.heroBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={[styles.heroBadgeText, { color: '#fff' }]}>
                  {(user as any).employeeType === 'contractor' ? 'Contractor' : 'Staff'}
                </Text>
              </View>
            )}
          </View>

          {/* Presence status */}
          <TouchableOpacity style={[styles.presenceBtn, { backgroundColor: presence.color + '33', borderColor: presence.color + '66' }]}
            onPress={() => setShowPresenceModal(true)}>
            <Ionicons name={presence.icon as any} size={14} color={presence.color} />
            <Text style={[styles.presenceBtnText, { color: presence.color }]}>{presence.label}</Text>
            <Ionicons name="chevron-down" size={12} color={presence.color} />
          </TouchableOpacity>

          {/* Leave balances */}
          <View style={styles.balancesRow}>
            {[
              { label: 'Paid', value: user.paidLeaveBalance ?? 0, color: '#a5b4fc' },
              { label: 'Sick', value: user.sickLeaveBalance ?? 0, color: '#fca5a5' },
              { label: 'Family', value: (user as any).familyLeaveBalance ?? 0, color: '#6ee7b7' },
            ].map(b => (
              <View key={b.label} style={styles.balanceItem}>
                <Text style={[styles.balanceValue, { color: b.color }]}>{b.value}d</Text>
                <Text style={[styles.balanceLabel, { color: 'rgba(255,255,255,0.6)' }]}>{b.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Info section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Contact & Info</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            {[
              { icon: 'mail-outline',     label: 'Email',      value: user.email },
              { icon: 'call-outline',     label: 'Phone',      value: (user as any).phone },
              { icon: 'business-outline', label: 'Department', value: user.department },
              { icon: 'location-outline', label: 'Position',   value: user.position },
              { icon: 'card-outline',     label: 'Travel Allowance', value: (user as any).travelAllowance ? `${(user as any).travelAllowance.toLocaleString()} AMD` : null },
              { icon: 'calendar-outline', label: 'Joined',     value: (user as any).createdAt ? new Date((user as any).createdAt).toLocaleDateString() : null },
              { icon: 'time-outline',     label: 'Last Login', value: (user as any).lastLoginAt ? new Date((user as any).lastLoginAt).toLocaleDateString() : null },
            ].filter(r => r.value).map((row, i, arr) => (
              <View key={row.label} style={[styles.infoRow, i < arr.length - 1 && { ...styles.infoRowBorder, borderBottomColor: colors.border }]}>
                <View style={[styles.infoIconWrap, { backgroundColor: colors.primary + '22' }]}>
                  <Ionicons name={row.icon as any} size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{row.label}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Leave stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Leave Overview</Text>
          {leavesLoading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={styles.statsGrid}>
              {[
                { label: 'Total Requests', value: leaveStats.total,     color: colors.primary },
                { label: 'Approved',       value: leaveStats.approved,  color: colors.success },
                { label: 'Pending',        value: leaveStats.pending,   color: colors.warning },
                { label: 'Days Used',      value: leaveStats.totalDays, color: colors.primary      },
              ].map(s => (
                <View key={s.label} style={[styles.statBox, { backgroundColor: colors.bgCard, borderColor: s.color + '44' }]}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Recent leaves */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Recent Leave History</Text>
          {leavesLoading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : recentLeaves.length === 0 ? (
            <View style={[styles.emptyLeaves, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No leave history yet</Text>
            </View>
          ) : (
            <View style={[styles.leaveList, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {recentLeaves.map((l, i) => {
                const sc = l.status === 'approved' ? colors.success : l.status === 'pending' ? colors.warning : colors.error;
                const tc = LEAVE_COLORS[l.type] ?? colors.primary;
                return (
                  <View key={l._id} style={[styles.leaveItem, i < recentLeaves.length - 1 && { ...styles.leaveItemBorder, borderBottomColor: colors.border }]}>
                    <View style={[styles.leaveDot, { backgroundColor: tc }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.leaveType, { color: colors.textPrimary }]}>{l.type.charAt(0).toUpperCase() + l.type.slice(1)} · {l.days}d</Text>
                      <Text style={[styles.leaveDates, { color: colors.textMuted }]}>{l.startDate}{l.endDate !== l.startDate ? ` → ${l.endDate}` : ''}</Text>
                      <Text style={[styles.leaveReason, { color: colors.textMuted }]} numberOfLines={1}>{l.reason}</Text>
                    </View>
                    <View style={[styles.leaveBadge, { backgroundColor: sc + '22' }]}>
                      <Text style={[styles.leaveBadgeText, { color: sc }]}>
                        {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Settings</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.infoRow, styles.infoRowBorder, { borderBottomColor: colors.border }]}>
              <View style={[styles.infoIconWrap, { backgroundColor: colors.primary + '22' }]}>
                <Ionicons name="notifications-outline" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.infoValue, { flex: 1, color: colors.textPrimary }]}>Push Notifications</Text>
              <Switch value={notifEnabled} onValueChange={setNotifEnabled}
                trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
            </View>
            {/* Disabled for Expo Go */}
            {/* <TouchableOpacity style={[styles.infoRow, styles.infoRowBorder, { borderBottomColor: colors.border }]} onPress={() => setShowFaceRegistration(true)}>
              <View style={[styles.infoIconWrap, { backgroundColor: colors.primary + '22' }]}>
                <Ionicons name="scan-outline" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.infoValue, { flex: 1, color: colors.textPrimary }]}>
                {user?.faceRegisteredAt ? 'Update Face ID' : 'Register Face ID'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity> */}
            <TouchableOpacity style={styles.infoRow} onPress={openEdit}>
              <View style={[styles.infoIconWrap, { backgroundColor: colors.primary + '22' }]}>
                <Ionicons name="create-outline" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.infoValue, { flex: 1, color: colors.textPrimary }]}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutBtn,
            { borderColor: colors.error + '44' },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => {
            console.log('[Profile] Sign Out pressed');
            handleLogout();
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
        </Pressable>

        <Text style={[styles.version, { color: colors.textMuted }]}>HRLeave v1.0.0 · Made with ❤️</Text>
      </ScrollView>

      {/* Face ID Registration Modal - Disabled for Expo Go */}
      {/* {userId && (
        <FaceRegistration
          visible={showFaceRegistration}
          userId={userId as Id<'users'>}
          onClose={() => setShowFaceRegistration(false)}
          onSuccess={() => {
            setShowFaceRegistration(false);
            // Optionally refresh user data here
          }}
        />
      )} */}

      {/* Custom logout confirmation modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: isDark ? 'rgba(6,14,30,0.85)' : 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
          onPress={() => setShowLogoutModal(false)}
        >
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 340 }}>
            {/* Card */}
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bg] : [colors.bgCard, colors.bgElevated]}
              style={{
                borderRadius: 28,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: '#3b82f6',
                shadowOffset: { width: 0, height: 16 },
                shadowOpacity: 0.4,
                shadowRadius: 40,
                elevation: 20,
              }}
            >
              {/* Top accent stripe */}
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ height: 4, width: '100%' }}
              />

              <View style={{ padding: 28, alignItems: 'center', gap: 0 }}>
                {/* Icon */}
                <LinearGradient
                  colors={isDark ? ['#ef444422', '#dc262622'] : ['#fee2e2', '#fecaca']}
                  style={{
                    width: 72, height: 72, borderRadius: 24,
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: 20,
                    shadowColor: '#ef4444',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 16,
                    borderWidth: isDark ? 1 : 0,
                    borderColor: isDark ? colors.error + '44' : 'transparent',
                  }}
                >
                  <Ionicons name="log-out-outline" size={34} color={colors.error} />
                </LinearGradient>

                {/* Title */}
                <Text style={{
                  fontSize: 22, fontWeight: '700',
                  color: colors.textPrimary,
                  textAlign: 'center',
                  marginBottom: 8,
                  letterSpacing: -0.3,
                }}>
                  Sign Out
                </Text>

                {/* Subtitle */}
                <Text style={{
                  fontSize: 14, fontWeight: '400',
                  color: colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: 20,
                  marginBottom: 28,
                  paddingHorizontal: 8,
                }}>
                  You'll need to sign in again to{'\n'}access your account.
                </Text>

                {/* Buttons */}
                <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                  {/* Cancel */}
                  <Pressable
                    onPress={() => setShowLogoutModal(false)}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 16,
                      alignItems: 'center',
                      backgroundColor: colors.bgElevated,
                      borderWidth: 1,
                      borderColor: colors.border,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{
                      fontSize: 15, fontWeight: '600',
                      color: colors.textPrimary,
                    }}>Cancel</Text>
                  </Pressable>

                  {/* Confirm */}
                  <Pressable
                    onPress={confirmLogout}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 16,
                      alignItems: 'center',
                      overflow: 'hidden',
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <LinearGradient
                      colors={[colors.error, '#dc2626']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={{
                        ...StyleSheet.absoluteFillObject,
                        borderRadius: 16,
                      }}
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="log-out-outline" size={16} color="#fff" />
                      <Text style={{
                        fontSize: 15, fontWeight: '700',
                        color: '#fff',
                      }}>Sign Out</Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Presence Modal */}
      <Modal visible={showPresenceModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPresenceModal(false)}>
          <View style={[styles.presenceModal, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.presenceModalTitle, { color: colors.textPrimary }]}>Set Status</Text>
            {PRESENCE_OPTIONS.map(p => (
              <TouchableOpacity key={p.value} style={[styles.presenceOption,
                (user as any)?.presenceStatus === p.value && { backgroundColor: p.color + '22' }]}
                onPress={() => handlePresenceChange(p.value)}>
                <Ionicons name={p.icon as any} size={20} color={p.color} />
                <Text style={[styles.presenceOptionText, { color: p.color }]}>{p.label}</Text>
                {(user as any)?.presenceStatus === p.value && (
                  <Ionicons name="checkmark" size={16} color={p.color} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.editModal, { backgroundColor: colors.bg }]}>
          <View style={[styles.editModalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={[styles.editModalCancel, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.editModalTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <Text style={[styles.editModalSave, { color: colors.primary }]}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            {[
              { label: 'Full Name',   value: editName,       setter: setEditName,       placeholder: 'Your full name'  },
              { label: 'Phone',       value: editPhone,      setter: setEditPhone,      placeholder: '+1 234 567 890' },
              { label: 'Department',  value: editDepartment, setter: setEditDepartment, placeholder: 'e.g. Engineering'},
              { label: 'Position',    value: editPosition,   setter: setEditPosition,   placeholder: 'e.g. Developer'  },
            ].map(f => (
              <View key={f.label} style={{ marginBottom: 16 }}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{f.label}</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]} value={f.value}
                  onChangeText={f.setter} placeholder={f.placeholder}
                  placeholderTextColor={colors.textMuted} />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  pageTitle: { ...Typography.h1 },
  editHeaderBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // Hero
  heroCard: { marginHorizontal: 16, borderRadius: Radius.xl, padding: 24, alignItems: 'center', marginBottom: 20, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 10 },
  avatarCircle: { width: 76, height: 76, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  avatarImage: { width: 76, height: 76, borderRadius: 24, marginBottom: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  userName: { ...Typography.h2, color: '#fff', marginBottom: 2, textAlign: 'center' },
  userPosition: { ...Typography.caption, color: 'rgba(255,255,255,0.75)', marginBottom: 2, textAlign: 'center' },
  userEmail: { ...Typography.caption, color: 'rgba(255,255,255,0.55)', marginBottom: 10, textAlign: 'center' },
  heroBadges: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  heroBadgeText: { ...Typography.label, color: '#fff', fontSize: 11 },
  presenceBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, marginBottom: 16 },
  presenceBtnText: { ...Typography.captionMedium },
  balancesRow: { flexDirection: 'row', gap: 20 },
  balanceItem: { alignItems: 'center' },
  balanceValue: { ...Typography.h3, fontWeight: '700' },
  balanceLabel: { ...Typography.label, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  // Sections
  section: { paddingHorizontal: 16, marginBottom: 18 },
  sectionTitle: { ...Typography.label, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },

  // Info card
  infoCard: { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  infoRowBorder: { borderBottomWidth: 1 },
  infoIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { ...Typography.label, fontSize: 10, marginBottom: 2 },
  infoValue: { ...Typography.bodyMedium },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { width: '47%', borderRadius: Radius.md, borderWidth: 1, padding: 12, alignItems: 'center' },
  statValue: { ...Typography.h2, fontWeight: '700' },
  statLabel: { ...Typography.label, marginTop: 2, textAlign: 'center' },

  // Leave history
  leaveList: { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  leaveItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12 },
  leaveItemBorder: { borderBottomWidth: 1 },
  leaveDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  leaveType: { ...Typography.captionMedium },
  leaveDates: { ...Typography.caption, marginTop: 1 },
  leaveReason: { ...Typography.caption, marginTop: 1 },
  leaveBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, alignSelf: 'flex-start' },
  leaveBadgeText: { ...Typography.label, fontSize: 10 },
  emptyLeaves: { borderRadius: Radius.lg, borderWidth: 1, padding: 24, alignItems: 'center', gap: 8 },
  emptyText: { ...Typography.caption },

  // Logout
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 1, marginBottom: 12 },
  logoutText: { ...Typography.bodyMedium },
  version: { ...Typography.label, textAlign: 'center', marginBottom: 8 },

  // Presence modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  presenceModal: { borderRadius: Radius.xl, padding: 20, width: '100%', borderWidth: 1 },
  presenceModalTitle: { ...Typography.h3, marginBottom: 16, textAlign: 'center' },
  presenceOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: Radius.md, marginBottom: 4 },
  presenceOptionText: { ...Typography.bodyMedium },

  // Edit modal
  editModal: { flex: 1 },
  editModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  editModalTitle: { ...Typography.bodyMedium, fontWeight: '600' },
  editModalCancel: { ...Typography.body },
  editModalSave: { ...Typography.body, fontWeight: '600' },
  fieldLabel: { ...Typography.captionMedium, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, ...Typography.body },
});


