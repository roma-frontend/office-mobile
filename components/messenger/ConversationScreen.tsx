import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

import { Typography, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

import CallModal from './CallModal';
import ConversationInfoModal from './ConversationInfoModal';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ThreadModal from './ThreadModal';

interface ConversationScreenProps {
  visible: boolean;
  conversationId: Id<"chatConversations"> | null;
  userId: Id<"users">;
  onClose: () => void;
}

export default function ConversationScreen({ visible, conversationId, userId, onClose }: ConversationScreenProps) {
  const { colors } = useTheme();
  const [showInfo, setShowInfo] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState<any>(null);
  const [threadParent, setThreadParent] = useState<{ id: Id<"chatMessages">; content: string; senderName: string } | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const flatListRef = useRef<FlatList>(null);

  const messages = useQuery(
    api.messenger.getConversationMessages,
    conversationId ? { conversationId, userId } : 'skip'
  );
  const convInfo = useQuery(
    api.messenger.getConversationInfo,
    conversationId ? { conversationId, userId } : 'skip'
  );
  const typingUsers = useQuery(
    api.messenger.getTypingUsers,
    conversationId ? { conversationId, currentUserId: userId } : 'skip'
  );
  const pinnedMessages = useQuery(
    api.messenger.getPinnedMessages,
    conversationId ? { conversationId } : 'skip'
  );
  const searchResults = useQuery(
    api.messenger.searchMessages,
    conversationId && showSearch && searchQuery.length > 1
      ? { conversationId, userId, query: searchQuery }
      : 'skip'
  );

  const markRead = useMutation(api.messenger.markConversationRead);
  const deleteMsg = useMutation(api.messenger.deleteMessage);
  const toggleReaction = useMutation(api.messenger.toggleReaction);
  const pinMessage = useMutation(api.messenger.pinMessage);
  const startCall = useMutation(api.messenger.startCall);

  // Mark as read when opening
  useEffect(() => {
    if (conversationId && visible) {
      markRead({ conversationId, userId });
    }
  }, [conversationId, visible, messages?.length]);

  if (!conversationId) return null;

  const isGroup = convInfo?.type === 'group';
  const isDirect = convInfo?.type === 'personal';
  const isReadOnly = !!(convInfo as any)?.isReadOnly;
  const title = isGroup
    ? convInfo?.name ?? 'Group'
    : convInfo?.participants?.find((p) => p.userId !== userId)?.userName ?? 'Chat';
  const subtitle = isGroup
    ? `${convInfo?.participants?.length ?? 0} members`
    : undefined;

  const handleStartCall = async (type: 'audio' | 'video') => {
    try {
      await startCall({ conversationId, initiatorId: userId, callType: type });
      setCallType(type);
      setShowCallModal(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteMessage = (messageId: Id<"chatMessages">) => {
    deleteMsg({ messageId, userId });
  };

  const handleReaction = (messageId: Id<"chatMessages">, emoji: string) => {
    toggleReaction({ messageId, userId, emoji });
  };

  const handlePin = (messageId: Id<"chatMessages">, pin: boolean) => {
    pinMessage({ messageId, userId, pin });
  };

  const handleReply = (message: any) => {
    setReplyTo(message);
  };

  const handleOpenThread = (messageId: Id<"chatMessages">, content: string, senderName: string) => {
    setThreadParent({ id: messageId, content, senderName });
  };

  const participants = convInfo?.participants?.map((p) => ({
    userId: p.userId,
    userName: p.userName,
    userAvatarUrl: p.userAvatarUrl,
    userDepartment: p.userDepartment,
  })) ?? [];

  // Invert messages for inverted FlatList
  const sortedMessages = [...(messages ?? [])].reverse();

  // Typing indicator text
  const typingText = typingUsers && typingUsers.length > 0
    ? typingUsers.map((u) => u.name.split(' ')[0]).join(', ') + (typingUsers.length === 1 ? ' is typing…' : ' are typing…')
    : null;

  // First pinned message for banner
  const pinnedBanner = pinnedMessages && pinnedMessages.length > 0 ? pinnedMessages[0] : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerInfo} onPress={() => isGroup && setShowInfo(true)}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
                {subtitle && <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
              </TouchableOpacity>
              {/* Call buttons for direct chats */}
              {isDirect && (
                <>
                  <TouchableOpacity 
                    onPress={() => handleStartCall('audio')} 
                    style={styles.iconBtn}
                  >
                    <Ionicons name="call-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleStartCall('video')} 
                    style={styles.iconBtn}
                  >
                    <Ionicons name="videocam-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={styles.iconBtn}>
                <Ionicons name="search-outline" size={20} color={colors.textMuted} />
              </TouchableOpacity>
              {isGroup && (
                <TouchableOpacity onPress={() => setShowInfo(true)} style={styles.iconBtn}>
                  <Ionicons name="information-circle-outline" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search bar */}
            {showSearch && (
              <View style={[styles.searchBar, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
                <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  placeholder="Search messages..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); }}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            {/* Search results */}
            {showSearch && searchQuery.length > 1 && searchResults && (
              <View style={[styles.searchResults, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
                {searchResults.length === 0 ? (
                  <Text style={[styles.searchEmpty, { color: colors.textMuted }]}>No results</Text>
                ) : (
                  searchResults.slice(0, 5).map((r) => (
                    <TouchableOpacity key={r._id} style={[styles.searchResultItem, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.searchResultSender, { color: colors.primary }]}>{r.senderName}</Text>
                      <Text style={[styles.searchResultContent, { color: colors.textPrimary }]} numberOfLines={1}>
                        {r.content}
                      </Text>
                      <Text style={[styles.searchResultTime, { color: colors.textMuted }]}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Pinned message banner */}
            {pinnedBanner && !showSearch && (
              <View style={[styles.pinBanner, { backgroundColor: colors.primary + '11', borderBottomColor: colors.border }]}>
                <Text style={{ fontSize: 12 }}>📌</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pinBannerSender, { color: colors.primary }]}>{pinnedBanner.senderName}</Text>
                  <Text style={[styles.pinBannerText, { color: colors.textPrimary }]} numberOfLines={1}>
                    {pinnedBanner.content}
                  </Text>
                </View>
                {pinnedMessages && pinnedMessages.length > 1 && (
                  <Text style={[styles.pinCount, { color: colors.textMuted }]}>+{pinnedMessages.length - 1}</Text>
                )}
              </View>
            )}

            {/* Messages */}
            {!messages ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No messages yet</Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Start the conversation!</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={sortedMessages}
                inverted
                keyExtractor={(item) => item._id}
                renderItem={({ item, index }) => {
                  const prev = sortedMessages[index + 1];
                  const showSender = isGroup && (!prev || prev.senderId !== item.senderId || item.type === 'system');
                  return (
                    <MessageBubble
                      message={item}
                      isOwn={item.senderId === userId}
                      showSender={showSender}
                      participants={participants}
                      userId={userId}
                      isDirect={isDirect}
                      onReaction={handleReaction}
                      onDelete={handleDeleteMessage}
                      onPin={handlePin}
                      onReply={handleReply}
                      onOpenThread={handleOpenThread}
                    />
                  );
                }}
                contentContainerStyle={{ paddingVertical: 8 }}
                showsVerticalScrollIndicator={false}
              />
            )}

            {/* Typing indicator */}
            {typingText && (
              <View style={[styles.typingBar, { backgroundColor: colors.bgCard }]}>
                <View style={styles.typingDots}>
                  <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
                  <View style={[styles.dot, { backgroundColor: colors.textMuted, opacity: 0.7 }]} />
                  <View style={[styles.dot, { backgroundColor: colors.textMuted, opacity: 0.4 }]} />
                </View>
                <Text style={[styles.typingText, { color: colors.textMuted }]}>{typingText}</Text>
              </View>
            )}

            {/* Reply-to preview */}
            {!isReadOnly && replyTo && (
              <View style={[styles.replyBar, { backgroundColor: colors.primary + '11', borderTopColor: colors.border }]}>
                <View style={[styles.replyBarLine, { backgroundColor: colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.replyBarSender, { color: colors.primary }]}>{replyTo.senderName}</Text>
                  <Text style={[styles.replyBarContent, { color: colors.textMuted }]} numberOfLines={1}>
                    {replyTo.content}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setReplyTo(null)}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            {/* Input — hidden for read-only channels like Service Maintenance */}
            {isReadOnly ? (
              <View style={[styles.readOnlyBar, { backgroundColor: colors.bgCard, borderTopColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.readOnlyText, { color: colors.textMuted }]}>This channel is read-only</Text>
              </View>
            ) : (
              <MessageInput
                conversationId={conversationId}
                userId={userId}
                participants={participants}
                replyTo={replyTo}
                onClearReply={() => setReplyTo(null)}
              />
            )}
          </KeyboardAvoidingView>

          {/* Conversation Info Modal */}
          {convInfo && (
            <ConversationInfoModal
              visible={showInfo}
              onClose={() => setShowInfo(false)}
              conversationId={conversationId}
              userId={userId}
            />
          )}

          {/* Thread Modal */}
          <ThreadModal
            visible={!!threadParent}
            onClose={() => setThreadParent(null)}
            parentMessageId={threadParent?.id ?? null}
            parentContent={threadParent?.content ?? ''}
            parentSenderName={threadParent?.senderName ?? ''}
            conversationId={conversationId}
            userId={userId}
          />

          {/* Call Modal - WebRTC integration */}
          {showCallModal && (
            <CallModal
              visible={showCallModal}
              callType={callType}
              conversationId={conversationId}
              currentUserId={userId}
              onClose={() => setShowCallModal(false)}
            />
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerTitle: { ...Typography.h3 },
  headerSubtitle: { ...Typography.caption, marginTop: 1 },
  iconBtn: { padding: 4 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { ...Typography.bodyMedium },
  emptySubtext: { ...Typography.caption },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1,
  },
  searchInput: { flex: 1, ...Typography.body },
  searchResults: { maxHeight: 200, borderBottomWidth: 1 },
  searchEmpty: { ...Typography.caption, textAlign: 'center', paddingVertical: 12 },
  searchResultItem: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 0.5 },
  searchResultSender: { ...Typography.label, fontSize: 11 },
  searchResultContent: { ...Typography.body, marginTop: 2 },
  searchResultTime: { ...Typography.label, fontSize: 10, marginTop: 2 },

  // Pin banner
  pinBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1,
  },
  pinBannerSender: { ...Typography.label, fontSize: 11 },
  pinBannerText: { ...Typography.caption },
  pinCount: { ...Typography.label, fontSize: 11 },

  // Typing
  typingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  typingDots: { flexDirection: 'row', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  typingText: { ...Typography.caption, fontSize: 11 },

  // Read-only bar
  readOnlyBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderTopWidth: 1,
  },
  readOnlyText: { ...Typography.caption, fontSize: 13 },

  // Reply bar
  replyBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1,
  },
  replyBarLine: { width: 3, height: '100%', borderRadius: 2 },
  replyBarSender: { ...Typography.label, fontSize: 11, fontWeight: '600' },
  replyBarContent: { ...Typography.caption, fontSize: 11, marginTop: 1 },
});
