import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Platform,
} from 'react-native';

import { Typography, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

import MentionDropdown from './MentionDropdown';
import PollCreator from './PollCreator';
import SchedulePicker from './SchedulePicker';

interface MessageInputProps {
  conversationId: Id<"chatConversations">;
  userId: Id<"users">;
  participants: {
    userId: Id<"users">;
    userName: string;
    userAvatarUrl?: string;
    userDepartment?: string;
  }[];
  replyTo?: any;
  onClearReply?: () => void;
}

export default function MessageInput({ conversationId, userId, participants, replyTo, onClearReply }: MessageInputProps) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendMessage = useMutation(api.messenger.sendMessage);
  const setTyping = useMutation(api.messenger.setTyping);

  const handleTyping = useCallback(() => {
    setTyping({ conversationId, userId, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping({ conversationId, userId, isTyping: false });
    }, 3000);
  }, [conversationId, userId, setTyping]);

  const handleTextChange = (value: string) => {
    setText(value);
    handleTyping();

    // Detect @mention
    const lastAt = value.lastIndexOf('@');
    if (lastAt !== -1) {
      const afterAt = value.slice(lastAt + 1);
      const charBefore = lastAt > 0 ? value[lastAt - 1] : ' ';
      if ((charBefore === ' ' || charBefore === '\n' || lastAt === 0) && !afterAt.includes(' ')) {
        setMentionQuery(afterAt);
        return;
      }
    }
    setMentionQuery(null);
  };

  const handleMentionSelect = (mentionUserId: Id<"users">, userName: string) => {
    const lastAt = text.lastIndexOf('@');
    const before = text.slice(0, lastAt);
    const after = text.slice(lastAt).split(' ').slice(1).join(' ');
    setText(`${before}@[${mentionUserId}] ${after}`);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const extractMentions = (content: string): Id<"users">[] => {
    const regex = /@\[([^\]]+)\]/g;
    const ids: Id<"users">[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      ids.push(match[1] as Id<"users">);
    }
    return ids;
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    // Clear typing indicator
    setTyping({ conversationId, userId, isTyping: false });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    setSending(true);
    try {
      const mentions = extractMentions(trimmed);
      await sendMessage({
        conversationId,
        senderId: userId,
        type: 'text',
        content: trimmed,
        mentions: mentions.length > 0 ? mentions : undefined,
        scheduledFor: scheduledFor ?? undefined,
        replyToId: replyTo?._id,
      });
      setText('');
      setScheduledFor(null);
      onClearReply?.();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSending(false);
    }
  };

  const handleAttach = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setSending(true);

      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'base64' as any,
      });

      const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL ?? '';
      const uploadUrl = CONVEX_URL.replace('.cloud', '.site') + '/uploadToCloudinary';

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: base64,
          fileName: file.name,
          fileType: file.mimeType ?? 'application/octet-stream',
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error ?? 'Upload failed');

      await sendMessage({
        conversationId,
        senderId: userId,
        type: 'file',
        content: file.name,
        attachments: [{
          url: data.url,
          name: file.name,
          type: file.mimeType ?? 'application/octet-stream',
          size: data.size ?? file.size ?? 0,
        }],
      });
    } catch (e: any) {
      Alert.alert('Upload Error', e.message);
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = (timestamp: number) => {
    setScheduledFor(timestamp);
  };

  const getDisplayText = () => {
    return text.replace(/@\[([^\]]+)\]/g, (_, uid) => {
      const p = participants.find((p) => p.userId === uid);
      return `@${p?.userName ?? 'Unknown'}`;
    });
  };

  return (
    <View>
      {mentionQuery !== null && (
        <MentionDropdown
          query={mentionQuery}
          participants={participants.filter((p) => p.userId !== userId)}
          onSelect={handleMentionSelect}
        />
      )}

      {scheduledFor && (
        <View style={[styles.scheduleBar, { backgroundColor: colors.warning + '22' }]}>
          <Ionicons name="time-outline" size={14} color={colors.warning} />
          <Text style={[styles.scheduleText, { color: colors.warning }]}>
            Scheduled: {new Date(scheduledFor).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
          <TouchableOpacity onPress={() => setScheduledFor(null)}>
            <Ionicons name="close" size={16} color={colors.warning} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.container, { backgroundColor: colors.bgCard, borderTopColor: colors.border }]}>
        {/* Attach */}
        <TouchableOpacity onPress={handleAttach} style={styles.iconBtn} disabled={sending}>
          <Ionicons name="attach" size={22} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Input */}
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bg, borderColor: colors.border }]}
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          value={getDisplayText()}
          onChangeText={handleTextChange}
          multiline
          maxLength={4000}
        />

        {/* Actions */}
        <TouchableOpacity onPress={() => setShowPollCreator(true)} style={styles.iconBtn}>
          <Ionicons name="stats-chart-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowSchedule(true)} style={styles.iconBtn}>
          <Ionicons name="time-outline" size={20} color={scheduledFor ? colors.warning : colors.textMuted} />
        </TouchableOpacity>

        {/* Send */}
        <TouchableOpacity
          onPress={handleSend}
          style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.border }]}
          disabled={!text.trim() || sending}
        >
          <Ionicons name="send" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      <PollCreator
        visible={showPollCreator}
        onClose={() => setShowPollCreator(false)}
        conversationId={conversationId}
        userId={userId}
      />
      <SchedulePicker
        visible={showSchedule}
        onClose={() => setShowSchedule(false)}
        onSchedule={handleSchedule}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 6,
    paddingHorizontal: 8, paddingVertical: 8, borderTopWidth: 1,
  },
  input: {
    flex: 1, borderRadius: Radius.lg, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8,
    ...Typography.body, maxHeight: 100,
  },
  iconBtn: { padding: 6 },
  sendBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  scheduleBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, marginHorizontal: 12,
    borderRadius: Radius.sm, marginBottom: 4,
  },
  scheduleText: { ...Typography.caption, flex: 1 },
});
