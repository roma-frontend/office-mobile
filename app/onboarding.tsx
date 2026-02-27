import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, FlatList, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Slides data - gradients will be determined dynamically based on theme
const slidesData = [
  {
    id: '1',
    icon: 'calendar-outline',
    title: 'Manage Leaves\nEffortlessly',
    subtitle: 'Request, track and approve time off in seconds. Your team stays in sync, always.',
    lightGradient: ['#f59e0b', '#f97316'] as [string, string],
  },
  {
    id: '2',
    icon: 'people-outline',
    title: 'Your Team,\nAt a Glance',
    subtitle: "See who's in, who's out, and plan ahead. Perfect visibility for HR professionals.",
    lightGradient: ['#f59e0b', '#f97316'] as [string, string],
  },
  {
    id: '3',
    icon: 'sparkles-outline',
    title: 'AI-Powered\nHR Assistant',
    subtitle: 'Say "Hey HR" and let our AI handle requests, answer questions, and automate tasks.',
    lightGradient: ['#10b981', '#06b6d4'] as [string, string],
  },
];

export default function Onboarding() {
  const { colors, isDark, toggleTheme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Create slides with theme-aware gradients
  const slides = slidesData.map(slide => ({
    ...slide,
    gradient: slide.lightGradient,
    darkGradient: [colors.primaryDark, colors.primary] as [string, string],
  }));

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      await AsyncStorage.setItem('onboarded', 'true');
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('onboarded', 'true');
    router.replace('/(auth)/login');
  };

  const bgGrad: [string, string] = isDark ? [colors.bg, colors.bgCard] : [colors.bg, colors.bgCard];
  const ctaGrad: [string, string] = isDark ? [colors.primaryDark, colors.primary] : [colors.primaryDark, colors.primary];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <LinearGradient colors={bgGrad} style={StyleSheet.absoluteFill} />

      {/* Theme toggle */}
      <TouchableOpacity
        style={[styles.themeToggle, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        onPress={toggleTheme}
        activeOpacity={0.8}
      >
        <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={colors.primary} />
      </TouchableOpacity>

      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
      </TouchableOpacity>

      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={i => i.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={e => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <LinearGradient
              colors={isDark ? item.darkGradient : item.gradient}
              style={[styles.iconCircle, { shadowColor: colors.primary }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={item.icon as any} size={64} color="#fff" />
            </LinearGradient>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {slides.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange, outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width: dotWidth, opacity, backgroundColor: colors.primary }]}
            />
          );
        })}
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={[styles.ctaBtn, { shadowColor: colors.primary }]}
        onPress={handleNext}
        activeOpacity={0.85}
      >
        <LinearGradient colors={ctaGrad} style={styles.ctaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={[styles.ctaText, { color: '#fff' }]}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Continue'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  themeToggle: {
    position: 'absolute', top: 56, left: 24, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  skipBtn: { position: 'absolute', top: 62, right: 24, zIndex: 10 },
  skipText: { ...Typography.bodyMedium },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 120,
  },
  iconCircle: {
    width: 160, height: 160, borderRadius: 80,
    alignItems: 'center', justifyContent: 'center', marginBottom: 48,
    shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.4, shadowRadius: 32, elevation: 12,
  },
  title: { ...Typography.display, textAlign: 'center', marginBottom: 16 },
  subtitle: { ...Typography.body, textAlign: 'center', lineHeight: 24 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { height: 8, borderRadius: 4 },
  ctaBtn: {
    marginHorizontal: 24, marginBottom: 48, borderRadius: Radius.full, overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 8 },
  ctaText: { ...Typography.h3 },
});





