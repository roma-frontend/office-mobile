import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

import { Typography, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface PollCreatorProps {
  visible: boolean;
  onClose: () => void;
  conversationId: Id<"chatConversations">;
  userId: Id<"users">;
}

export default function PollCreator({ visible, onClose, conversationId, userId }: PollCreatorProps) {
  const { colors, isDark } = useTheme();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);

  const sendMessage = useMutation(api.messenger.sendMessage);

  const addOption = () => {
    if (options.length >= 6) return;
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, text: string) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
  };

  const handleCreate = async () => {
    const trimmedQ = question.trim();
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!trimmedQ) return Alert.alert('Error', 'Please enter a question');
    if (validOptions.length < 2) return Alert.alert('Error', 'At least 2 options required');

    setLoading(true);
    try {
      const pollOptions = validOptions.map((text, i) => ({ id: `opt_${i}`, text, votes: [] as any[] }));

      await sendMessage({
        conversationId,
        senderId: userId,
        type: 'text',
        content: `📊 ${trimmedQ}`,
        poll: {
          question: trimmedQ,
          options: pollOptions,
        },
      });

      setQuestion('');
      setOptions(['', '']);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Create Poll</Text>
            <TouchableOpacity onPress={handleCreate} disabled={loading}>
              <Text style={[styles.createBtn, { color: colors.primary, opacity: loading ? 0.5 : 1 }]}>Create</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: colors.textMuted }]}>Question</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Ask something..."
              placeholderTextColor={colors.textMuted}
              value={question}
              onChangeText={setQuestion}
              multiline
            />

            <Text style={[styles.label, { color: colors.textMuted, marginTop: 20 }]}>Options</Text>
            {options.map((opt, i) => (
              <View key={i} style={styles.optionRow}>
                <TextInput
                  style={[styles.input, styles.optionInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor={colors.textMuted}
                  value={opt}
                  onChangeText={(t) => updateOption(i, t)}
                />
                {options.length > 2 && (
                  <TouchableOpacity onPress={() => removeOption(i)} style={styles.removeBtn}>
                    <Ionicons name="close-circle" size={22} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {options.length < 6 && (
              <TouchableOpacity style={[styles.addBtn, { borderColor: colors.border }]} onPress={addOption}>
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Option</Text>
              </TouchableOpacity>
            )}
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
  createBtn: { ...Typography.bodySemiBold },
  content: { padding: 16 },
  label: { ...Typography.captionMedium, marginBottom: 8 },
  input: { borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, ...Typography.body },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  optionInput: { flex: 1 },
  removeBtn: { padding: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1, borderStyle: 'dashed', marginTop: 8 },
  addBtnText: { ...Typography.captionMedium },
});
