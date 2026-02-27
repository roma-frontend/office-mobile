import { Tabs, useRouter } from 'expo-router';
import { View, Text, StyleSheet, Platform, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useEffect, useRef, useCallback } from 'react';

function TabBarIcon({ name, color, focused, primaryColor }: { name: any; color: string; focused: boolean; primaryColor: string }) {
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: primaryColor + '22' }]}>
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

function ChatTabButton({ focused, colors }: { focused: boolean; colors: any }) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const orbitAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Spin + orbit one full round then pause 5s, repeat
  const startCycle = useCallback(() => {
    // One full spin (2s) + orbit round
    Animated.parallel([
      Animated.timing(spinAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(orbitAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ]).start(({ finished }) => {
      if (finished) {
        // Reset values for next cycle
        spinAnim.setValue(0);
        orbitAnim.setValue(0);
        // Wait 5 seconds then repeat
        intervalRef.current = setTimeout(startCycle, 5000);
      }
    });
  }, [spinAnim, orbitAnim, pulseAnim]);

  useEffect(() => {
    if (focused) {
      // Bounce on focus entry
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.spring(bounceAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();
      // Start the spin-pause cycle
      startCycle();
    } else {
      // Clear cycle timer and reset
      if (intervalRef.current) clearTimeout(intervalRef.current);
      spinAnim.stopAnimation(); spinAnim.setValue(0);
      orbitAnim.stopAnimation(); orbitAnim.setValue(0);
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.timing(bounceAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
    return () => { if (intervalRef.current) clearTimeout(intervalRef.current); };
  }, [focused]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const orbit = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const isDark = colors.isDark;
  const c1 = isDark ? colors.primary : colors.primaryLight;
  const c2 = isDark ? colors.primaryDark : colors.primary;
  const c3 = isDark ? colors.primaryLight : colors.primaryLight;

  const BTN = 56; // matches global FAB_SIZE
  const LIFT = 20; // matches FAB_LIFT

  return (
    <View style={styles.chatWrapper}>
      {/* Effects container — centered around button */}
      <View style={styles.chatEffectsWrap}>

        {/* Pulsing outer glow */}
        {focused && (
          <Animated.View style={{
            position: 'absolute',
            width: BTN + 10,
            height: BTN + 10,
            borderRadius: 20,
            backgroundColor: isDark ? 'colors.primary + '33'' : 'colors.primary + '22'',
            transform: [{ scale: pulseAnim }],
          }} />
        )}

        {/* Rotating dashed ring */}
        {focused && (
          <Animated.View style={{
            position: 'absolute',
            width: BTN + 8,
            height: BTN + 8,
            borderRadius: 20,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: isDark ? 'colors.primary + '99'' : 'colors.primaryLight + '99'',
            transform: [{ rotate: spin }],
          }} />
        )}

        {/* Orbiting sparkle dots */}
        {focused && (
          <Animated.View style={{
            position: 'absolute',
            width: BTN + 8,
            height: BTN + 8,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: orbit }],
          }}>
            {[0, 120, 240].map((angle, i) => {
              const r = (BTN + 8) / 2;
              const rad = (angle * Math.PI) / 180;
              return (
                <View key={i} style={{
                  position: 'absolute',
                  width: i === 0 ? 5 : 4,
                  height: i === 0 ? 5 : 4,
                  borderRadius: 3,
                  backgroundColor: [c1, c3, c2][i],
                  transform: [{ translateX: r * Math.cos(rad) }, { translateY: r * Math.sin(rad) }],
                  opacity: 0.9,
                }} />
              );
            })}
          </Animated.View>
        )}

        {/* Main button — centered */}
        <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
          <LinearGradient
            colors={isDark ? [c1, c2] : [colors.primaryLight, colors.primary]}
            style={[styles.chatFab, { shadowColor: isDark ? colors.primary : colors.primary }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={22} color="#fff" />
          </LinearGradient>
        </Animated.View>

      </View>

      <Text style={[styles.chatLabel, { color: focused ? (isDark ? c1 : colors.primary) : colors.textMuted }]}>
        AI Chat
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const TAB_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
  const BOTTOM_PAD = Platform.OS === 'ios' ? 28 : 8;

  const darkGradient: [string, string] = [colors.primaryDark, colors.primary];
  const lightGradient: [string, string] = [colors.primaryLight, colors.primary];

  // Auth guard — redirect to login if no valid session
  const { isAuthenticated, isLoading, user } = useAuth();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isLoading, isAuthenticated]);

  const userId = user?.userId ?? null;
  const isAdminOrSupervisor = user?.role === 'admin' || user?.role === 'supervisor';
  const pendingLeaves = useQuery(
    api.leaves.getPendingLeaves,
    (isAdminOrSupervisor && user?.userId) ? { requesterId: user.userId as any } : 'skip'
  );
  const pendingCount = (pendingLeaves ?? []).length;


  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            borderTopWidth: 1,
            borderTopColor: colors.border,
            height: TAB_HEIGHT,
            paddingBottom: BOTTOM_PAD,
            paddingTop: 8,
          },
          tabBarBackground: () => (
            Platform.OS === 'ios'
              ? <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              : <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgCard }]} />
          ),
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarShowLabel: true,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'grid' : 'grid-outline'} color={color} focused={focused} primaryColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaves"
        options={{
          title: 'Leaves',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <TabBarIcon name={focused ? 'calendar' : 'calendar-outline'} color={color} focused={focused} primaryColor={colors.primary} />
              {pendingCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.error }]}>
                  <Text style={styles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <ChatTabButton focused={focused} colors={{ ...colors, isDark }} />,
          tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push({ pathname: '/(tabs)/chat', params: { autoListen: '1' } });
          },
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Team',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'people' : 'people-outline'} color={color} focused={focused} primaryColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'person' : 'person-outline'} color={color} focused={focused} primaryColor={colors.primary} />
          ),
        }}
      />
      {/* Hidden routes */}
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', href: null }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks', href: null }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', href: null }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics', href: null }} />
    </Tabs>

    </>
  );
}

const FAB_SIZE = 56;
const FAB_LIFT = 20;

const styles = StyleSheet.create({
  tabLabel: { fontSize: 10, fontWeight: '500' },
  iconWrap: { alignItems: 'center', justifyContent: 'center', width: 40, height: 32, borderRadius: 12 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  chatWrapper: { alignItems: 'center', justifyContent: 'center', width: 80, marginTop: -16 },
  chatEffectsWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  chatGlow: { position: 'absolute', width: 66, height: 66, borderRadius: 20, alignSelf: 'center', },
  chatRing: { position: 'absolute', width: 60, height: 60, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', alignSelf: 'center', },
  chatFab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  chatLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  
  // Hey HR FAB and Modal Styles
  heyHRFab: {
    position: 'absolute',
    left: 16,
    borderRadius: 28,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  heyHRFabGrad: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  
  wakeWordOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wakeWordModal: { width: '85%', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 28, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  wakeWordTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  wakeWordSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  largeWakeWordBtn: { alignItems: 'center', marginVertical: 24 },
  largeWakeWordBtnGrad: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  listeningWakeWordPulse: { alignItems: 'center', marginVertical: 24 },
  listeningWakeWordDot: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  wakeWordInputBox: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginVertical: 16, minHeight: 60 },
  wakeWordInputText: { fontSize: 14, lineHeight: 22 },
  wakeWordTextInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginVertical: 16, minHeight: 100, textAlignVertical: 'top', fontSize: 14 },
  submitWakeWordBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center', marginVertical: 8 },
  submitWakeWordBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  wakeWordModalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  wakeWordModalBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  wakeWordModalBtnText: { fontSize: 16, fontWeight: '600' },
});



