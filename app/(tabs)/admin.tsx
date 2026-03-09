import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator,
  RefreshControl, Alert, Platform, Share, TextInput, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

type AdminTab = 'pending' | 'joinRequests' | 'invite';

function TabButton({ label, active, count, onPress, colors }: {
  label: string; active: boolean; count?: number; onPress: () => void; colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabBtn, active && { backgroundColor: colors.primary + '15' }]}
    >
      <Text style={[styles.tabBtnText, { color: active ? colors.primary : colors.textMuted }]}>
        {label}
      </Text>
      {(count ?? 0) > 0 && (
        <View style={[styles.tabBadge, { backgroundColor: colors.error }]}>
          <Text style={styles.tabBadgeText}>{count! > 99 ? '99+' : count}</Text>
        </View>
      )}
      {active && <View style={[styles.tabUnderline, { backgroundColor: colors.primary }]} />}
    </TouchableOpacity>
  );
}

// ── Pending Users Tab ──────────────────────────────────────────────
function PendingUsersTab({ userId, colors, isDark }: { userId: string; colors: any; isDark: boolean }) {
  const pendingUsers = useQuery(api.users.getPendingApprovalUsers, { adminId: userId as Id<'users'> });
  const approveUser = useMutation(api.users.approveUser);
  const rejectUser = useMutation(api.users.rejectUser);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (targetUserId: string) => {
    setProcessingId(targetUserId);
    try {
      await approveUser({ adminId: userId as Id<'users'>, userId: targetUserId as Id<'users'> });
      Alert.alert('Approved', 'User has been approved successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to approve user');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = (targetUserId: string, name: string) => {
    Alert.alert('Reject User', `Are you sure you want to reject ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          setProcessingId(targetUserId);
          try {
            await rejectUser({ adminId: userId as Id<'users'>, userId: targetUserId as Id<'users'> });
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Failed to reject user');
          } finally {
            setProcessingId(null);
          }
        },
      },
    ]);
  };

  if (pendingUsers === undefined) {
    return <View style={styles.centerWrap}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  if (pendingUsers.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <LinearGradient colors={[colors.success + '18', colors.success + '08']} style={styles.emptyIcon}>
          <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
        </LinearGradient>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Pending Users</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>All user registrations have been processed.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={pendingUsers}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const isProcessing = processingId === item._id;
        const initials = (item.name ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
        return (
          <View style={[styles.userCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.userRow}>
              <View style={[styles.userAvatar, { backgroundColor: colors.primary + '22' }]}>
                <Text style={[styles.userAvatarText, { color: colors.primary }]}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.userEmail, { color: colors.textMuted }]}>{item.email}</Text>
                {item.department && (
                  <Text style={[styles.userDept, { color: colors.primary }]}>{item.department}</Text>
                )}
                <Text style={[styles.userDate, { color: colors.textMuted }]}>
                  Registered {item._creationTime ? new Date(item._creationTime).toLocaleDateString() : 'recently'}
                </Text>
              </View>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.rejectBtn, { borderColor: colors.error + '44' }]}
                onPress={() => handleReject(item._id, item.name)}
                disabled={isProcessing}
              >
                {isProcessing ? <ActivityIndicator size="small" color={colors.error} /> : (
                  <>
                    <Ionicons name="close" size={16} color={colors.error} />
                    <Text style={[styles.rejectBtnText, { color: colors.error }]}>Reject</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveBtn, { backgroundColor: colors.success }]}
                onPress={() => handleApprove(item._id)}
                disabled={isProcessing}
              >
                {isProcessing ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
    />
  );
}

// ── Join Requests Tab ──────────────────────────────────────────────
function JoinRequestsTab({ userId, colors, isDark }: { userId: string; colors: any; isDark: boolean }) {
  const joinRequests = useQuery(api.organizations.getJoinRequests, { adminId: userId as Id<'users'> });
  const approveJoinRequest = useMutation(api.organizations.approveJoinRequest);
  const rejectJoinRequest = useMutation(api.organizations.rejectJoinRequest);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingRequests = useMemo(() =>
    (joinRequests ?? []).filter((r: any) => r.status === 'pending'),
    [joinRequests]
  );

  const handleApprove = async (inviteId: string) => {
    setProcessingId(inviteId);
    try {
      await approveJoinRequest({
        adminId: userId as Id<'users'>,
        inviteId: inviteId as Id<'organizationInvites'>,
        role: 'employee',
        department: '',
        position: '',
        passwordHash: '',
      });
      Alert.alert('Approved', 'Join request has been approved.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = (inviteId: string) => {
    Alert.alert('Reject Request', 'Are you sure you want to reject this join request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          setProcessingId(inviteId);
          try {
            await rejectJoinRequest({
              adminId: userId as Id<'users'>,
              inviteId: inviteId as Id<'organizationInvites'>,
            });
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Failed to reject');
          } finally {
            setProcessingId(null);
          }
        },
      },
    ]);
  };

  if (joinRequests === undefined) {
    return <View style={styles.centerWrap}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  if (pendingRequests.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <LinearGradient colors={[colors.success + '18', colors.success + '08']} style={styles.emptyIcon}>
          <Ionicons name="mail-open-outline" size={48} color={colors.success} />
        </LinearGradient>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Join Requests</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>No pending requests to join your organization.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={pendingRequests}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const isProcessing = processingId === item._id;
        return (
          <View style={[styles.userCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.userRow}>
              <View style={[styles.userAvatar, { backgroundColor: '#8b5cf6' + '22' }]}>
                <Ionicons name="person-add-outline" size={22} color="#8b5cf6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>
                  {(item as any).requestedByName ?? 'Unknown'}
                </Text>
                <Text style={[styles.userEmail, { color: colors.textMuted }]}>
                  {(item as any).requestedByEmail ?? ''}
                </Text>
                <Text style={[styles.userDate, { color: colors.textMuted }]}>
                  Requested {item._creationTime ? new Date(item._creationTime).toLocaleDateString() : 'recently'}
                </Text>
              </View>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.rejectBtn, { borderColor: colors.error + '44' }]}
                onPress={() => handleReject(item._id)}
                disabled={isProcessing}
              >
                <Ionicons name="close" size={16} color={colors.error} />
                <Text style={[styles.rejectBtnText, { color: colors.error }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveBtn, { backgroundColor: colors.success }]}
                onPress={() => handleApprove(item._id)}
                disabled={isProcessing}
              >
                {isProcessing ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
    />
  );
}

// ── Invite Link Tab ────────────────────────────────────────────────
function InviteLinkTab({ userId, colors, isDark }: { userId: string; colors: any; isDark: boolean }) {
  const generateInviteToken = useMutation(api.organizations.generateInviteToken);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateInviteToken({
        adminId: userId as Id<'users'>,
        inviteEmail: inviteEmail.trim() || undefined,
      });
      const token = (result as any)?.token ?? result;
      const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000';
      const link = `${webUrl}/join?token=${token}`;
      setInviteLink(link);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to generate invite link');
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!inviteLink) return;
    try {
      await Share.share({
        message: `Join our organization on HRLeave!\n\n${inviteLink}`,
        title: 'Join Organization',
      });
    } catch {}
  };

  const handleCopy = () => {
    if (!inviteLink) return;
    Alert.alert('Link Copied', 'The invite link has been shared. You can also share it using the Share button.');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      {/* Info card */}
      <View style={[styles.infoCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
        <Ionicons name="link-outline" size={20} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.primary }]}>
          Generate an invite link to share with new employees. They can use it to join your organization.
        </Text>
      </View>

      {/* Email input (optional) */}
      <View>
        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
          Email (optional)
        </Text>
        <TextInput
          style={[styles.emailInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="employee@company.com"
          placeholderTextColor={colors.textMuted}
          value={inviteEmail}
          onChangeText={setInviteEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Generate button */}
      <TouchableOpacity onPress={handleGenerate} disabled={generating} activeOpacity={0.85}>
        <LinearGradient
          colors={isDark ? [colors.primaryDark, colors.primary] : [colors.primary, colors.primaryLight]}
          style={styles.generateBtn}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.generateBtnText}>Generate Invite Link</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Generated link display */}
      {inviteLink && (
        <View style={[styles.linkCard, { backgroundColor: colors.bgCard, borderColor: colors.success + '44' }]}>
          <View style={[styles.linkIconWrap, { backgroundColor: colors.success + '18' }]}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          </View>
          <Text style={[styles.linkTitle, { color: colors.textPrimary }]}>Invite Link Generated!</Text>
          <View style={[styles.linkBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]} numberOfLines={2}>
              {inviteLink}
            </Text>
          </View>
          <View style={styles.linkActions}>
            <TouchableOpacity
              style={[styles.linkActionBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              onPress={handleCopy}
            >
              <Ionicons name="copy-outline" size={18} color={colors.textPrimary} />
              <Text style={[styles.linkActionText, { color: colors.textPrimary }]}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.linkActionBtn, { backgroundColor: colors.primary }]} onPress={handleShare}>
              <Ionicons name="share-outline" size={18} color="#fff" />
              <Text style={[styles.linkActionText, { color: '#fff' }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ── Main Admin Screen ──────────────────────────────────────────────
export default function AdminPanel() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;

  const userId = user?.userId ?? null;
  const userRole = user?.role;
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const [activeTab, setActiveTab] = useState<AdminTab>('pending');

  const pendingUsers = useQuery(
    api.users.getPendingApprovalUsers,
    userId && isAdmin ? { adminId: userId as Id<'users'> } : 'skip'
  );
  const pendingJoinCount = useQuery(
    api.organizations.getPendingJoinRequestCount,
    userId && isAdmin ? { adminId: userId as Id<'users'> } : 'skip'
  );

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.centerWrap}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 16 }]}>Access Denied</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Admin privileges required.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Admin Panel</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.bgCard }]}>
        <TabButton label="Pending Users" active={activeTab === 'pending'}
          count={(pendingUsers ?? []).length} onPress={() => setActiveTab('pending')} colors={colors} />
        <TabButton label="Join Requests" active={activeTab === 'joinRequests'}
          count={pendingJoinCount ?? 0} onPress={() => setActiveTab('joinRequests')} colors={colors} />
        <TabButton label="Invite" active={activeTab === 'invite'}
          onPress={() => setActiveTab('invite')} colors={colors} />
      </View>

      {/* Content */}
      {userId && activeTab === 'pending' && <PendingUsersTab userId={userId} colors={colors} isDark={isDark} />}
      {userId && activeTab === 'joinRequests' && <JoinRequestsTab userId={userId} colors={colors} isDark={isDark} />}
      {userId && activeTab === 'invite' && <InviteLinkTab userId={userId} colors={colors} isDark={isDark} />}
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
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 6, position: 'relative',
  },
  tabBtnText: { fontSize: 13, fontWeight: '600' },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  tabUnderline: {
    position: 'absolute', bottom: 0, height: 3, width: '70%', borderRadius: 2,
  },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIcon: {
    width: 100, height: 100, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  userCard: {
    borderRadius: Radius.lg, borderWidth: 1, padding: 16, gap: 14,
  },
  userRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  userAvatar: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { fontSize: 16, fontWeight: '700' },
  userName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  userEmail: { fontSize: 13, marginBottom: 2 },
  userDept: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  userDate: { fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1,
  },
  rejectBtnText: { fontSize: 14, fontWeight: '600' },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: Radius.md,
  },
  approveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  infoCard: {
    flexDirection: 'row', padding: 14, borderRadius: Radius.lg, borderWidth: 1, gap: 10,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  emailInput: {
    borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: Radius.lg,
  },
  generateBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  linkCard: {
    borderRadius: Radius.lg, borderWidth: 1, padding: 20, alignItems: 'center', gap: 12,
  },
  linkIconWrap: {
    width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  linkTitle: { fontSize: 16, fontWeight: '700' },
  linkBox: {
    width: '100%', padding: 12, borderRadius: Radius.md, borderWidth: 1,
  },
  linkText: { fontSize: 12, lineHeight: 18 },
  linkActions: { flexDirection: 'row', gap: 10, width: '100%' },
  linkActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1,
  },
  linkActionText: { fontSize: 14, fontWeight: '600' },
});
