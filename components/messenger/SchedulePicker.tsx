import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Platform,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

import { Typography, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface SchedulePickerProps {
  visible: boolean;
  onClose: () => void;
  onSchedule: (timestamp: number) => void;
}

const QUICK_OPTIONS = [
  { label: 'In 30 minutes', minutes: 30 },
  { label: 'In 1 hour', minutes: 60 },
  { label: 'In 2 hours', minutes: 120 },
  { label: 'In 4 hours', minutes: 240 },
  { label: 'Tomorrow 9:00', minutes: -1 }, // special
  { label: 'Tomorrow 14:00', minutes: -2 }, // special
];

function getScheduleTime(option: { minutes: number }): number {
  const now = new Date();
  if (option.minutes === -1) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.getTime();
  }
  if (option.minutes === -2) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    return tomorrow.getTime();
  }
  return now.getTime() + option.minutes * 60 * 1000;
}

function formatScheduleTime(option: { label: string; minutes: number }): string {
  const ts = getScheduleTime(option);
  const d = new Date(ts);
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SchedulePicker({ visible, onClose, onSchedule }: SchedulePickerProps) {
  const { colors } = useTheme();

  const handleSelect = (option: { minutes: number }) => {
    const ts = getScheduleTime(option);
    onSchedule(ts);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaProvider>
          <SafeAreaView style={[styles.sheet, { backgroundColor: colors.bg }]} edges={['bottom']}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>Schedule Message</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Choose when to send</Text>

            <View style={styles.options}>
              {QUICK_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.label}
                  style={[styles.option, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                  onPress={() => handleSelect(opt)}
                >
                  <Ionicons name="time-outline" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optLabel, { color: colors.textPrimary }]}>{opt.label}</Text>
                    <Text style={[styles.optTime, { color: colors.textMuted }]}>{formatScheduleTime(opt)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </SafeAreaProvider>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingBottom: 16 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 16 },
  title: { ...Typography.h3, textAlign: 'center' },
  subtitle: { ...Typography.caption, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  options: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1 },
  optLabel: { ...Typography.bodyMedium },
  optTime: { ...Typography.caption, marginTop: 1 },
  cancelBtn: { marginTop: 12, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center' },
  cancelText: { ...Typography.bodyMedium },
});
