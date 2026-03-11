import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Animated,
  Easing, Vibration, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Typography, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';


type TimerState = 'idle' | 'running' | 'paused' | 'break';

const WORK_DURATION = 25 * 60; // 25 minutes
const SHORT_BREAK = 5 * 60;   // 5 minutes
const LONG_BREAK = 15 * 60;   // 15 minutes
const SESSIONS_BEFORE_LONG_BREAK = 4;

export default function PomodoroScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom;

  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
  const [totalDuration, setTotalDuration] = useState(WORK_DURATION);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [todayStats, setTodayStats] = useState({ sessions: 0, totalMinutes: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    const progress = totalDuration > 0 ? timeLeft / totalDuration : 0;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [timeLeft, totalDuration]);

  const startTimer = useCallback(() => {
    setTimerState('running');
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          Vibration.vibrate([0, 500, 200, 500]);
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleTimerComplete = useCallback(() => {
    setTimerState(prev => {
      if (prev === 'running') {
        // Work session completed
        const newSessions = sessionsCompleted + 1;
        setSessionsCompleted(newSessions);
        setTodayStats(s => ({
          sessions: s.sessions + 1,
          totalMinutes: s.totalMinutes + 25,
        }));

        const isLongBreak = newSessions % SESSIONS_BEFORE_LONG_BREAK === 0;
        const breakDuration = isLongBreak ? LONG_BREAK : SHORT_BREAK;
        setTimeLeft(breakDuration);
        setTotalDuration(breakDuration);

        Alert.alert(
          'Session Complete!',
          `Great work! Time for a ${isLongBreak ? 'long' : 'short'} break.`,
          [{ text: 'Start Break', onPress: () => startBreak(breakDuration) }]
        );
        return 'idle';
      }
      // Break completed
      setTimeLeft(WORK_DURATION);
      setTotalDuration(WORK_DURATION);
      Alert.alert('Break Over!', 'Ready to start another session?');
      return 'idle';
    });
  }, [sessionsCompleted]);

  const startBreak = (duration: number) => {
    setTimeLeft(duration);
    setTotalDuration(duration);
    setTimerState('break');
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          Vibration.vibrate([0, 300, 200, 300]);
          setTimeLeft(WORK_DURATION);
          setTotalDuration(WORK_DURATION);
          setTimerState('idle');
          return WORK_DURATION;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStart = () => {
    if (timerState === 'idle') {
      setTimeLeft(WORK_DURATION);
      setTotalDuration(WORK_DURATION);
      startTimer();
    } else if (timerState === 'paused') {
      startTimer();
    }
  };

  const handlePause = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('paused');
  };

  const handleStop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('idle');
    setTimeLeft(WORK_DURATION);
    setTotalDuration(WORK_DURATION);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = totalDuration > 0 ? timeLeft / totalDuration : 1;
  const isBreak = timerState === 'break';
  const accentColor = isBreak ? colors.success : colors.primary;
  const CIRCLE_SIZE = 240;
  const STROKE_WIDTH = 8;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Pomodoro Timer</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomOffset + 16 }]}
      >
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: accentColor + '18' }]}>
          <Text style={[styles.statusText, { color: accentColor }]}>
            {timerState === 'idle' ? 'Ready' :
             timerState === 'running' ? 'Focus Time' :
             timerState === 'paused' ? 'Paused' : 'Break Time'}
          </Text>
        </View>

        {/* Timer Circle */}
        <View style={[styles.timerWrap, { width: CIRCLE_SIZE, height: CIRCLE_SIZE }]}>
          {/* Background circle */}
          <View style={[styles.timerCircle, {
            width: CIRCLE_SIZE, height: CIRCLE_SIZE,
            borderRadius: CIRCLE_SIZE / 2,
            borderColor: accentColor + '18',
            borderWidth: STROKE_WIDTH,
          }]} />
          {/* Progress ring */}
          <Animated.View style={[styles.timerCircle, {
            width: CIRCLE_SIZE, height: CIRCLE_SIZE,
            borderRadius: CIRCLE_SIZE / 2,
            borderColor: accentColor,
            borderWidth: STROKE_WIDTH,
            opacity: progressAnim,
          }]} />
          {/* Inner content */}
          <View style={styles.timerInner}>
            <Text style={[styles.timerText, { color: colors.textPrimary }]}>
              {formatTime(timeLeft)}
            </Text>
            <Text style={[styles.timerLabel, { color: colors.textMuted }]}>
              {isBreak ? 'Break' : 'Focus'}
            </Text>
          </View>
        </View>

        {/* Session Dots */}
        <View style={styles.dotsRow}>
          {Array.from({ length: SESSIONS_BEFORE_LONG_BREAK }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.sessionDot,
                {
                  backgroundColor: i < (sessionsCompleted % SESSIONS_BEFORE_LONG_BREAK)
                    ? accentColor
                    : accentColor + '22',
                },
              ]}
            />
          ))}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {timerState === 'idle' ? (
            <TouchableOpacity onPress={handleStart} activeOpacity={0.85}>
              <LinearGradient
                colors={isDark ? [colors.primaryDark, colors.primary] : [colors.primary, colors.primaryLight]}
                style={styles.mainBtn}
              >
                <Ionicons name="play" size={32} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          ) : timerState === 'running' || timerState === 'break' ? (
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                onPress={handleStop}
              >
                <Ionicons name="stop" size={24} color={colors.error} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePause} activeOpacity={0.85}>
                <LinearGradient
                  colors={[accentColor + 'cc', accentColor]}
                  style={styles.mainBtn}
                >
                  <Ionicons name="pause" size={32} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                onPress={handleStop}
              >
                <Ionicons name="stop" size={24} color={colors.error} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleStart} activeOpacity={0.85}>
                <LinearGradient
                  colors={isDark ? [colors.primaryDark, colors.primary] : [colors.primary, colors.primaryLight]}
                  style={styles.mainBtn}
                >
                  <Ionicons name="play" size={32} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Today's Stats */}
        <View style={[styles.statsCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.statsTitle, { color: colors.textPrimary }]}>Today's Progress</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{todayStats.sessions}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sessions</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.success }]}>{todayStats.totalMinutes}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Minutes</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.warning }]}>{sessionsCompleted}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            Work for 25 min, take a 5 min break. After 4 sessions, take a 15 min long break.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  content: { alignItems: 'center', padding: 24, gap: 28 },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: Radius.full },
  statusText: { fontSize: 14, fontWeight: '600' },
  timerWrap: { alignItems: 'center', justifyContent: 'center' },
  timerCircle: { position: 'absolute' },
  timerInner: { alignItems: 'center' },
  timerText: { fontSize: 56, fontWeight: '200', letterSpacing: -2 },
  timerLabel: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  dotsRow: { flexDirection: 'row', gap: 10 },
  sessionDot: { width: 12, height: 12, borderRadius: 6 },
  controls: { alignItems: 'center' },
  controlRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  mainBtn: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  secondaryBtn: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  statsCard: { width: '100%', borderRadius: Radius.lg, borderWidth: 1, padding: 20 },
  statsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, height: 40 },
  infoCard: {
    flexDirection: 'row', padding: 14, borderRadius: Radius.lg, borderWidth: 1, gap: 10, width: '100%',
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
