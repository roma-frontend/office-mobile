import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Modal,
  ScrollView, ActivityIndicator, Alert, Image,
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

interface NewConversationModalProps {
  visible: boolean;
  onClose: () => void;
  userId: Id<"users">;
  onConversationCreated: (convId: Id<"chatConversations">) => void;
}

export default function NewConversationModal({ visible, onClose, userId, onConversationCreated }: NewConversationModalProps) {
  const { colors } = useTheme();
  const [mode, setMode] = useState<'personal' | 'group'>('personal');
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([]);
  const [groupName, setGroupName] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<Id<"organizations"> | null>(null);
  const [loading, setLoading] = useState(false);

  const orgUsers = useQuery(
    api.users.getUsersByOrganization,
    selectedOrgId ? { orgId: selectedOrgId, requesterId: userId } : 'skip'
  );

  const orgs = useQuery(api.organizations.getOrganizationsForPicker, { userId });

  // Auto-select org if only one — OrgPicker handles this via useEffect now

  const createPersonal = useMutation(api.messenger.getOrCreatePersonalConversation);
  const createGroup = useMutation(api.messenger.createGroupConversation);

  const filteredUsers = useMemo(() => {
    if (!orgUsers) return [];
    return orgUsers.filter(
      (u) =>
        u._id !== userId &&
        (u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          (u.department ?? '').toLowerCase().includes(search.toLowerCase()))
    );
  }, [orgUsers, search, userId]);

  const toggleUser = (uid: Id<"users">) => {
    if (mode === 'personal') {
      handlePersonalChat(uid);
      return;
    }
    setSelectedUsers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handlePersonalChat = async (otherUserId: Id<"users">) => {
    setLoading(true);
    try {
      const convId = await createPersonal({ userId, otherUserId });
      onConversationCreated(convId);
      resetAndClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return Alert.alert('Error', 'Please enter a group name');
    if (selectedUsers.length < 1) return Alert.alert('Error', 'Select at least 1 participant');

    setLoading(true);
    try {
      const convId = await createGroup({
        creatorId: userId,
        name: groupName.trim(),
        participantIds: selectedUsers,
      });
      onConversationCreated(convId);
      resetAndClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setSearch('');
    setSelectedUsers([]);
    setGroupName('');
    setMode('personal');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={resetAndClose}>
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={resetAndClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>New Chat</Text>
            {mode === 'group' && (
              <TouchableOpacity onPress={handleCreateGroup} disabled={loading}>
                <Text style={[styles.createBtn, { color: colors.primary, opacity: loading ? 0.5 : 1 }]}>Create</Text>
              </TouchableOpacity>
            )}
            {mode === 'personal' && <View style={{ width: 50 }} />}
          </View>

          {/* Mode toggle */}
          <View style={[styles.modeWrap, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'personal' && { backgroundColor: colors.primary }]}
              onPress={() => { setMode('personal'); setSelectedUsers([]); }}
            >
              <Text style={[styles.modeText, { color: mode === 'personal' ? '#fff' : colors.textMuted }]}>Personal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'group' && { backgroundColor: colors.primary }]}
              onPress={() => setMode('group')}
            >
              <Text style={[styles.modeText, { color: mode === 'group' ? '#fff' : colors.textMuted }]}>Group</Text>
            </TouchableOpacity>
          </View>

          {/* Group name input */}
          {mode === 'group' && (
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <TextInput
                style={[styles.groupInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Group name"
                placeholderTextColor={colors.textMuted}
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>
          )}

          {/* Org picker */}
          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <OrgPicker userId={userId} selectedOrgId={selectedOrgId} onSelect={setSelectedOrgId} />
          </View>

          {/* Selected users badges */}
          {mode === 'group' && selectedUsers.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedRow}>
              {selectedUsers.map((uid) => {
                const user = orgUsers?.find((u) => u._id === uid);
                return (
                  <TouchableOpacity key={uid} style={[styles.selectedBadge, { backgroundColor: colors.primary + '22' }]} onPress={() => toggleUser(uid)}>
                    <Text style={[styles.selectedName, { color: colors.primary }]}>{user?.name ?? 'User'}</Text>
                    <Ionicons name="close" size={14} color={colors.primary} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Search */}
          <View style={[styles.searchWrap, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search by name, email, department..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* User list */}
          {!selectedOrgId ? (
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={36} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Select an organization to see members</Text>
            </View>
          ) : !orgUsers ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
              {filteredUsers.map((user) => {
                const selected = selectedUsers.includes(user._id);
                const avatarColor = AVATAR_COLORS[(user.name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
                const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                return (
                  <TouchableOpacity
                    key={user._id}
                    style={[styles.userRow, { borderColor: colors.border }, selected && { backgroundColor: colors.primary + '11' }]}
                    onPress={() => toggleUser(user._id)}
                    disabled={loading}
                  >
                    {user.avatarUrl ? (
                      <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.userName, { color: colors.textPrimary }]}>{user.name}</Text>
                      <Text style={[styles.userInfo, { color: colors.textMuted }]}>
                        {user.position ?? user.role}{user.department ? ` · ${user.department}` : ''}
                      </Text>
                    </View>
                    {mode === 'group' && (
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={selected ? colors.primary : colors.textMuted}
                      />
                    )}
                    {mode === 'personal' && (
                      <Ionicons name="chatbubble-outline" size={18} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              })}
              {filteredUsers.length === 0 && (
                <Text style={[styles.noResults, { color: colors.textMuted }]}>No users found</Text>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { ...Typography.h3 },
  createBtn: { ...Typography.bodySemiBold },
  modeWrap: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 10, borderRadius: Radius.md, borderWidth: 1, padding: 3, gap: 3 },
  modeBtn: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: Radius.sm },
  modeText: { ...Typography.captionMedium },
  groupInput: { borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, ...Typography.body },
  selectedRow: { paddingHorizontal: 16, gap: 6, marginBottom: 8 },
  selectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  selectedName: { ...Typography.captionMedium },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { flex: 1, ...Typography.body },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5 },
  avatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  userName: { ...Typography.bodyMedium },
  userInfo: { ...Typography.caption, marginTop: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { ...Typography.body, textAlign: 'center' },
  noResults: { ...Typography.caption, textAlign: 'center', marginTop: 20 },
});
