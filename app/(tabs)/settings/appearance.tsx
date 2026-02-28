import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { router } from 'expo-router';

export default function AppearanceSettings() {
  const { colors, isDark, toggleTheme } = useTheme();

  const themes = [
    {
      id: 'light',
      label: 'Light',
      icon: 'sunny',
      description: 'Light theme for bright environments',
      active: !isDark,
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: 'moon',
      description: 'Dark theme for low-light environments',
      active: isDark,
    },
  ];

  const accentColors = [
    { color: '#3b82f6', name: 'Blue' },
    { color: '#10b981', name: 'Green' },
    { color: '#f59e0b', name: 'Amber' },
    { color: '#ef4444', name: 'Red' },
    { color: '#8b5cf6', name: 'Purple' },
    { color: '#ec4899', name: 'Pink' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Appearance</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Theme</Text>
          <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
            Choose your preferred color scheme
          </Text>

          <View style={styles.themesGrid}>
            {themes.map((theme) => (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: colors.bgCard,
                    borderColor: theme.active ? colors.primary : colors.border,
                    borderWidth: theme.active ? 2 : 1,
                  },
                ]}
                onPress={toggleTheme}
                activeOpacity={0.7}
              >
                {theme.active && (
                  <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
                <View style={[styles.themeIconContainer, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name={theme.icon as any} size={32} color={colors.primary} />
                </View>
                <Text style={[styles.themeLabel, { color: colors.textPrimary }]}>
                  {theme.label}
                </Text>
                <Text style={[styles.themeDescription, { color: colors.textMuted }]}>
                  {theme.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Accent Color (Future Feature) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Accent Color</Text>
          <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
            Choose your preferred accent color (coming soon)
          </Text>

          <View style={styles.colorsRow}>
            {accentColors.map((item) => (
              <TouchableOpacity
                key={item.color}
                style={[styles.colorCircle, { backgroundColor: item.color }]}
                activeOpacity={0.7}
              >
                <View style={styles.colorInner} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            Theme preference is saved automatically and syncs across all your devices.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  themesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  themeCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
