import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import type { Id } from '../../convex/_generated/dataModel';
import PollView from './PollView';
import FileAttachment from './FileAttachment';

const AVATAR_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#60a5fa'];
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function emojiKeyToEmoji(key: string): string {
  return key
    .split('_')
    .map((p) => String.fromCodePoint(parseInt(p.slice(1), 16)))
    .join('');
}

interface MessageBubbleProps {
  message: {
    _id: Id<"chatMessages">;
    senderId: Id<"users">;
    senderName: string;
    senderAvatarUrl?: string;
    type: string;
    content?: string;
    mentions?: Id<"users">[];
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    pollId?: Id<"polls">;
    createdAt: number;
    isDeleted: boolean;
    reactions?: Record<string, string[]>;
    threadCount?: number;
    isPinned?: boolean;
    isEdited?: boolean;
    replyToContent?: string;
    replyToSenderName?: string;
    readBy?: Array<{ userId: string; readAt: number }>;
    parentMessageId?: Id<"chatMessages">;
  };
  isOwn: boolean;
  showSender: boolean;
  participants: Array<{ userId: Id<"users">; userName: string }>;
  userId: Id<"users">;
  isDirect?: boolean;
  onReaction?: (messageId: Id<"chatMessages">, emoji: string) => void;
  onDelete?: (messageId: Id<"chatMessages">) => void;
  onPin?: (messageId: Id<"chatMessages">, pin: boolean) => void;
  onReply?: (message: any) => void;
  onOpenThread?: (messageId: Id<"chatMessages">, content: string, senderName: string) => void;
}

function parseMentions(
  content: string,
  participants: Array<{ userId: Id<"users">; userName: string }>,
) {
  const parts: { text: string; isMention: boolean }[] = [];
  const regex = /@\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: content.slice(lastIndex, match.index), isMention: false });
    }
    const uid = match[1];
    const p = participants.find((p) => p.userId === uid);
    parts.push({ text: `@${p?.userName ?? 'Unknown'}`, isMention: true });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({ text: content.slice(lastIndex), isMention: false });
  }

  return parts.length > 0 ? parts : [{ text: content, isMention: false }];
}

function ReadReceipt({ readBy, isOwn, isDirect }: { readBy?: Array<{ userId: string; readAt: number }>; isOwn: boolean; isDirect?: boolean }) {
  if (!isOwn) return null;
  const entries = readBy ?? [];
  const seenEntries = entries.filter((r) => r.readAt > 0);
  const deliveredEntries = entries.filter((r) => r.readAt === -1);

  if (seenEntries.length > 0) {
    return (
      <View style={styles.receiptRow}>
        <Ionicons name="checkmark-done" size={13} color="#3b82f6" />
      </View>
    );
  }
  if (deliveredEntries.length > 0) {
    return (
      <View style={styles.receiptRow}>
        <Ionicons name="checkmark-done" size={13} color="rgba(255,255,255,0.5)" />
      </View>
    );
  }
  return (
    <View style={styles.receiptRow}>
      <Ionicons name="checkmark" size={13} color="rgba(255,255,255,0.5)" />
    </View>
  );
}

export default function MessageBubble({
  message, isOwn, showSender, participants, userId, isDirect,
  onReaction, onDelete, onPin, onReply, onOpenThread,
}: MessageBubbleProps) {
  const { colors } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  if (message.type === 'system') {
    return (
      <View style={styles.systemWrap}>
        <Text style={[styles.systemText, { color: colors.textMuted }]}>{message.content}</Text>
      </View>
    );
  }

  // Skip thread replies in main list
  if (message.parentMessageId) return null;

  const avatarColor = AVATAR_COLORS[(message.senderName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const reactions = message.reactions ?? {};
  const totalReactions = Object.values(reactions).reduce((sum, arr) => sum + (arr as string[]).length, 0);

  const handleLongPress = () => {
    if (!message.isDeleted) setShowMenu(true);
  };

  return (
    <View style={[styles.row, isOwn && styles.rowOwn]}>
      {/* Avatar */}
      {!isOwn && showSender && (
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          {message.senderAvatarUrl ? (
            <Image source={{ uri: message.senderAvatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{getInitials(message.senderName)}</Text>
          )}
        </View>
      )}
      {!isOwn && !showSender && <View style={{ width: 32 }} />}

      <View style={{ maxWidth: '88%' }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={handleLongPress}
          style={[
            styles.bubble,
            isOwn
              ? [styles.bubbleOwn, { backgroundColor: colors.primary }]
              : [styles.bubbleOther, { backgroundColor: colors.bgCard, borderColor: colors.border }],
          ]}
        >
          {/* Pin indicator */}
          {message.isPinned && (
            <View style={styles.pinBadge}>
              <Text style={{ fontSize: 10 }}>📌</Text>
            </View>
          )}

          {/* Sender name in group */}
          {!isOwn && showSender && (
            <Text style={[styles.senderName, { color: colors.primary }]}>{message.senderName}</Text>
          )}

          {/* Reply-to preview */}
          {message.replyToContent && (
            <View style={[styles.replyPreview, { borderLeftColor: colors.primary, backgroundColor: isOwn ? 'rgba(255,255,255,0.15)' : colors.primary + '11' }]}>
              <Text style={[styles.replyPreviewSender, { color: isOwn ? '#bfdbfe' : colors.primary }]}>
                {message.replyToSenderName}
              </Text>
              <Text style={[styles.replyPreviewText, { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textMuted }]} numberOfLines={1}>
                {message.replyToContent}
              </Text>
            </View>
          )}

          {/* Content */}
          {message.isDeleted ? (
            <Text style={[styles.deletedText, { color: isOwn ? 'rgba(255,255,255,0.5)' : colors.textMuted }]}>
              Message deleted
            </Text>
          ) : message.type === 'poll' && message.pollId ? (
            <PollView pollId={message.pollId} userId={userId} />
          ) : message.type === 'file' && message.fileUrl ? (
            <FileAttachment
              fileUrl={message.fileUrl}
              fileName={message.fileName ?? 'File'}
              fileType={message.fileType}
              fileSize={message.fileSize}
              isOwn={isOwn}
            />
          ) : message.content ? (
            <Text style={[styles.content, { color: isOwn ? '#fff' : colors.textPrimary }]}>
              {parseMentions(message.content, participants).map((part, i) =>
                part.isMention ? (
                  <Text key={i} style={{ color: isOwn ? '#bfdbfe' : colors.primary, fontWeight: '600' }}>
                    {part.text}
                  </Text>
                ) : (
                  <Text key={i}>{part.text}</Text>
                )
              )}
            </Text>
          ) : null}

          {/* Time + edited + read receipt */}
          <View style={styles.timeRow}>
            {message.isEdited && (
              <Text style={[styles.editedLabel, { color: isOwn ? 'rgba(255,255,255,0.5)' : colors.textMuted }]}>
                edited
              </Text>
            )}
            <Text style={[styles.time, { color: isOwn ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
              {time}
            </Text>
            <ReadReceipt readBy={message.readBy} isOwn={isOwn} isDirect={isDirect} />
          </View>
        </TouchableOpacity>

        {/* Reactions display */}
        {totalReactions > 0 && (
          <View style={[styles.reactionsRow, isOwn && { flexDirection: 'row-reverse' }]}>
            {Object.entries(reactions).map(([emojiKey, users]) => {
              const displayEmoji = emojiKeyToEmoji(emojiKey);
              const userList = users as string[];
              const isMine = userList.includes(userId);
              return (
                <TouchableOpacity
                  key={emojiKey}
                  style={[
                    styles.reactionPill,
                    { backgroundColor: isMine ? colors.primary + '33' : colors.bgCard, borderColor: isMine ? colors.primary : colors.border },
                  ]}
                  onPress={() => onReaction?.(message._id, displayEmoji)}
                >
                  <Text style={{ fontSize: 12 }}>{displayEmoji}</Text>
                  <Text style={[styles.reactionCount, { color: isMine ? colors.primary : colors.textMuted }]}>
                    {userList.length}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Thread count badge */}
        {(message.threadCount ?? 0) > 0 && (
          <TouchableOpacity
            style={[styles.threadBadge, { borderColor: colors.primary }, isOwn && { alignSelf: 'flex-end' }]}
            onPress={() => onOpenThread?.(message._id, message.content ?? '', message.senderName)}
          >
            <Ionicons name="chatbubbles-outline" size={12} color={colors.primary} />
            <Text style={[styles.threadText, { color: colors.primary }]}>
              {message.threadCount} {message.threadCount === 1 ? 'reply' : 'replies'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Long-press action menu */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => { setShowMenu(false); setShowEmojiPicker(false); }}>
          <View style={[styles.menuCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            {/* Quick emoji row */}
            {showEmojiPicker ? (
              <View style={styles.emojiRow}>
                {QUICK_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.emojiBtn}
                    onPress={() => { onReaction?.(message._id, emoji); setShowMenu(false); setShowEmojiPicker(false); }}
                  >
                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setShowEmojiPicker(true); }}>
                  <Ionicons name="happy-outline" size={18} color={colors.textPrimary} />
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>React</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { onReply?.(message); setShowMenu(false); }}>
                  <Ionicons name="arrow-undo-outline" size={18} color={colors.textPrimary} />
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>Reply</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { onOpenThread?.(message._id, message.content ?? '', message.senderName); setShowMenu(false); }}>
                  <Ionicons name="chatbubbles-outline" size={18} color={colors.textPrimary} />
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>Thread</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { onPin?.(message._id, !message.isPinned); setShowMenu(false); }}>
                  <Ionicons name={message.isPinned ? 'pin-outline' : 'pin'} size={18} color={colors.textPrimary} />
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>{message.isPinned ? 'Unpin' : 'Pin'}</Text>
                </TouchableOpacity>
                {isOwn && (
                  <TouchableOpacity style={styles.menuItem} onPress={() => { onDelete?.(message._id); setShowMenu(false); }}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    <Text style={[styles.menuText, { color: '#ef4444' }]}>Delete</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: 12, marginBottom: 4 },
  rowOwn: { flexDirection: 'row-reverse' },
  avatar: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 32, height: 32, borderRadius: 10 },
  avatarText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  bubble: { borderRadius: Radius.lg, paddingHorizontal: 12, paddingVertical: 8, minWidth: 60 },
  bubbleOwn: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4, borderWidth: 1 },
  senderName: { ...Typography.label, marginBottom: 2 },
  content: { ...Typography.body, lineHeight: 20 },
  deletedText: { ...Typography.body, fontStyle: 'italic' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  time: { ...Typography.label, fontSize: 10 },
  editedLabel: { ...Typography.label, fontSize: 9, fontStyle: 'italic' },
  receiptRow: { flexDirection: 'row', alignItems: 'center' },
  systemWrap: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 20 },
  systemText: { ...Typography.caption, textAlign: 'center', fontStyle: 'italic' },

  // Pin
  pinBadge: { position: 'absolute', top: -6, right: -2 },

  // Reply-to preview
  replyPreview: { borderLeftWidth: 2, paddingLeft: 8, paddingVertical: 3, borderRadius: 4, marginBottom: 4 },
  replyPreviewSender: { ...Typography.label, fontSize: 11, fontWeight: '600' },
  replyPreviewText: { ...Typography.caption, fontSize: 11 },

  // Reactions
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2, paddingHorizontal: 2 },
  reactionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1,
  },
  reactionCount: { ...Typography.label, fontSize: 11 },

  // Thread badge
  threadBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
    borderWidth: 1, marginTop: 2, alignSelf: 'flex-start',
  },
  threadText: { ...Typography.label, fontSize: 11 },

  // Menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  menuCard: { borderRadius: Radius.lg, borderWidth: 1, padding: 8, minWidth: 180 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  menuText: { ...Typography.bodyMedium },
  emojiRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  emojiBtn: { padding: 4 },
});
