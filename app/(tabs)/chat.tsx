import { useState, useRef, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
// Expo Go compatibility: Speech recognition disabled
const ExpoSpeechRecognitionModule = null as any;
const useSpeechRecognitionEvent = (event: string, handler: any) => {};
import * as Speech from 'expo-speech';
import { useLocalSearchParams } from 'expo-router';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  Modal, Animated, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { chatMicState } from '@/lib/chatMicState';

// ── Types ────────────────────────────────────────────────────────────────────
interface LeaveEntry {
  type: 'paid' | 'sick' | 'family' | 'doctor' | 'unpaid';
  startDate: string;
  endDate: string;
  days: number;
  status: 'approved' | 'pending' | 'rejected';
  reason?: string;
}

interface TeamMember {
  name: string;
  department: string;
  type: string;
  endDate: string;
}

interface CalendarData {
  title?: string;
  current?: LeaveEntry | null;
  upcoming?: LeaveEntry[];
  pending?: LeaveEntry[];
  balances?: { paid: number; sick: number; family: number };
  teamOnLeaveToday?: TeamMember[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  calendarData?: CalendarData | null;
  ts: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseCalendarBlock(raw: string): { text: string; calendarData: CalendarData | null } {
  const match = raw.match(/<CALENDAR>([\s\S]*?)<\/CALENDAR>/);
  if (!match) return { text: raw.trim(), calendarData: null };
  try {
    const calendarData = JSON.parse(match[1].trim()) as CalendarData;
    const text = raw.replace(/<CALENDAR>[\s\S]*?<\/CALENDAR>/g, '').trim();
    return { text, calendarData };
  } catch {
    return { text: raw.replace(/<CALENDAR>[\s\S]*?<\/CALENDAR>/g, '').trim(), calendarData: null };
  }
}

const LEAVE_CONFIG: Record<string, { label: string; icon: string; gradient: [string, string] }> = {
  paid:   { label: 'Paid Vacation',  icon: '🏖️',  gradient: ['#2563eb', '#3b82f6'] },
  sick:   { label: 'Sick Leave',     icon: '🤒',  gradient: ['#ef4444', '#f87171'] },
  family: { label: 'Family Leave',   icon: '👨‍👩‍👧', gradient: ['#10b981', '#34d399'] },
  doctor: { label: 'Doctor Visit',   icon: '🏥',  gradient: ['#06b6d4', '#22d3ee'] },
  unpaid: { label: 'Unpaid Leave',   icon: '💼',  gradient: ['#f59e0b', '#fbbf24'] },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  approved: { label: 'Approved',  color: '#10b981', bg: '#d1fae5', icon: '✅' },
  pending:  { label: 'Pending',   color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
  rejected: { label: 'Rejected',  color: '#ef4444', bg: '#fee2e2', icon: '❌' },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Calendar UI Components ───────────────────────────────────────────────────

function CurrentLeaveCard({ leave, colors }: { leave: LeaveEntry; colors: any }) {
  const cfg = LEAVE_CONFIG[leave.type] ?? LEAVE_CONFIG.paid;
  const until = daysUntil(leave.endDate);
  return (
    <View style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 10 }}>
      <LinearGradient colors={cfg.gradient} style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 28, marginRight: 10 }}>{cfg.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' }}>Currently On Leave</Text>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 2 }}>{cfg.label}</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{until > 0 ? `${until}d left` : 'Ends today'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: 12, gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 2 }}>Start Date</Text>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{formatDate(leave.startDate)}</Text>
          </View>
          <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 2 }}>End Date</Text>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{formatDate(leave.endDate)}</Text>
          </View>
          <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 2 }}>Duration</Text>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{leave.days} days</Text>
          </View>
        </View>
        {leave.reason ? (
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 10, fontStyle: 'italic' }}>📝 "{leave.reason}"</Text>
        ) : null}
      </LinearGradient>
    </View>
  );
}

function LeaveRow({ leave, colors, isDark }: { leave: LeaveEntry; colors: any; isDark: boolean }) {
  const cfg = LEAVE_CONFIG[leave.type] ?? LEAVE_CONFIG.paid;
  const sc = STATUS_CONFIG[leave.status] ?? STATUS_CONFIG.pending;
  const countdown = daysUntil(leave.startDate);
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.bg,
      borderRadius: 12, padding: 12, marginBottom: 8,
      borderLeftWidth: 3, borderLeftColor: cfg.gradient[0],
    }}>
      <View style={{
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: cfg.gradient[0] + '22',
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
      }}>
        <Text style={{ fontSize: 20 }}>{cfg.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 2 }}>{cfg.label}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {formatDateShort(leave.startDate)} → {formatDateShort(leave.endDate)} · {leave.days}d
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={{ backgroundColor: sc.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: sc.color, fontSize: 11, fontWeight: '700' }}>{sc.icon} {sc.label}</Text>
        </View>
        {leave.status === 'approved' && countdown > 0 && (
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>in {countdown}d</Text>
        )}
      </View>
    </View>
  );
}

function BalanceBar({ label, used, total, color, icon, colors }: { label: string; used: number; total: number; color: string; icon: string; colors: any }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const remaining = total - used;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1e293b' }}>{icon} {label}</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color }}>
          {remaining}d <Text style={{ fontWeight: '400', color: colors.textMuted }}>/ {total}d</Text>
        </Text>
      </View>
      <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' }}>
        <View style={{ height: 8, width: `${pct}%`, backgroundColor: color, borderRadius: 99 }} />
      </View>
    </View>
  );
}

function TeamMemberRow({ member, colors, isDark }: { member: TeamMember; colors: any; isDark: boolean }) {
  const cfg = LEAVE_CONFIG[member.type] ?? LEAVE_CONFIG.paid;
  const initials = member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.bg,
      borderRadius: 10, padding: 10, marginBottom: 6,
    }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: cfg.gradient[0] + '33', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: cfg.gradient[0] }}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}>{member.name}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>{member.department}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 16 }}>{cfg.icon}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>until {formatDateShort(member.endDate)}</Text>
      </View>
    </View>
  );
}

function CalendarBoard({ data, colors, isDark }: { data: CalendarData; colors: any; isDark: boolean }) {
  const cardBg = isDark ? colors.bgCard : '#ffffff';
  const sectionBg = isDark ? 'rgba(255,255,255,0.06)' : colors.bgCard;
  const balanceBg = isDark ? 'rgba(255,255,255,0.06)' : colors.bg;

  // For dark mode, use lighter text colors for balance bars
  const balanceTextColor = isDark ? '#F5E6C8' : '#1e293b';

  return (
    <View style={{ marginTop: 6, width: '100%' }}>

      {/* Current Leave */}
      {data.current && <CurrentLeaveCard leave={data.current} colors={colors} />}

      {/* No leaves at all */}
      {!data.current && (!data.upcoming || data.upcoming.length === 0) && (!data.pending || data.pending.length === 0) && (
        <View style={{ backgroundColor: sectionBg, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>☀️</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>No Scheduled Leaves</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>You are fully available. Ready to book time off?</Text>
        </View>
      )}

      {/* Upcoming Leaves */}
      {data.upcoming && data.upcoming.length > 0 && (
        <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: isDark ? colors.border : colors.border }}>
          <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 10, letterSpacing: 0.3 }}>
            📅 Upcoming Leaves ({data.upcoming.length})
          </Text>
          {data.upcoming.map((l, i) => <LeaveRow key={i} leave={l} colors={colors} isDark={isDark} />)}
        </View>
      )}

      {/* Pending Requests */}
      {data.pending && data.pending.length > 0 && (
        <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#fde68a' }}>
          <Text style={{ color: '#b45309', fontSize: 13, fontWeight: '700', marginBottom: 10 }}>
            ⏳ Awaiting Approval ({data.pending.length})
          </Text>
          {data.pending.map((l, i) => <LeaveRow key={i} leave={l} colors={colors} isDark={isDark} />)}
        </View>
      )}

      {/* Leave Balances */}
      {data.balances && (
        <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: isDark ? colors.border : colors.border }}>
          <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 14, letterSpacing: 0.3 }}>💳 Leave Balances</Text>
          <View style={{ backgroundColor: balanceBg, borderRadius: 10, padding: 12 }}>
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: balanceTextColor }}>🏖️ Paid Leave</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                  {data.balances.paid}d <Text style={{ fontWeight: '400', color: colors.textMuted }}>remaining</Text>
                </Text>
              </View>
              <View style={{ height: 8, backgroundColor: isDark ? '#1e293b' : colors.border, borderRadius: 99, overflow: 'hidden' }}>
                <View style={{ height: 8, width: `${Math.min((data.balances.paid / 20) * 100, 100)}%`, backgroundColor: colors.primary, borderRadius: 99 }} />
              </View>
            </View>
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: balanceTextColor }}>🤒 Sick Leave</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#ef4444' }}>
                  {data.balances.sick}d <Text style={{ fontWeight: '400', color: colors.textMuted }}>remaining</Text>
                </Text>
              </View>
              <View style={{ height: 8, backgroundColor: isDark ? '#1e293b' : colors.border, borderRadius: 99, overflow: 'hidden' }}>
                <View style={{ height: 8, width: `${Math.min((data.balances.sick / 10) * 100, 100)}%`, backgroundColor: '#ef4444', borderRadius: 99 }} />
              </View>
            </View>
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: balanceTextColor }}>👨‍👩‍👧 Family Leave</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#10b981' }}>
                  {data.balances.family}d <Text style={{ fontWeight: '400', color: colors.textMuted }}>remaining</Text>
                </Text>
              </View>
              <View style={{ height: 8, backgroundColor: isDark ? '#1e293b' : colors.border, borderRadius: 99, overflow: 'hidden' }}>
                <View style={{ height: 8, width: `${Math.min((data.balances.family / 5) * 100, 100)}%`, backgroundColor: '#10b981', borderRadius: 99 }} />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Team On Leave Today */}
      {data.teamOnLeaveToday && data.teamOnLeaveToday.length > 0 && (
        <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 14, marginBottom: 4, borderWidth: 1, borderColor: isDark ? colors.border : colors.border }}>
          <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 10, letterSpacing: 0.3 }}>
            👥 Team On Leave Today ({data.teamOnLeaveToday.length})
          </Text>
          {data.teamOnLeaveToday.map((m, i) => <TeamMemberRow key={i} member={m} colors={colors} isDark={isDark} />)}
        </View>
      )}
    </View>
  );
}

const suggestions = [
  '📅 Show my calendar & schedule',
  '💳 How many leave days do I have?',
];

export default function Chat() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  // Tab bar height: 68px Android, 88px iOS (from _layout.tsx)
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0', role: 'assistant',
      content: "Hi! I'm your HR AI assistant. Ask me anything about leaves, your team, or HR policies. 🌟",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState('employee');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const listRef = useRef<FlatList>(null);
  
  // Voice input state
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isListeningRef = useRef(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSendCountdown, setAutoSendCountdown] = useState<number | null>(null);
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSendCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceInputRef = useRef(''); // always up-to-date voice input for timer callback

  const speakText = useCallback((text: string) => {
    // Strip markdown, emojis-sequences and ACTION blocks before speaking
    const cleaned = text
      .replace(/<ACTION>[\s\S]*?<\/ACTION>/g, '')
      .replace(/[*_`#>~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim()
      .slice(0, 500); // limit to 500 chars
    if (!cleaned) return;
    Speech.stop();
    const lang = detectLang(cleaned);
    setIsSpeaking(true);
    Speech.speak(cleaned, {
      language: lang === 'ru' ? 'ru-RU' : 'en-US',
      pitch: 1.0,
      rate: 0.95,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
    });
  }, []);

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const chatMicActiveRef = useRef(false);

  const startVoiceInput = useCallback(() => {
    // Disabled for Expo Go
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert('Voice Input Unavailable', 'Voice input requires a development build. Please use text input instead.');
      return;
    }
    
    // Stop TTS before recording
    Speech.stop();
    setIsSpeaking(false);
    setVoiceInput('');
    voiceInputRef.current = '';

    // Cancel any pending auto-send
    if (autoSendTimerRef.current) { clearTimeout(autoSendTimerRef.current); autoSendTimerRef.current = null; }
    if (autoSendCountdownRef.current) { clearInterval(autoSendCountdownRef.current); autoSendCountdownRef.current = null; }
    setAutoSendCountdown(null);
    accumulatedTranscriptRef.current = '';
    sessionBaseRef.current = '';
    lastTranscriptRef.current = '';

    ExpoSpeechRecognitionModule.requestPermissionsAsync().then(({ granted }) => {
      if (!granted) {
        Alert.alert('Microphone Permission', 'Please allow microphone access to use voice input.');
        return;
      }

      chatMicActiveRef.current = true; chatMicState.set(true);

      // Wait for mic to fully release, then start chat recognition
      setTimeout(() => {
        if (!chatMicActiveRef.current) return;
        setIsListening(true);
        isListeningRef.current = true;
        startPulse();
        try {
          ExpoSpeechRecognitionModule.start({
            lang: 'ru-RU',
            interimResults: true,
            continuous: true,
          });
        } catch {
          chatMicActiveRef.current = false; chatMicState.set(false);
          setIsListening(false);
          isListeningRef.current = false;
          stopPulse();
        }
      }, 300);
    }).catch(() => {
      chatMicActiveRef.current = false; chatMicState.set(false);
      setIsListening(false);
      isListeningRef.current = false;
      stopPulse();
    });
  }, [startPulse, stopPulse]);

  const params = useLocalSearchParams<{ autoListen?: string }>();

  // ── Convex mutations ──────────────────────────────────────────────────
  const createLeave = useMutation(api.leaves.createLeave);
  const approveLeave = useMutation(api.leaves.approveLeave);
  const rejectLeave = useMutation(api.leaves.rejectLeave);
  const updateLeave = useMutation(api.leaves.updateLeave);
  const deleteLeave = useMutation(api.leaves.deleteLeave);
  const sendChatMessage = useAction(api.chatAction.sendChatMessage);

  // ── Parse and execute AI actions ──────────────────────────────────────
  const executeAction = async (actionStr: string): Promise<string> => {
    try {
      const action = JSON.parse(actionStr);
      const isAdmin = userRole === 'admin' || userRole === 'supervisor';

      if (action.type === 'create_leave') {
        const p = action.params;
        const targetUserId = (p.userId || userId) as Id<'users'>;
        await createLeave({
          userId: targetUserId,
          type: p.type as any,
          startDate: p.startDate,
          endDate: p.endDate,
          days: Number(p.days),
          reason: p.reason || '',
        });
        return '✅ Leave request created successfully!';
      }

      if (action.type === 'approve_leave') {
        if (!isAdmin) return '❌ Only admins can approve leaves.';
        await approveLeave({
          leaveId: action.params.leaveId as Id<'leaveRequests'>,
          reviewerId: userId as Id<'users'>,
          comment: action.params.comment || '',
        });
        return '✅ Leave approved successfully!';
      }

      if (action.type === 'reject_leave') {
        if (!isAdmin) return '❌ Only admins can reject leaves.';
        await rejectLeave({
          leaveId: action.params.leaveId as Id<'leaveRequests'>,
          reviewerId: userId as Id<'users'>,
          comment: action.params.comment || '',
        });
        return '✅ Leave rejected.';
      }

      if (action.type === 'update_leave') {
        const p = action.params;
        await updateLeave({
          leaveId: p.leaveId as Id<'leaveRequests'>,
          requesterId: userId as Id<'users'>,
          ...(p.startDate ? { startDate: p.startDate } : {}),
          ...(p.endDate ? { endDate: p.endDate } : {}),
          ...(p.days !== undefined ? { days: Number(p.days) } : {}),
          ...(p.reason ? { reason: p.reason } : {}),
          ...(p.type ? { type: p.type as any } : {}),
        });
        return '✅ Leave request updated successfully!';
      }

      if (action.type === 'delete_leave') {
        await deleteLeave({
          leaveId: action.params.leaveId as Id<'leaveRequests'>,
          requesterId: userId as Id<'users'>,
        });
        return '✅ Leave request deleted.';
      }

      return '❓ Unknown action type.';
    } catch (e) {
      return `❌ Action failed: ${String(e)}`;
    }
  };

  // ── Parse AI response for embedded ACTION blocks ──────────────────────
  const processAIResponse = async (rawContent: string): Promise<{ text: string; calendarData: CalendarData | null }> => {
    const actionRegex = /<ACTION>([\s\S]*?)<\/ACTION>/g;
    let match;
    let resultContent = rawContent;
    const results: string[] = [];

    while ((match = actionRegex.exec(rawContent)) !== null) {
      const actionResult = await executeAction(match[1].trim());
      results.push(actionResult);
      resultContent = resultContent.replace(match[0], '').trim();
    }

    if (results.length > 0) {
      resultContent = resultContent + '\n\n' + results.join('\n');
    }

    // Parse calendar block
    const { text, calendarData } = parseCalendarBlock(resultContent.trim());
    return { text, calendarData };
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  useEffect(() => {
    if (loading) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [loading]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
      if (autoSendCountdownRef.current) clearInterval(autoSendCountdownRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      chatMicActiveRef.current = false;
      chatMicState.set(false);
      accumulatedTranscriptRef.current = '';
      lastTranscriptRef.current = '';
    };
  }, []);

  // Play chat-open sound on mount
  useEffect(() => {
    let soundObj: Audio.Sound | null = null;
    const playOpenSound = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/chat-open.wav'),
          { shouldPlay: true, volume: 0.7 }
        );
        soundObj = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
          }
        });
      } catch (e) {
        // Silently ignore if sound fails
      }
    };
    playOpenSound();
    return () => {
      soundObj?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    AsyncStorage.multiGet(['user_id', 'user_role', 'user_name', 'user_email']).then(([idPair, rolePair, namePair, emailPair]) => {
      if (idPair[1]) setUserId(idPair[1]);
      if (rolePair[1]) setUserRole(rolePair[1]);
      if (namePair[1]) setUserName(namePair[1]);
      if (emailPair[1]) setUserEmail(emailPair[1]);
    }).catch(err => console.log('Error loading user data:', err));
  }, []);

  // Speech recognition event handlers
  // Keep voiceInputRef in sync so timer callbacks always read latest transcript
  useEffect(() => {
    voiceInputRef.current = voiceInput;
  }, [voiceInput]);

  const cancelAutoSend = useCallback(() => {
    if (autoSendTimerRef.current) { clearTimeout(autoSendTimerRef.current); autoSendTimerRef.current = null; }
    if (autoSendCountdownRef.current) { clearInterval(autoSendCountdownRef.current); autoSendCountdownRef.current = null; }
    setAutoSendCountdown(null);
  }, []);

  const startAutoSendTimer = useCallback((sendFn: (text: string) => void) => {
    cancelAutoSend();
    // Show countdown then send after 1 second
    setAutoSendCountdown(1);
    autoSendTimerRef.current = setTimeout(() => {
      autoSendTimerRef.current = null;
      setAutoSendCountdown(null);
      chatMicActiveRef.current = false; chatMicState.set(false);
      lastTranscriptRef.current = '';
      const text = voiceInputRef.current.trim();
      if (text) {
        sendFn(text);
        setVoiceInput('');
        voiceInputRef.current = '';
      }
    }, 1000);
  }, [cancelAutoSend]);

  // ── Silence-based auto-send logic ────────────────────────────────────────
  // Uses continuous:true. After 2s of no new words → send.
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptRef = useRef('');
  const accumulatedTranscriptRef = useRef('');
  const sessionBaseRef = useRef('');

  const stopSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  }, []);

  const triggerAutoSend = useCallback(() => {
    stopSilenceTimer();
    isListeningRef.current = false;
    setIsListening(false);
    stopPulse();
    chatMicActiveRef.current = false; chatMicState.set(false);
    const text = voiceInputRef.current.trim();
    if (text) {
      startAutoSendTimer(send);
    } else {
      setVoiceInput('');
      voiceInputRef.current = '';
      accumulatedTranscriptRef.current = '';
      sessionBaseRef.current = '';
    }
  }, [stopSilenceTimer, stopPulse, startAutoSendTimer]);

  const startSilenceTimer = useCallback(() => {
    stopSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      // 1 second of silence → stop mic and send
      try { ExpoSpeechRecognitionModule.stop(); } catch {}
      triggerAutoSend();
    }, 1000);
  }, [stopSilenceTimer, triggerAutoSend]);

  useSpeechRecognitionEvent('result', (event) => {
    if (!chatMicActiveRef.current) return;

    // Try all possible ways to get transcript
    let transcript = '';
    try {
      transcript =
        event.results?.[0]?.transcript ??
        (event as any).value?.[0]?.transcript ??
        (event as any).transcript ??
        '';
    } catch { transcript = ''; }

    if (!transcript) return;

    // If final result — save to base and append; if interim — show base + interim
    if (event.isFinal) {
      const prev = sessionBaseRef.current;
      const full = prev ? prev + ' ' + transcript : transcript;
      sessionBaseRef.current = full;
      accumulatedTranscriptRef.current = full;
      lastTranscriptRef.current = full;
      setVoiceInput(full);
      voiceInputRef.current = full;
    } else {
      const prev = sessionBaseRef.current;
      const displayed = prev ? prev + ' ' + transcript : transcript;
      accumulatedTranscriptRef.current = displayed;
      lastTranscriptRef.current = displayed;
      setVoiceInput(displayed);
      voiceInputRef.current = displayed;
    }

    // Reset silence timer on every new word
    startSilenceTimer();
  });

  useSpeechRecognitionEvent('end', () => {
    if (!chatMicActiveRef.current) return;
    // continuous:true shouldn't fire end unless we stop it manually
    // If silence timer already fired → triggerAutoSend handles it
    // If still running → restart to keep listening
    if (silenceTimerRef.current && isListeningRef.current) {
      setTimeout(() => {
        if (!chatMicActiveRef.current || !isListeningRef.current) return;
        try {
          ExpoSpeechRecognitionModule.start({ lang: 'ru-RU', interimResults: true, continuous: true });
        } catch {}
      }, 300);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (!chatMicActiveRef.current) return;
    const err = event.error;
    if (err === 'no-speech') {
      // Keep waiting — restart
      if (isListeningRef.current) {
        setTimeout(() => {
          if (!chatMicActiveRef.current || !isListeningRef.current) return;
          try {
            ExpoSpeechRecognitionModule.start({ lang: 'ru-RU', interimResults: true, continuous: true });
          } catch {}
        }, 300);
      }
      return;
    }
    if (err === 'aborted') return;
    // Real error — stop everything
    stopSilenceTimer();
    chatMicActiveRef.current = false; chatMicState.set(false);
    setIsListening(false);
    isListeningRef.current = false;
    stopPulse();
    cancelAutoSend();
  });

  const stopListening = () => {
    ExpoSpeechRecognitionModule.stop();
    setIsListening(false);
    isListeningRef.current = false;
    stopPulse();
  };

  const submitVoiceInput = () => {
    cancelAutoSend();
    if (isListening) {
      try { ExpoSpeechRecognitionModule.stop(); } catch {}
      setIsListening(false);
      isListeningRef.current = false;
    }
    chatMicActiveRef.current = false; chatMicState.set(false);
    stopPulse();
    const text = voiceInput.trim();
    setVoiceInput('');
    voiceInputRef.current = '';
    setVoiceModalVisible(false);
    if (text) send(text);
  };

  const detectLang = (text: string) => {
    const cyrillic = (text.match(/[\u0400-\u04FF]/g) || []).length;
    return cyrillic > text.length * 0.2 ? 'ru' : 'en';
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const lang = detectLang(text);
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim(), ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Use Convex action instead of HTTP endpoint
      const data = await sendChatMessage({
        messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        lang,
        userId,
        userRole,
        userName,
        userEmail,
      });

      const rawContent = data.content || 'Sorry, I could not process that.';

      // Process embedded <ACTION> and <CALENDAR> blocks
      const { text: content, calendarData } = await processAIResponse(rawContent);

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        calendarData,
        ts: Date.now(),
      }]);

      // TTS — speak AI response if enabled
      if (ttsEnabled) speakText(content);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: lang === 'ru'
          ? `Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`
          : `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const avatarGradient: [string, string] = isDark ? [colors.primaryDark, colors.primary] : [colors.primary, colors.primaryDark];
    const hasCalendar = !isUser && !!item.calendarData;

    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <LinearGradient colors={avatarGradient} style={[styles.avatar, hasCalendar && { alignSelf: 'flex-start', marginTop: 2 }]}>
            <Ionicons name="sparkles" size={14} color="#fff" />
          </LinearGradient>
        )}

        {/* Full-width calendar message */}
        {hasCalendar ? (
          <View style={styles.calendarMessageWrap}>
            {/* AI text bubble */}
            {item.content ? (
              <View style={[styles.bubble, styles.bubbleAI, { backgroundColor: colors.bgCard, borderColor: colors.border, marginBottom: 8, maxWidth: '100%' }]}>
                <Text style={[styles.bubbleText, { color: colors.textPrimary }]}>{item.content}</Text>
              </View>
            ) : null}
            {/* Calendar board */}
            <CalendarBoard data={item.calendarData!} colors={colors} isDark={isDark} />
          </View>
        ) : (
          <View style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAI,
            isUser
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.bgCard, borderColor: colors.border },
          ]}>
            <Text style={[styles.bubbleText, isUser ? { color: '#fff' } : { color: colors.textPrimary }]}>
              {item.content}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1, marginBottom: bottomOffset }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={bottomOffset}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.bgCard }]}>
          <LinearGradient colors={isDark ? [colors.primaryDark, colors.primary] : [colors.primary, colors.primaryDark]} style={styles.headerIcon}>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>HR Assistant</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>Always here to help</Text>
          </View>
          <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
          {/* TTS toggle */}
          <TouchableOpacity
            onPress={() => {
              if (isSpeaking) { Speech.stop(); setIsSpeaking(false); }
              setTtsEnabled(prev => !prev);
            }}
            style={[styles.themeToggle, ttsEnabled && { backgroundColor: colors.primary + '22', borderRadius: 10 }]}
          >
            <Ionicons
              name={isSpeaking ? 'volume-high' : ttsEnabled ? 'volume-medium-outline' : 'volume-mute-outline'}
              size={20}
              color={ttsEnabled ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={loading ? (
            <View style={styles.typingWrap}>
              <LinearGradient colors={isDark ? [colors.primaryDark, colors.primary] : [colors.primary, colors.primaryDark]} style={styles.avatar}>
                <Ionicons name="sparkles" size={14} color="#fff" />
              </LinearGradient>
              <View style={[styles.typingBubble, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            </View>
          ) : null}
        />

        {/* Suggestions */}
        {messages.length <= 1 && (
          <View style={[styles.suggestions, { backgroundColor: colors.bg }]}>
            {suggestions.map((s, i) => (
              <TouchableOpacity key={i} style={[styles.suggestionChip, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={() => send(s)}>
                <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input / Voice inline area */}
        {/* ── Unified Input Row (same design whether mic on or off) ── */}
        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.bg }]}>
          {isListening || voiceInput || autoSendCountdown !== null ? (
            // Voice transcript shown in same input wrap
            <View style={[styles.inputWrap, {
              backgroundColor: isDark ? '#12172b' : '#1a1f2e',
              borderColor: colors.primary,
              flexDirection: 'row', alignItems: 'center',
            }]}>
              {/* Pulsing red dot */}
              {isListening && (
                <Animated.View style={[{ transform: [{ scale: pulseAnim }], marginRight: 8 }]}>
                  <View style={[styles.micActiveDot, { backgroundColor: '#ef4444' }]} />
                </Animated.View>
              )}
              {autoSendCountdown !== null && !isListening && (
                <View style={[styles.micActiveDot, { backgroundColor: colors.primary, marginRight: 8, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{autoSendCountdown}</Text>
                </View>
              )}
              <Text style={[styles.input, {
                color: voiceInput ? '#fff' : 'rgba(255,255,255,0.45)',
                flex: 1,
              }]} numberOfLines={3}>
                {voiceInput || (isListening ? 'Listening… speak now 🎙️' : '')}
              </Text>
              {/* Cancel voice */}
              <TouchableOpacity
                style={{ paddingHorizontal: 6 }}
                onPress={() => {
                  cancelAutoSend();
                  stopSilenceTimer();
                  if (isListening) { try { ExpoSpeechRecognitionModule.stop(); } catch {} }
                  chatMicActiveRef.current = false; chatMicState.set(false);
                  setIsListening(false);
                  isListeningRef.current = false;
                  stopPulse();
                  setVoiceInput('');
                  voiceInputRef.current = '';
                  lastTranscriptRef.current = '';
                  accumulatedTranscriptRef.current = '';
                }}
              >
                <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
          ) : (
            // Normal text input
            <View style={[styles.inputWrap, {
              backgroundColor: isDark ? colors.bgElevated : colors.bgCard,
              borderColor: colors.primary,
            }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Ask anything..."
                placeholderTextColor={colors.textMuted}
                value={input}
                onChangeText={setInput}
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={() => { if (input.trim()) { send(input); } }}
                blurOnSubmit={true}
              />
            </View>
          )}

          {/* Mic button — red when active, normal when not */}
          <TouchableOpacity
            style={styles.micBtn}
            onPress={() => {
              if (isListening) {
                // Stop listening
                stopSilenceTimer();
                try { ExpoSpeechRecognitionModule.stop(); } catch {}
                triggerAutoSend();
              } else {
                startVoiceInput();
              }
            }}
          >
            <LinearGradient
              colors={isListening
                ? ['#ef4444', '#dc2626']
                : isDark ? [colors.primaryDark, colors.primary] : [colors.primary, colors.primaryDark]}
              style={styles.micBtnGrad}
            >
              <Ionicons name={isListening ? 'stop' : 'mic'} size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendBtn, (!(voiceInput.trim() || input.trim()) || loading) && { opacity: 0.5 }]}
            onPress={() => voiceInput.trim() ? submitVoiceInput() : send(input)}
            disabled={!(voiceInput.trim() || input.trim()) || loading}
          >
            <LinearGradient colors={isDark ? [colors.primaryDark, colors.primary] : [colors.primary, colors.primaryDark]} style={styles.sendBtnGrad}>
              <Ionicons name="send" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, ...(Platform.OS === 'web' ? { height: '100vh' as any } : {}) },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.bodyMedium, fontWeight: '700' },
  headerSub: { ...Typography.caption },
  onlineDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 'auto' },
  themeToggle: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  messagesList: { paddingHorizontal: 14, paddingVertical: 16, gap: 12, paddingBottom: 16 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser: { flexDirection: 'row-reverse' },
  avatar: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderWidth: 1 },
  bubbleAI: { borderBottomLeftRadius: 4 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleText: { ...Typography.body, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  // Calendar message — full width beside the avatar
  calendarMessageWrap: { flex: 1, flexDirection: 'column' },
  typingWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, marginTop: 4 },
  typingBubble: { borderWidth: 1, borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12 },
  suggestions: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  suggestionChip: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8 },
  suggestionText: { ...Typography.caption },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 26, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 0, minHeight: 48 },
  input: { flex: 1, ...Typography.body, paddingVertical: 0, maxHeight: 120 },
  micBtn: { borderRadius: 14, overflow: 'hidden', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  micBtnGrad: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  sendBtn: { borderRadius: 14, overflow: 'hidden', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  sendBtnGrad: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  
  // Voice Modal Styles
  voiceModalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  voiceModal: { width: '85%', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 28, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  voiceModalTitle: { ...Typography.bodyMedium, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  voiceModalSubtitle: { ...Typography.body, textAlign: 'center', marginBottom: 24 },
  largeVoiceBtn: { alignItems: 'center', marginVertical: 24 },
  largeVoiceBtnGrad: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  listeningPulse: { alignItems: 'center', marginVertical: 24 },
  listeningDot: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  voiceInputBox: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginVertical: 16, minHeight: 60 },
  voiceInputText: { ...Typography.body, lineHeight: 22 },
  voiceTextInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginVertical: 16, minHeight: 100, textAlignVertical: 'top', ...Typography.body },
  submitVoiceBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center', marginVertical: 8 },
  submitVoiceBtnText: { color: '#fff', ...Typography.bodyMedium, fontWeight: '600' },
  voiceModalButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  voiceModalBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  voiceModalBtnText: { ...Typography.bodyMedium, fontWeight: '600' },
  // Auto-send countdown (old modal - kept for reference)
  countdownWrap: { alignItems: 'center', marginVertical: 20 },
  countdownCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  countdownText: { color: '#fff', fontSize: 40, fontWeight: '800' },

  // ── Inline voice UI styles ──────────────────────────────────────────────
  micActiveDot: { width: 10, height: 10, borderRadius: 5 },
});




