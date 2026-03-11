import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Image, Platform, RefreshControl, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Typography, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import ConversationScreen from './ConversationScreen';
import NewConversationModal from './NewConversationModal';

const AVATAR_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#60a5fa'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

type FilterTab = 'all' | 'chat' | 'group' | 'archived';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'chat', label: 'Chat' },
  { key: 'group', label: 'Group' },
  { key: 'archived', label: 'Archived' },
];

interface ConversationListProps {
  userId: Id<"users">;
  bottomOffset: number;
}

export default function ConversationList({ userId, bottomOffset }: ConversationListProps) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedConv, setSelectedConv] = useState<Id<"chatConversations"> | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionSheetConv, setActionSheetConv] = useState<any>(null);

  const conversations = useQuery(api.messenger.getMyConversations, userId ? { userId } : 'skip');

  const pinConversation = useMutation(api.messenger.pinConversation);
  const archiveConversation = useMutation(api.messenger.archiveConversation);
  const deleteConversation = useMutation(api.messenger.deleteConversation);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const filtered = useMemo(() => {
    if (!conversations) return [];
    let list = conversations;

    // Tab filter
    switch (activeTab) {
      case 'all':
        list = list.filter((c: any) => !c.isArchived);
        break;
      case 'chat':
        list = list.filter((c: any) => !c.isArchived && (c.type === 'direct' || c.type === 'personal'));
        break;
      case 'group':
        list = list.filter((c: any) => !c.isArchived && c.type === 'group');
        break;
      case 'archived':
        list = list.filter((c: any) => c.isArchived);
        break;
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c: any) => {
        const name = (c.type === 'personal' || c.type === 'direct') ? c.otherUser?.name : c.name;
        return (name ?? '').toLowerCase().includes(q) ||
          (c.lastMessagePreview ?? '').toLowerCase().includes(q);
      });
    }

    return list;
  }, [conversations, search, activeTab]);

  const handleConversationCreated = (convId: Id<"chatConversations">) => {
    setShowNewChat(false);
    setSelectedConv(convId);
  };

  const handlePin = useCallback(async (conv: any) => {
    setActionSheetConv(null);
    await pinConversation({ conversationId: conv._id, userId, pin: !conv.isPinned });
  }, [pinConversation, userId]);

  const handleArchive = useCallback(async (conv: any) => {
    setActionSheetConv(null);
    await archiveConversation({ conversationId: conv._id, userId, archive: !conv.isArchived });
  }, [archiveConversation, userId]);

  const handleDelete = useCallback((conv: any) => {
    setActionSheetConv(null);
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? It will be hidden from your list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => deleteConversation({ conversationId: conv._id, userId }),
        },
      ]
    );
  }, [deleteConversation, userId]);

  return (
    <View style={{ flex: 1 }}>
      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search conversations..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + '18' : 'transparent' },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, { color: active ? colors.primary : colors.textMuted }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Conversation list */}
      {conversations === undefined ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {search ? 'No conversations found' : activeTab === 'archived' ? 'No archived conversations' : 'No conversations yet'}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            {activeTab === 'archived' ? 'Long-press a conversation to archive it' : 'Start a new chat with your team'}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomOffset + 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
        >
          {filtered.map((conv: any) => {
            const isPersonal = conv.type === 'personal' || conv.type === 'direct';
            const name = isPersonal ? conv.otherUser?.name ?? 'User' : conv.name ?? 'Group';
            const avatarUrl = isPersonal ? conv.otherUser?.avatarUrl : undefined;
            const avatarColor = AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
            const initials = getInitials(name);
            const hasUnread = conv.unreadCount > 0;

            return (
              <TouchableOpacity
                key={conv._id}
                style={[styles.convRow, { borderBottomColor: colors.border }]}
                activeOpacity={0.7}
                onPress={() => setSelectedConv(conv._id)}
                onLongPress={() => setActionSheetConv(conv)}
              >
                {/* Avatar */}
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                    {!isPersonal && <Ionicons name="people" size={18} color="#fff" />}
                    {isPersonal && <Text style={styles.avatarText}>{initials}</Text>}
                  </View>
                )}

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <View style={styles.convTopRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                      {conv.isPinned && <Text style={{ marginRight: 4 }}>📌</Text>}
                      <Text style={[styles.convName, { color: colors.textPrimary }, hasUnread && styles.convNameBold]} numberOfLines={1}>
                        {name}
                      </Text>
                    </View>
                    <Text style={[styles.convTime, { color: hasUnread ? colors.primary : colors.textMuted }]}>
                      {formatTime(conv.lastMessageAt)}
                    </Text>
                  </View>
                  <View style={styles.convBottomRow}>
                    <Text
                      style={[styles.convPreview, { color: hasUnread ? colors.textPrimary : colors.textMuted }]}
                      numberOfLines={1}
                    >
                      {conv.lastMessagePreview ?? 'No messages'}
                    </Text>
                    {hasUnread && (
                      <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.unreadText}>{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</Text>
                      </View>
                    )}
                    {conv.isMuted && (
                      <Ionicons name="notifications-off" size={12} color={colors.textMuted} style={{ marginLeft: 4 }} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowNewChat(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="create-outline" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Action Sheet Modal */}
      <Modal
        visible={!!actionSheetConv}
        transparent
        animationType="fade"
        onRequestClose={() => setActionSheetConv(null)}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setActionSheetConv(null)}>
          <View style={[styles.actionSheet, { backgroundColor: colors.bgCard }]}>
            {actionSheetConv && (
              <>
                <Text style={[styles.actionTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {(actionSheetConv.type === 'direct' || actionSheetConv.type === 'personal')
                    ? actionSheetConv.otherUser?.name ?? 'User'
                    : actionSheetConv.name ?? 'Group'}
                </Text>

                <TouchableOpacity style={styles.actionItem} onPress={() => handlePin(actionSheetConv)}>
                  <Ionicons name={actionSheetConv.isPinned ? 'pin-outline' : 'pin'} size={20} color={colors.textPrimary} />
                  <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                    {actionSheetConv.isPinned ? 'Unpin' : 'Pin'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem} onPress={() => handleArchive(actionSheetConv)}>
                  <Ionicons name={actionSheetConv.isArchived ? 'arrow-undo-outline' : 'archive-outline'} size={20} color={colors.textPrimary} />
                  <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                    {actionSheetConv.isArchived ? 'Unarchive' : 'Archive'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem} onPress={() => handleDelete(actionSheetConv)}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionItem, { marginTop: 8, borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 12 }]} onPress={() => setActionSheetConv(null)}>
                  <Text style={[styles.actionLabel, { color: colors.textMuted, textAlign: 'center', flex: 1 }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Conversation Screen */}
      <ConversationScreen
        visible={!!selectedConv}
        conversationId={selectedConv}
        userId={userId}
        onClose={() => setSelectedConv(null)}
      />

      {/* New Conversation Modal */}
      <NewConversationModal
        visible={showNewChat}
        onClose={() => setShowNewChat(false)}
        userId={userId}
        onConversationCreated={handleConversationCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: Radius.md, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, ...Typography.body },
  tabRow: {
    flexDirection: 'row', gap: 8,
    marginHorizontal: 16, marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1,
  },
  tabText: { ...Typography.label, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  emptyText: { ...Typography.bodyMedium },
  emptySubtext: { ...Typography.caption },
  convRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  avatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  convTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  convName: { ...Typography.bodyMedium, flex: 1 },
  convNameBold: { fontWeight: '700' },
  convTime: { ...Typography.label },
  convBottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  convPreview: { ...Typography.caption, flex: 1 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginLeft: 8 },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  fab: {
    position: 'absolute', right: 16, bottom: 90,
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
  },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 20, paddingBottom: 34,
  },
  actionTitle: {
    ...Typography.bodyMedium, fontWeight: '700',
    marginBottom: 16, textAlign: 'center',
  },
  actionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
  },
  actionLabel: { ...Typography.body },
});
