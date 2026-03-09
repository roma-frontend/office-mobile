import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Image, Platform, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
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

interface ConversationListProps {
  userId: Id<"users">;
  bottomOffset: number;
}

export default function ConversationList({ userId, bottomOffset }: ConversationListProps) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [selectedConv, setSelectedConv] = useState<Id<"chatConversations"> | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const conversations = useQuery(api.messenger.getMyConversations, userId ? { userId } : 'skip');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const filtered = useMemo(() => {
    if (!conversations) return [];
    if (!search) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c: any) => {
      const name = c.type === 'personal' ? c.otherUser?.name : c.name;
      return (name ?? '').toLowerCase().includes(q) ||
        (c.lastMessagePreview ?? '').toLowerCase().includes(q);
    });
  }, [conversations, search]);

  const handleConversationCreated = (convId: Id<"chatConversations">) => {
    setShowNewChat(false);
    setSelectedConv(convId);
  };

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

      {/* Conversation list */}
      {conversations === undefined ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {search ? 'No conversations found' : 'No conversations yet'}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            Start a new chat with your team
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
                    <Text style={[styles.convName, { color: colors.textPrimary }, hasUnread && styles.convNameBold]} numberOfLines={1}>
                      {name}
                    </Text>
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
  convName: { ...Typography.bodyMedium, flex: 1, marginRight: 8 },
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
});
