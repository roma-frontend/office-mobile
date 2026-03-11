import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Modal, KeyboardAvoidingView, Platform, Image, Alert, PanResponder,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

import { Typography, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

const AVATAR_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#60a5fa'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

interface ThreadModalProps {
  visible: boolean;
  onClose: () => void;
  parentMessageId: Id<"chatMessages"> | null;
  parentContent: string;
  parentSenderName: string;
  conversationId: Id<"chatConversations">;
  userId: Id<"users">;
}

export default function ThreadModal({
  visible, onClose, parentMessageId, parentContent, parentSenderName,
  conversationId, userId,
}: ThreadModalProps) {
  const { colors } = useTheme();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dx) < 10,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 && gestureState.vy > 0.5) {
          onClose();
        }
      },
    })
  ).current;

  const replies = useQuery(
    api.messenger.getThreadReplies,
    parentMessageId ? { parentMessageId } : 'skip'
  );
  const sendReply = useMutation(api.messenger.sendThreadReply);

  const handleSend = async () => {
    if (!input.trim() || sending || !parentMessageId) return;
    setSending(true);
    try {
      await sendReply({
        parentMessageId,
        conversationId,
        senderId: userId,
        content: input.trim(),
      });
      setInput('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSending(false);
    }
  };

  if (!parentMessageId) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']} {...panResponder.panHandlers}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Thread</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                  {replies?.length ?? 0} replies
                </Text>
              </View>
            </View>

            {/* Parent message */}
            <View style={[styles.parentMsg, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
              <Text style={[styles.parentSender, { color: colors.primary }]}>{parentSenderName}</Text>
              <Text style={[styles.parentContent, { color: colors.textPrimary }]} numberOfLines={4}>
                {parentContent}
              </Text>
            </View>

            {/* Replies */}
            <FlatList
              ref={flatListRef}
              data={replies ?? []}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => {
                const isOwn = item.senderId === userId;
                const avatarColor = AVATAR_COLORS[(item.senderName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
                const time = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <View style={[styles.replyRow, isOwn && styles.replyRowOwn]}>
                    {!isOwn && (
                      item.senderAvatarUrl ? (
                        <Image source={{ uri: item.senderAvatarUrl }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                          <Text style={styles.avatarText}>{getInitials(item.senderName)}</Text>
                        </View>
                      )
                    )}
                    <View style={[
                      styles.replyBubble,
                      isOwn
                        ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
                        : { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 4 },
                    ]}>
                      {!isOwn && (
                        <Text style={[styles.replySender, { color: colors.primary }]}>{item.senderName}</Text>
                      )}
                      <Text style={[styles.replyContent, { color: isOwn ? '#fff' : colors.textPrimary }]}>
                        {item.content}
                      </Text>
                      <Text style={[styles.replyTime, { color: isOwn ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
                        {time}
                      </Text>
                    </View>
                  </View>
                );
              }}
              contentContainerStyle={{ paddingVertical: 8 }}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {/* Input */}
            <View style={[styles.inputBar, { backgroundColor: colors.bgCard, borderTopColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bg, borderColor: colors.border }]}
                placeholder="Reply in thread..."
                placeholderTextColor={colors.textMuted}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={4000}
              />
              <TouchableOpacity
                onPress={handleSend}
                style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.border }]}
                disabled={!input.trim() || sending}
              >
                <Ionicons name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
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
  headerTitle: { ...Typography.h3 },
  headerSubtitle: { ...Typography.caption, marginTop: 1 },
  parentMsg: {
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  parentSender: { ...Typography.captionMedium, marginBottom: 4 },
  parentContent: { ...Typography.body, lineHeight: 20 },
  replyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: 12, marginBottom: 4 },
  replyRowOwn: { flexDirection: 'row-reverse' },
  avatar: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  replyBubble: { maxWidth: '85%', borderRadius: Radius.lg, paddingHorizontal: 12, paddingVertical: 8, minWidth: 60 },
  replySender: { ...Typography.label, marginBottom: 2 },
  replyContent: { ...Typography.body, lineHeight: 20 },
  replyTime: { ...Typography.label, fontSize: 10, textAlign: 'right', marginTop: 4 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 6,
    paddingHorizontal: 8, paddingVertical: 8, borderTopWidth: 1,
  },
  input: {
    flex: 1, borderRadius: Radius.lg, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8,
    ...Typography.body, maxHeight: 100,
  },
  sendBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
});
