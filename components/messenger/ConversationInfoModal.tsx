import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
  Alert, Image, TextInput, Switch,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Typography, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import OrgPicker from './OrgPicker';

const AVATAR_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#60a5fa'];

interface ConversationInfoModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: Id<"chatConversations">;
  userId: Id<"users">;
}

export default function ConversationInfoModal({ visible, onClose, conversationId, userId }: ConversationInfoModalProps) {
  const { colors } = useTheme();
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<Id<"organizations"> | null>(null);
  const [search, setSearch] = useState('');

  const convInfo = useQuery(api.messenger.getConversationInfo, { conversationId, userId });
  const orgUsers = useQuery(
    api.users.getUsersByOrganization,
    selectedOrgId ? { organizationId: selectedOrgId, requesterId: userId } : 'skip'
  );

  const addParticipants = useMutation(api.messenger.addParticipants);
  const removeParticipant = useMutation(api.messenger.removeParticipant);
  const leaveConversation = useMutation(api.messenger.leaveConversation);
  const updateConversation = useMutation(api.messenger.updateConversation);
  const toggleMute = useMutation(api.messenger.toggleMute);

  if (!convInfo) return null;

  const isAdmin = convInfo.myRole === 'admin';
  const participantIds = new Set(convInfo.participants.map((p) => p.userId));

  const availableUsers = (orgUsers ?? []).filter(
    (u) => !participantIds.has(u._id) && u.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddUser = async (uid: Id<"users">) => {
    try {
      await addParticipants({ conversationId, adminUserId: userId, userIds: [uid] });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleRemoveUser = (targetId: Id<"users">, name: string) => {
    Alert.alert('Remove Member', `Remove ${name} from this group?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await removeParticipant({ conversationId, adminUserId: userId, targetUserId: targetId });
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleLeave = () => {
    Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          try {
            await leaveConversation({ conversationId, userId });
            onClose();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    try {
      await updateConversation({ conversationId, userId, name: newName.trim() });
      setEditingName(false);
      setNewName('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleToggleMute = async () => {
    try {
      await toggleMute({ conversationId, userId });
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Group Info</Text>
            <View style={{ width: 30 }} />
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Group name */}
            <View style={styles.section}>
              <View style={styles.groupNameRow}>
                {editingName ? (
                  <View style={styles.editNameRow}>
                    <TextInput
                      style={[styles.nameInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
                      value={newName}
                      onChangeText={setNewName}
                      placeholder="Group name"
                      placeholderTextColor={colors.textMuted}
                      autoFocus
                    />
                    <TouchableOpacity onPress={handleSaveName}>
                      <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingName(false)}>
                      <Ionicons name="close-circle" size={28} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={[styles.groupIcon, { backgroundColor: colors.primary + '22' }]}>
                      <Ionicons name="people" size={28} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.groupName, { color: colors.textPrimary }]}>{convInfo.name}</Text>
                      <Text style={[styles.groupMeta, { color: colors.textMuted }]}>
                        {convInfo.participants.length} members · Created {new Date(convInfo.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    {isAdmin && (
                      <TouchableOpacity onPress={() => { setNewName(convInfo.name ?? ''); setEditingName(true); }}>
                        <Ionicons name="pencil" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>

            {/* Mute toggle */}
            <View style={[styles.optionRow, { borderColor: colors.border }]}>
              <Ionicons name={convInfo.isMuted ? 'notifications-off-outline' : 'notifications-outline'} size={20} color={colors.textMuted} />
              <Text style={[styles.optionText, { color: colors.textPrimary }]}>Mute Notifications</Text>
              <Switch value={convInfo.isMuted} onValueChange={handleToggleMute} trackColor={{ true: colors.primary }} />
            </View>

            {/* Members */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Members ({convInfo.participants.length})
                </Text>
                {isAdmin && (
                  <TouchableOpacity onPress={() => setShowAddMembers(!showAddMembers)}>
                    <Ionicons name={showAddMembers ? 'close' : 'person-add-outline'} size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Add members panel */}
              {showAddMembers && isAdmin && (
                <View style={[styles.addPanel, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <OrgPicker userId={userId} selectedOrgId={selectedOrgId} onSelect={setSelectedOrgId} />
                  {selectedOrgId && (
                    <>
                      <TextInput
                        style={[styles.addSearch, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="Search users..."
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                      />
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {availableUsers.map((u) => {
                          const avatarColor = AVATAR_COLORS[(u.name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
                          return (
                            <TouchableOpacity key={u._id} style={styles.addUserRow} onPress={() => handleAddUser(u._id)}>
                              {u.avatarUrl ? (
                                <Image source={{ uri: u.avatarUrl }} style={styles.smallAvatar} />
                              ) : (
                                <View style={[styles.smallAvatar, { backgroundColor: avatarColor }]}>
                                  <Text style={styles.smallAvatarText}>
                                    {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </Text>
                                </View>
                              )}
                              <Text style={[styles.addUserName, { color: colors.textPrimary }]}>{u.name}</Text>
                              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                            </TouchableOpacity>
                          );
                        })}
                        {availableUsers.length === 0 && (
                          <Text style={[styles.noUsers, { color: colors.textMuted }]}>No users to add</Text>
                        )}
                      </ScrollView>
                    </>
                  )}
                </View>
              )}

              {/* Participant list */}
              {convInfo.participants.map((p) => {
                const avatarColor = AVATAR_COLORS[(p.userName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
                const initials = (p.userName ?? '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                return (
                  <View key={p.userId} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                    {p.userAvatarUrl ? (
                      <Image source={{ uri: p.userAvatarUrl }} style={styles.memberAvatar} />
                    ) : (
                      <View style={[styles.memberAvatar, { backgroundColor: avatarColor }]}>
                        <Text style={styles.memberAvatarText}>{initials}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={styles.memberNameRow}>
                        <Text style={[styles.memberName, { color: colors.textPrimary }]}>{p.userName}</Text>
                        {p.role === 'admin' && (
                          <View style={[styles.adminBadge, { backgroundColor: colors.primary + '22' }]}>
                            <Text style={[styles.adminBadgeText, { color: colors.primary }]}>Admin</Text>
                          </View>
                        )}
                        {p.userId === userId && (
                          <Text style={[styles.youLabel, { color: colors.textMuted }]}>You</Text>
                        )}
                      </View>
                      {p.userDepartment && (
                        <Text style={[styles.memberDept, { color: colors.textMuted }]}>{p.userDepartment}</Text>
                      )}
                    </View>
                    {isAdmin && p.userId !== userId && (
                      <TouchableOpacity onPress={() => handleRemoveUser(p.userId, p.userName)}>
                        <Ionicons name="remove-circle-outline" size={20} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Leave group */}
            <TouchableOpacity style={[styles.leaveBtn, { borderColor: colors.error + '44' }]} onPress={handleLeave}>
              <Ionicons name="exit-outline" size={20} color={colors.error} />
              <Text style={[styles.leaveText, { color: colors.error }]}>Leave Group</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { ...Typography.h3 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { ...Typography.h3 },
  groupNameRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  groupIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  groupName: { ...Typography.h2 },
  groupMeta: { ...Typography.caption, marginTop: 2 },
  editNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  nameInput: { flex: 1, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, ...Typography.body },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, marginTop: 10 },
  optionText: { ...Typography.body, flex: 1 },
  addPanel: { borderRadius: Radius.md, borderWidth: 1, padding: 12, gap: 10, marginBottom: 12 },
  addSearch: { borderRadius: Radius.sm, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, ...Typography.caption },
  addUserRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  addUserName: { ...Typography.caption, flex: 1 },
  smallAvatar: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  smallAvatarText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  noUsers: { ...Typography.caption, textAlign: 'center', paddingVertical: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5 },
  memberAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { ...Typography.bodyMedium },
  adminBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  adminBadgeText: { ...Typography.label, fontSize: 9 },
  youLabel: { ...Typography.caption },
  memberDept: { ...Typography.caption, marginTop: 1 },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginHorizontal: 16, marginTop: 24, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1 },
  leaveText: { ...Typography.bodySemiBold },
});
